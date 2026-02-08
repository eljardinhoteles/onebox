import { useState, useEffect } from 'react';
import { Stack, TextInput, Select, Button, Group, ActionIcon, NumberInput, Checkbox, Paper, Divider, Text, Alert } from '@mantine/core';
import { AppActionButtons } from './ui/AppActionButtons';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { supabase } from '../lib/supabaseClient';
import { IconPlus, IconTrash, IconCheck, IconX, IconReceipt, IconInfoCircle } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useQuery, useMutation } from '@tanstack/react-query';

interface TransactionFormProps {
    cajaId: number;
    transactionId?: number; // Opcional para modo edición
    onSuccess: () => void;
    onCancel: () => void;
    readOnly?: boolean;
    warningMessage?: string | null;
}

export function TransactionForm({ cajaId, transactionId, onSuccess, onCancel, readOnly = false, warningMessage }: TransactionFormProps) {

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

    // --- QUERIES ---

    const { data: balanceData } = useQuery({
        queryKey: ['caja_balance', cajaId],
        queryFn: async () => {
            const { data: saldoData } = await supabase
                .from('v_cajas_con_saldo')
                .select('saldo_actual')
                .eq('id', cajaId)
                .single();

            const { data: cajaData } = await supabase
                .from('cajas')
                .select('monto_inicial')
                .eq('id', cajaId)
                .single();

            return {
                available: saldoData?.saldo_actual ?? cajaData?.monto_inicial ?? 0,
                initial: cajaData?.monto_inicial ?? 0
            };
        }
    });

    const availableBalance = balanceData?.available ?? 0;
    const initialAmount = balanceData?.initial ?? 0;

    const { data: proveedores = [] } = useQuery({
        queryKey: ['proveedores_simple'],
        queryFn: async () => {
            const { data } = await supabase.from('proveedores').select('id, nombre, ruc, regimen').order('nombre');
            return (data || []).map(p => ({
                value: p.id.toString(),
                label: `${p.nombre} (${p.ruc}) ${p.regimen ? `- ${p.regimen}` : ''}`
            }));
        }
    });

    const { data: editingData } = useQuery({
        queryKey: ['transaction_detail', transactionId],
        queryFn: async () => {
            if (!transactionId) return null;
            const { data, error } = await supabase
                .from('transacciones')
                .select('*, items:transaccion_items(*)')
                .eq('id', transactionId)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!transactionId
    });

    const [originalTotal, setOriginalTotal] = useState<number>(0);

    useEffect(() => {
        if (editingData) {
            form.setValues({
                fecha_factura: dayjs(editingData.fecha_factura).toDate(),
                tipo_documento: editingData.tipo_documento || 'factura',
                numero_factura: editingData.numero_factura || '',
                proveedor_id: editingData.proveedor_id ? editingData.proveedor_id.toString() : '',
                items: editingData.items.map((item: any) => ({
                    nombre: item.nombre,
                    monto: item.monto,
                    con_iva: item.con_iva
                }))
            });
            setOriginalTotal(editingData.total_factura || 0);
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

                if (updateError) throw updateError;

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
                subtotal: item.monto
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

    const handleSubmit = async (values: typeof form.values) => {
        const totalAValidar = calculateTotals().total;
        const disponibleReal = availableBalance + originalTotal;

        if (totalAValidar > disponibleReal) {
            notifications.show({
                title: 'Saldo Insuficiente',
                message: `El gasto ($${totalAValidar.toFixed(2)}) supera el efectivo disponible en caja ($${disponibleReal.toFixed(2)}).`,
                color: 'red',
                icon: <IconX size={16} />,
            });
            return;
        }

        const reserveThreshold = initialAmount * 0.10;
        const projectedBalance = disponibleReal - totalAValidar;

        if (projectedBalance < reserveThreshold) {
            notifications.show({
                title: 'Reserva de Seguridad',
                message: `No se puede registrar el gasto. La caja debe mantener un mínimo del 10% ($${reserveThreshold.toFixed(2)}) de su monto inicial ($${initialAmount.toFixed(2)}). El saldo restante sería $${projectedBalance.toFixed(2)}.`,
                color: 'red',
                icon: <IconX size={16} />,
            });
            return;
        }

        saveMutation.mutate(values);
    };

    const fields = form.values.items.map((_item, index) => (
        <Group key={index} align="flex-end" gap="xs">
            <TextInput
                placeholder="Nombre del producto/servicio"
                label={index === 0 ? "Producto" : null}
                style={{ flex: 1 }}
                {...form.getInputProps(`items.${index}.nombre`)}
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
                        label={form.values.tipo_documento === 'sin_factura' ? "Referencia" : "Número de Factura"}
                        placeholder={form.values.tipo_documento === 'sin_factura' ? "Opcional" : "Ej: 001-001-123"}
                        readOnly={readOnly}
                        disabled={!readOnly && form.values.tipo_documento === 'sin_factura'}
                        variant={readOnly ? "filled" : "default"}
                        styles={readOnly ? { input: { color: 'black', opacity: 1, backgroundColor: '#f8f9fa' } } : {}}
                        {...form.getInputProps('numero_factura')}
                    />
                </Group>

                <Select
                    label="Proveedor"
                    placeholder={form.values.tipo_documento === 'sin_factura' ? "Opcional (Sin proveedor)" : "Seleccione..."}
                    data={proveedores}
                    searchable
                    clearable={!readOnly && form.values.tipo_documento === 'sin_factura'}
                    readOnly={readOnly}
                    variant={readOnly ? "filled" : "default"}
                    styles={readOnly ? { input: { color: 'black', opacity: 1, backgroundColor: '#f8f9fa' } } : {}}
                    {...form.getInputProps('proveedor_id')}
                />

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
                        <Group justify="space-between">
                            <Text size="sm" c="dimmed">Efectivo Disponible en Caja:</Text>
                            <Text size="sm" fw={600}>${(availableBalance + originalTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                        </Group>
                        <Divider variant="dotted" />
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
                        <Group justify="space-between">
                            <Text size="xs" fw={600} c="dimmed">SALDO TRAS GASTO:</Text>
                            <Text size="sm" fw={700} c={(availableBalance + originalTotal - totals.total) < 0 ? 'red.7' : 'green.7'}>
                                ${(availableBalance + originalTotal - totals.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                        </Group>
                    </Stack>
                </Paper>

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
    );
}
