
import { useState, useEffect } from 'react';
import { Stack, TextInput, Select, Button, Group, ActionIcon, NumberInput, Checkbox, Paper, Divider, Text, Alert, Autocomplete } from '@mantine/core';
import { AppActionButtons } from './ui/AppActionButtons';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { supabase } from '../lib/supabaseClient';
import { IconPlus, IconTrash, IconCheck, IconX, IconReceipt, IconInfoCircle, IconPrinter, IconRefresh } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDisclosure } from '@mantine/hooks';
import { ProveedorFormModal } from './proveedores/ProveedorFormModal';
import { useAppConfig } from '../hooks/useAppConfig';

interface TransactionFormProps {
    cajaId: number;
    transactionId?: number; // Opcional para modo edición
    onSuccess: () => void;
    onCancel: () => void;
    readOnly?: boolean;
    warningMessage?: string | null;
    currentBalance?: number;
}

export function TransactionForm({ cajaId, transactionId, onSuccess, onCancel, readOnly = false, warningMessage, currentBalance }: TransactionFormProps) {
    const queryClient = useQueryClient();
    const [createProveedorOpened, { open: openCreateProveedor, close: closeCreateProveedor }] = useDisclosure(false);

    const { configs } = useAppConfig();
    const autoFormatFactura = configs.formato_factura_automatico === 'true';
    const reservePercentage = configs.porcentaje_reserva_caja ? parseInt(configs.porcentaje_reserva_caja) : 15;

    const form = useForm({
        initialValues: {
            fecha_factura: new Date(),
            tipo_documento: 'factura',
            numero_factura: '',
            proveedor_id: '',
            items: [
                { nombre: '', monto: 0, con_iva: false }
            ],
        },
        validate: {
            tipo_documento: (value) => (value ? null : 'Requerido'),
            numero_factura: (value, values) =>
                (values.tipo_documento !== 'sin_factura' && !value ? 'El número es obligatorio' : null),
            proveedor_id: (value, values) =>
                (values.tipo_documento !== 'sin_factura' && !value ? 'Seleccione un proveedor' : null),
            items: {
                nombre: (value) => (value && value.length < 2 ? 'Nombre inválido' : null),
                monto: (value) => (value && value <= 0 ? 'Monto debe ser mayor a 0' : null),
            }
        }
    });

    // --- MANEJO DE FACTURA 000-000-000000000 ---
    const handleFacturaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.currentTarget.value.replace(/[^0-9]/g, ''); // Solo números

        if (!autoFormatFactura) {
            form.setFieldValue('numero_factura', e.currentTarget.value);
            return;
        }

        // Auto-guiones
        if (val.length > 3) val = val.slice(0, 3) + '-' + val.slice(3);
        if (val.length > 7) val = val.slice(0, 7) + '-' + val.slice(7);

        // Limite
        if (val.length > 17) val = val.slice(0, 17);

        form.setFieldValue('numero_factura', val);
    };

    const handleFacturaBlur = () => {
        if (!autoFormatFactura) return;

        const val = form.values.numero_factura;
        if (!val) return;

        const parts = val.split('-');
        let formatted = val;

        if (parts.length === 3) {
            // 000-000-000000000
            const p1 = parts[0].trim().padStart(3, '0');
            const p2 = parts[1].trim().padStart(3, '0');
            const p3 = parts[2].trim().padStart(9, '0');
            formatted = `${p1}-${p2}-${p3}`;
        } else if (parts.length === 1 && /^\d+$/.test(parts[0])) {
            // Si el usuario escribe todo junto "001001123" -> tratar de splitear
            if (val.length <= 15) {
                // Asumimos que intentó escribir secuencialmente
                // No hacemos magia compleja, solo si tiene guiones actuamos
            }
        }

        form.setFieldValue('numero_factura', formatted);
    };

    // --- QUERIES ---

    const { data: dbData } = useQuery({
        queryKey: ['caja_meta', cajaId],
        queryFn: async () => {
            const { data: cajaData } = await supabase
                .from('cajas')
                .select('monto_inicial')
                .eq('id', cajaId)
                .single();

            // Solo consultamos el saldo si NO nos pasaron el actual
            let dbBalance = 0;
            if (currentBalance === undefined) {
                const { data: saldoData } = await supabase
                    .from('v_cajas_con_saldo')
                    .select('saldo_actual')
                    .eq('id', cajaId)
                    .single();
                dbBalance = saldoData?.saldo_actual ?? 0;
            }

            return {
                initial: cajaData?.monto_inicial ?? 0,
                fallbackBalance: dbBalance
            };
        },
        // Invalidamos si cambia si tenemos o no balance externo
        enabled: true
    });

    const initialAmount = dbData?.initial ?? 0;
    // Si tenemos prop, la usamos. Si no, usamos lo de la BD.
    const availableBalance = currentBalance !== undefined ? currentBalance : (dbData?.fallbackBalance ?? 0);

    const { data: proveedores = [] } = useQuery({
        queryKey: ['proveedores_simple'],
        queryFn: async () => {
            const { data } = await supabase.from('proveedores').select('id, nombre, ruc, regimen').order('nombre');
            return (data || []).map(p => ({
                value: p.id.toString(),
                label: `${p.nombre} (${p.ruc}) ${p.regimen ? `- ${p.regimen}` : ''} `
            }));
        }
    });

    // Historial de items únicos para autocompletar
    const { data: itemSuggestions = [] } = useQuery({
        queryKey: ['item_suggestions'],
        queryFn: async () => {
            const { data } = await supabase
                .from('transaccion_items')
                .select('nombre')
                .order('id', { ascending: false })
                .limit(500);

            if (!data) return [];

            // Deduplicar nombres
            const seen = new Set<string>();
            const unique: string[] = [];
            for (const item of data) {
                const key = item.nombre.trim().toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    unique.push(item.nombre);
                }
            }
            return unique;
        },
        staleTime: 1000 * 60 * 5,
    });

    const { data: editingData, isError: isErrorFetching, error: errorFetching } = useQuery({
        queryKey: ['transaction_detail', transactionId],
        queryFn: async () => {
            if (!transactionId) return null;
            const { data, error } = await supabase
                .from('transacciones')
                .select('*, items:transaccion_items!transaccion_items_transaccion_id_fkey(*)')
                .eq('id', transactionId)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!transactionId
    });

    useEffect(() => {
        if (!transactionId) {
            setOriginalTotal(0);
            form.reset();
        }
    }, [transactionId]);

    useEffect(() => {
        if (isErrorFetching && errorFetching) {
            notifications.show({
                title: 'Error al cargar gasto',
                message: errorFetching.message || 'No se pudieron cargar los detalles para editar',
                color: 'red',
                icon: <IconX size={16} />,
            });
        }
    }, [isErrorFetching, errorFetching]);

    const [originalTotal, setOriginalTotal] = useState<number>(0);

    useEffect(() => {
        if (editingData) {
            console.log("Editing Data Loaded:", editingData);
            form.setValues({
                fecha_factura: dayjs(editingData.fecha_factura).toDate(),
                tipo_documento: editingData.tipo_documento || 'factura',
                numero_factura: editingData.numero_factura || '',
                proveedor_id: editingData.proveedor_id ? editingData.proveedor_id.toString() : '',
                items: editingData.items.map((item: any) => ({
                    nombre: item.nombre,
                    monto: Number(item.monto), // Ensure number
                    con_iva: item.con_iva
                }))
            });
            const total = Number(editingData.total_factura) || 0;
            console.log("Setting original total:", total);
            setOriginalTotal(total);
        }
    }, [editingData]);



    // --- MUTATIONS ---

    const saveMutation = useMutation({
        mutationFn: async (values: any) => {
            let currentTransId = transactionId;
            const totals = calculateTotals();

            if (transactionId) {
                const { error: updateError } = await supabase
                    .from('transacciones')
                    .update({
                        tipo_documento: values.tipo_documento,
                        proveedor_id: values.proveedor_id ? parseInt(values.proveedor_id) : null,
                        fecha_factura: dayjs(values.fecha_factura).format('YYYY-MM-DD'),
                        numero_factura: values.tipo_documento === 'sin_factura' ? 'S/N' : values.numero_factura,
                        total_factura: totals.total
                    })
                    .eq('id', transactionId);

                console.log('Update payload:', {
                    tipo_documento: values.tipo_documento,
                    proveedor_id: values.proveedor_id ? parseInt(values.proveedor_id) : null,
                    fecha_factura: dayjs(values.fecha_factura).format('YYYY-MM-DD'),
                    numero_factura: values.tipo_documento === 'sin_factura' ? 'S/N' : values.numero_factura,
                    total_factura: totals.total
                });

                if (updateError) {
                    console.error('Update error:', updateError);
                    throw updateError;
                }

                const { error: deleteError } = await supabase
                    .from('transaccion_items')
                    .delete()
                    .eq('transaccion_id', transactionId);

                if (deleteError) throw deleteError;
            } else {
                const { data: transData, error: transError } = await supabase
                    .from('transacciones')
                    .insert([{
                        caja_id: cajaId,
                        tipo_documento: values.tipo_documento,
                        proveedor_id: values.proveedor_id ? parseInt(values.proveedor_id) : null,
                        fecha_factura: dayjs(values.fecha_factura).format('YYYY-MM-DD'),
                        numero_factura: values.tipo_documento === 'sin_factura' ? 'S/N' : values.numero_factura,
                        total_factura: totals.total
                    }])
                    .select()
                    .single();

                if (transError) throw transError;
                currentTransId = transData.id;
            }

            const itemsToInsert = values.items.map((item: any) => ({
                transaccion_id: currentTransId,
                nombre: item.nombre,
                monto: item.monto,
                con_iva: item.con_iva,
                monto_iva: item.con_iva ? item.monto * 0.15 : 0,
                subtotal: item.monto,
                // Si estamos editando y existe un parent_id, lo mantenemos en los nuevos items
                parent_id: editingData?.parent_id || null
            }));

            const { error: itemsError } = await supabase.from('transaccion_items').insert(itemsToInsert);
            if (itemsError) throw itemsError;

            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('bitacora').insert({
                accion: transactionId ? 'EDITAR_GASTO' : 'CREAR_GASTO',
                detalle: {
                    transaccion_id: currentTransId,
                    caja_id: cajaId,
                    total: totals.total,
                    numero_factura: values.numero_factura || 'S/N',
                    proveedor_id: values.proveedor_id
                },
                user_id: user?.id,
                user_email: user?.email
            });

            return currentTransId;
        },
        onSuccess: () => {
            notifications.show({
                title: 'Éxito',
                message: transactionId ? 'Transacción actualizada' : 'Transacción registrada',
                color: 'teal',
                icon: <IconCheck size={16} />,
            });
            onSuccess();
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error.message || 'No se pudo procesar la transacción',
                color: 'red',
                icon: <IconX size={16} />,
            });
        }
    });

    const calculateTotals = () => {
        let subtotal = 0;
        let iva = 0;

        form.values.items.forEach(item => {
            const base = Number(item.monto) || 0;
            if (item.con_iva) {
                const itemIva = Number((base * 0.15).toFixed(4));
                subtotal += base;
                iva += itemIva;
            } else {
                subtotal += base;
            }
        });

        return {
            subtotal: Number(Number(subtotal).toFixed(2)),
            iva: Number(Number(iva).toFixed(2)),
            total: Number((Number(subtotal) + Number(iva)).toFixed(2))
        };
    };

    const totals = calculateTotals();

    const handlePrintReceipt = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const fecha = dayjs(form.values.fecha_factura).format('DD/MM/YYYY');
        const itemsHtml = form.values.items.map(item => `
            <tr>
                <td style="padding: 5px; border-bottom: 1px solid #eee;">${item.nombre}</td>
                <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">$${item.monto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
    `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Recibo de Caja - Sin Factura</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; color: #333; }
                        .ticket { padding: 10px; }
                        h2 { text-align: center; margin: 0; font-size: 16px; text-transform: uppercase; }
                        .info { margin-top: 10px; font-size: 12px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
                        .total { margin-top: 15px; border-top: 2px dashed #000; padding-top: 5px; text-align: right; font-weight: bold; font-size: 14px; }
                        .signatures { margin-top: 50px; display: flex; flex-direction: column; gap: 40px; align-items: center; font-size: 10px; }
                        .sig-line { width: 150px; border-top: 1px solid #000; text-align: center; padding-top: 2px; }
                        @media print {
                            body { width: 100%; margin: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="ticket">
                        <h2>COMPROBANTE DE EGRESO</h2>
                        <div style="text-align: center; font-size: 10px;">(DOCUMENTO INTERNO - SIN FACTURA)</div>

                        <div class="info">
                            <div><b>FECHA:</b> ${fecha}</div>
                            <div><b>CAJA NO:</b> ${cajaId}</div>
                            <div><b>DETALLE:</b></div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th style="padding: 5px; border-bottom: 2px solid #000; text-align: left;">DESCRIPCIÓN</th>
                                    <th style="padding: 5px; border-bottom: 2px solid #000; text-align: right;">VALOR</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>

                        <div class="total">
                            TOTAL ENTREGADO: $${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>

                        <div class="signatures">
                            <div class="sig-line">ENTREGADO CONFORME</div>
                            <div class="sig-line">RECIBE CONFORME (FIRMA)</div>
                        </div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                        }
                    </script>
                </body>
            </html>
    `);
        printWindow.document.close();
    };

    const handleSubmit = async (values: typeof form.values) => {
        const totalAValidar = calculateTotals().total;
        const disponibleReal = availableBalance + originalTotal;

        if (totalAValidar > disponibleReal) {
            notifications.show({
                title: 'Saldo Insuficiente',
                message: `El gasto($${totalAValidar.toFixed(2)}) supera el efectivo disponible en caja($${disponibleReal.toFixed(2)}).`,
                color: 'red',
                icon: <IconX size={16} />,
            });
            return;
        }

        const reserveThreshold = initialAmount * (reservePercentage / 100);
        const projectedBalance = disponibleReal - totalAValidar;

        if (projectedBalance < reserveThreshold) {
            notifications.show({
                title: 'Reserva de Seguridad',
                message: `No se puede registrar el gasto. La caja debe mantener un mínimo del ${reservePercentage}% ($${reserveThreshold.toFixed(2)}) de su monto inicial ($${initialAmount.toFixed(2)}). El saldo restante sería $${projectedBalance.toFixed(2)}.`,
                color: 'red',
                icon: <IconX size={16} />,
            });
            return;
        }

        saveMutation.mutate(values);
    };

    const fields = form.values.items.map((_item, index) => (
        <Group key={index} align="flex-end" gap="xs">
            <Autocomplete
                placeholder="Nombre del producto/servicio"
                label={index === 0 ? "Producto" : null}
                style={{ flex: 1 }}
                data={itemSuggestions}
                {...form.getInputProps(`items.${index}.nombre`)}
                comboboxProps={{
                    shadow: 'md',
                    withinPortal: true
                }}
                readOnly={readOnly}
                variant={readOnly ? "filled" : "default"}
                styles={readOnly ? { input: { color: 'black', opacity: 1, backgroundColor: '#f8f9fa' } } : {}}
            />
            <NumberInput
                placeholder="0.00"
                label={index === 0 ? "Monto" : null}
                decimalScale={4}
                fixedDecimalScale
                hideControls
                leftSection="$"
                w={100}
                {...form.getInputProps(`items.${index}.monto`)}
                readOnly={readOnly}
                variant={readOnly ? "filled" : "default"}
                styles={readOnly ? { input: { color: 'black', opacity: 1, backgroundColor: '#f8f9fa' } } : {}}
            />
            <Stack gap={0} mb={5}>
                {index === 0 && <Text size="xs" fw={500} mb={2}>IVA 15%</Text>}
                <Checkbox
                    {...form.getInputProps(`items.${index}.con_iva`, { type: 'checkbox' })}
                    color="blue"
                    disabled={readOnly}
                />
            </Stack>
            {!readOnly && (
                <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => form.removeListItem('items', index)}
                    disabled={form.values.items.length === 1}
                    mb={2}
                >
                    <IconTrash size={16} />
                </ActionIcon>
            )}
        </Group>
    ));

    return (
        <>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    {warningMessage && (
                        <Alert variant="light" color="orange" title="Modo Solo Lectura" icon={<IconInfoCircle />}>
                            {warningMessage}
                        </Alert>
                    )}

                    <Select
                        label="Tipo de Documento"
                        placeholder="Seleccione el tipo"
                        data={[
                            { value: 'factura', label: 'Factura' },
                            { value: 'nota_venta', label: 'Nota de Venta' },
                            { value: 'liquidacion_compra', label: 'Liquidación de Compra' },
                            { value: 'sin_factura', label: 'Sin Factura' },
                        ]}
                        required
                        readOnly={readOnly}
                        variant={readOnly ? "filled" : "default"}
                        styles={readOnly ? { input: { color: 'black', opacity: 1, backgroundColor: '#f8f9fa' } } : {}}
                        {...form.getInputProps('tipo_documento')}
                    />

                    <Group grow>
                        <DatePickerInput
                            label="Fecha de Emisión"
                            placeholder="Seleccione fecha"
                            locale="es"
                            required
                            maxDate={new Date()}
                            allowDeselect={false}
                            readOnly={readOnly}
                            variant={readOnly ? "filled" : "default"}
                            styles={readOnly ? { input: { color: 'black', opacity: 1, backgroundColor: '#f8f9fa' } } : {}}
                            {...form.getInputProps('fecha_factura')}
                        />
                        <TextInput
                            label="Número de Documento"
                            placeholder={autoFormatFactura ? "000-000-000000000" : "Ej: 001-001-000000123"}
                            required={form.values.tipo_documento !== 'sin_factura'}
                            readOnly={readOnly}
                            maxLength={autoFormatFactura ? 17 : 20}
                            variant={readOnly ? "filled" : "default"}
                            styles={readOnly ? { input: { color: 'black', opacity: 1, backgroundColor: '#f8f9fa' } } : {}}
                            {...form.getInputProps('numero_factura')}
                            onChange={(e) => {
                                handleFacturaChange(e);
                            }}
                            onBlur={() => {
                                handleFacturaBlur();
                                form.validateField('numero_factura');
                            }}
                        />
                    </Group>

                    <Group align="flex-end" gap="xs">
                        <Select
                            label="Proveedor"
                            placeholder={form.values.tipo_documento === 'sin_factura' ? "Opcional (Sin proveedor)" : "Seleccione un proveedor..."}
                            data={proveedores}
                            searchable
                            clearable={!readOnly && form.values.tipo_documento === 'sin_factura'}
                            readOnly={readOnly}
                            variant={readOnly ? "filled" : "default"}
                            styles={readOnly ? { input: { color: 'black', opacity: 1, backgroundColor: '#f8f9fa' } } : {}}
                            leftSection={<IconInfoCircle size={16} stroke={1.5} />}
                            comboboxProps={{
                                shadow: 'md',
                                withinPortal: true
                            }}
                            style={{ flex: 1 }}
                            {...form.getInputProps('proveedor_id')}
                        />
                        {!readOnly && (
                            <>
                                <ActionIcon
                                    variant="light"
                                    color="green"
                                    size="lg"
                                    mb={1}
                                    onClick={openCreateProveedor}
                                    title="Registrar nuevo proveedor"
                                >
                                    <IconPlus size={18} />
                                </ActionIcon>
                                <ActionIcon
                                    variant="light"
                                    color="blue"
                                    size="lg"
                                    mb={1}
                                    onClick={() => {
                                        queryClient.invalidateQueries({ queryKey: ['proveedores_simple'] });
                                        notifications.show({ title: 'Actualizado', message: 'Lista de proveedores refrescada', color: 'blue', icon: <IconCheck size={16} /> });
                                    }}
                                    title="Actualizar lista de proveedores"
                                >
                                    <IconRefresh size={18} />
                                </ActionIcon>
                            </>
                        )}
                    </Group>

                    <Divider label={<Group gap="xs"><IconReceipt size={14} />Detalle de Productos</Group>} labelPosition="center" />

                    {fields}

                    {!readOnly && (
                        <Button
                            variant="light"
                            leftSection={<IconPlus size={16} />}
                            onClick={() => form.insertListItem('items', { nombre: '', monto: 0, con_iva: false })}
                            size="xs"
                        >
                            Añadir Producto
                        </Button>
                    )}

                    <Paper withBorder p="md" radius="md" bg="gray.0">
                        <Stack gap="xs">
                            {!transactionId && (
                                <>
                                    <Group justify="space-between">
                                        <Text size="sm" c="dimmed">Efectivo Disponible en Caja:</Text>
                                        <Text size="sm" fw={600}>${(availableBalance + originalTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                    </Group>
                                    <Divider variant="dotted" />
                                </>
                            )}
                            <Group justify="space-between">
                                <Text size="sm">Subtotal:</Text>
                                <Text size="sm" fw={500}>${totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm">IVA (15%):</Text>
                                <Text size="sm" fw={500}>${totals.iva.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                            </Group>
                            <Divider />
                            <Group justify="space-between">
                                <Text size="md" fw={700}>Total Gasto:</Text>
                                <Text size="lg" fw={700} color="blue">
                                    ${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Text>
                            </Group>

                        </Stack>
                    </Paper>

                    {form.values.tipo_documento === 'sin_factura' && (
                        <Button
                            variant="light"
                            color="orange"
                            leftSection={<IconPrinter size={16} />}
                            onClick={handlePrintReceipt}
                            fullWidth
                        >
                            Imprimir Recibo de Egreso
                        </Button>
                    )}

                    {!readOnly ? (
                        <AppActionButtons
                            onCancel={onCancel}
                            loading={saveMutation.isPending}
                            submitLabel={transactionId ? "Actualizar Transacción" : "Guardar Transacción"}
                        />
                    ) : (
                        <Button color="gray" variant="light" onClick={onCancel} fullWidth>
                            Cerrar Detalle
                        </Button>
                    )}
                </Stack>
            </form>

            <ProveedorFormModal
                opened={createProveedorOpened}
                onClose={closeCreateProveedor}
                onSuccess={() => {
                    // La invalidación ya se hace dentro del modal, pero aseguramos
                    queryClient.invalidateQueries({ queryKey: ['proveedores_simple'] });
                }}
            />
        </>
    );
}
