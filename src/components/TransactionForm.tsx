import { useState, useEffect } from 'react';
import { Stack, TextInput, Select, Button, Group, Divider, Alert, ActionIcon } from '@mantine/core';
import { AppActionButtons } from './ui/AppActionButtons';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { supabase } from '../lib/supabaseClient';
import { IconCheck, IconX, IconReceipt, IconInfoCircle, IconPrinter, IconRefresh, IconPlus } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDisclosure } from '@mantine/hooks';
import { ProveedorFormModal } from './proveedores/ProveedorFormModal';
import { useAppConfig } from '../hooks/useAppConfig';

import { TransactionItemList } from './transaction/TransactionItemList';
import { TransactionSummary } from './transaction/TransactionSummary';
import { calculateTransactionTotals, printReceipt } from '../utils/transactionUtils';

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
                { key: Math.random().toString(36).substring(7), nombre: '', monto: 0, con_iva: false }
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
        if (val.length > 3) val = val.slice(0, 3) + '-' + val.slice(3);
        if (val.length > 7) val = val.slice(0, 7) + '-' + val.slice(7);
        if (val.length > 17) val = val.slice(0, 17);
        form.setFieldValue('numero_factura', val);
    };

    const handleFacturaBlur = () => {
        if (!autoFormatFactura) return;
        const val = form.values.numero_factura;
        if (!val) return;
        const parts = val.split('-');
        if (parts.length === 3) {
            const p1 = parts[0].trim().padStart(3, '0');
            const p2 = parts[1].trim().padStart(3, '0');
            const p3 = parts[2].trim().padStart(9, '0');
            form.setFieldValue('numero_factura', `${p1}-${p2}-${p3}`);
        }
    };

    // --- QUERIES ---

    const { data: dbData } = useQuery({
        queryKey: ['caja_meta', cajaId],
        queryFn: async () => {
            const { data: cajaData } = await supabase.from('cajas').select('monto_inicial').eq('id', cajaId).single();
            let dbBalance = 0;
            if (currentBalance === undefined) {
                const { data: saldoData } = await supabase.from('v_cajas_con_saldo').select('saldo_actual').eq('id', cajaId).single();
                dbBalance = saldoData?.saldo_actual ?? 0;
            }
            return { initial: cajaData?.monto_inicial ?? 0, fallbackBalance: dbBalance };
        }
    });

    const initialAmount = dbData?.initial ?? 0;
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

    const { data: itemSuggestions = [] } = useQuery({
        queryKey: ['item_suggestions'],
        queryFn: async () => {
            const { data } = await supabase.from('transaccion_items').select('nombre').order('id', { ascending: false }).limit(500);
            if (!data) return [];
            return Array.from(new Set(data.map(i => i.nombre)));
        },
        staleTime: 1000 * 60 * 5,
    });

    const { data: editingData } = useQuery({
        queryKey: ['transaction_detail', transactionId],
        queryFn: async () => {
            if (!transactionId) return null;
            const { data, error } = await supabase.from('transacciones').select('*, items:transaccion_items!transaccion_items_transaccion_id_fkey(*)').eq('id', transactionId).single();
            if (error) throw error;
            return data;
        },
        enabled: !!transactionId
    });

    const [originalTotal, setOriginalTotal] = useState<number>(0);

    useEffect(() => {
        if (!transactionId) {
            setOriginalTotal(0);
            form.reset();
        }
    }, [transactionId]);

    useEffect(() => {
        if (editingData) {
            form.setValues({
                fecha_factura: dayjs(editingData.fecha_factura).toDate(),
                tipo_documento: editingData.tipo_documento || 'factura',
                numero_factura: editingData.numero_factura || '',
                proveedor_id: editingData.proveedor_id ? editingData.proveedor_id.toString() : '',
                items: editingData.items.map((item: any) => ({
                    key: item.id?.toString() || Math.random().toString(36).substring(7),
                    nombre: item.nombre,
                    monto: Number(item.monto),
                    con_iva: item.con_iva
                }))
            });
            setOriginalTotal(Number(editingData.total_factura) || 0);
        }
    }, [editingData]);

    // --- MUTATIONS ---

    const saveMutation = useMutation({
        mutationFn: async (values: any) => {
            let currentTransId = transactionId;
            const totals = calculateTransactionTotals(values.items);

            if (transactionId) {
                const { error: updateError } = await supabase.from('transacciones').update({
                    tipo_documento: values.tipo_documento,
                    proveedor_id: values.proveedor_id ? parseInt(values.proveedor_id) : null,
                    fecha_factura: dayjs(values.fecha_factura).format('YYYY-MM-DD'),
                    numero_factura: values.tipo_documento === 'sin_factura' ? 'S/N' : values.numero_factura,
                    total_factura: totals.total
                }).eq('id', transactionId);
                if (updateError) throw updateError;
                await supabase.from('transaccion_items').delete().eq('transaccion_id', transactionId);
            } else {
                const { data: transData, error: transError } = await supabase.from('transacciones').insert([{
                    caja_id: cajaId,
                    tipo_documento: values.tipo_documento,
                    proveedor_id: values.proveedor_id ? parseInt(values.proveedor_id) : null,
                    fecha_factura: dayjs(values.fecha_factura).format('YYYY-MM-DD'),
                    numero_factura: values.tipo_documento === 'sin_factura' ? 'S/N' : values.numero_factura,
                    total_factura: totals.total
                }]).select().single();
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
                parent_id: editingData?.parent_id || null
            }));

            const { error: itemsError } = await supabase.from('transaccion_items').insert(itemsToInsert);
            if (itemsError) throw itemsError;

            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('bitacora').insert({
                accion: transactionId ? 'EDITAR_GASTO' : 'CREAR_GASTO',
                detalle: { transaccion_id: currentTransId, caja_id: cajaId, total: totals.total, numero_factura: values.numero_factura || 'S/N', proveedor_id: values.proveedor_id },
                user_id: user?.id,
                user_email: user?.email
            });

            return currentTransId;
        },
        onSuccess: () => {
            notifications.show({ title: 'Éxito', message: transactionId ? 'Transacción actualizada' : 'Transacción registrada', color: 'teal', icon: <IconCheck size={16} /> });
            onSuccess();
        },
        onError: (error: any) => notifications.show({ title: 'Error', message: error.message || 'No se pudo procesar la transacción', color: 'red', icon: <IconX size={16} /> })
    });

    const totals = calculateTransactionTotals(form.values.items);

    const handlePrintReceipt = () => printReceipt(cajaId, form.values.fecha_factura, form.values.items, totals.total);

    const handleSubmit = async (values: typeof form.values) => {
        const totalAValidar = calculateTransactionTotals(values.items).total;
        const disponibleReal = availableBalance + originalTotal;

        if (totalAValidar > disponibleReal) {
            notifications.show({ title: 'Saldo Insuficiente', message: `El gasto($${totalAValidar.toFixed(2)}) supera el efectivo disponible en caja($${disponibleReal.toFixed(2)}).`, color: 'red', icon: <IconX size={16} /> });
            return;
        }

        const reserveThreshold = initialAmount * (reservePercentage / 100);
        const projectedBalance = disponibleReal - totalAValidar;

        if (projectedBalance < reserveThreshold) {
            notifications.show({ title: 'Reserva de Seguridad', message: `No se puede registrar el gasto. La caja debe mantener un mínimo del ${reservePercentage}% ($${reserveThreshold.toFixed(2)}).`, color: 'red', icon: <IconX size={16} /> });
            return;
        }
        saveMutation.mutate(values);
    };

    return (
        <>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    {warningMessage && <Alert variant="light" color="orange" title="Modo Solo Lectura" icon={<IconInfoCircle />}>{warningMessage}</Alert>}

                    <Select
                        label="Tipo de Documento"
                        data={[{ value: 'factura', label: 'Factura' }, { value: 'nota_venta', label: 'Nota de Venta' }, { value: 'liquidacion_compra', label: 'Liquidación de Compra' }, { value: 'sin_factura', label: 'Sin Factura' }]}
                        required readOnly={readOnly} variant={readOnly ? "filled" : "default"}
                        {...form.getInputProps('tipo_documento')}
                    />

                    <Group grow>
                        <DatePickerInput label="Fecha de Emisión" locale="es" required maxDate={new Date()} allowDeselect={false} readOnly={readOnly} variant={readOnly ? "filled" : "default"} {...form.getInputProps('fecha_factura')} />
                        <TextInput
                            label="Número de Documento" required={form.values.tipo_documento !== 'sin_factura'} readOnly={readOnly} maxLength={autoFormatFactura ? 17 : 20} variant={readOnly ? "filled" : "default"}
                            {...form.getInputProps('numero_factura')}
                            onChange={handleFacturaChange}
                            onBlur={() => { handleFacturaBlur(); form.validateField('numero_factura'); }}
                        />
                    </Group>

                    <Group align="flex-end" gap="xs">
                        <Select
                            label="Proveedor" placeholder={form.values.tipo_documento === 'sin_factura' ? "Opcional (Sin proveedor)" : "Seleccione un proveedor..."}
                            data={proveedores} searchable clearable={!readOnly && form.values.tipo_documento === 'sin_factura'} readOnly={readOnly}
                            variant={readOnly ? "filled" : "default"} style={{ flex: 1 }}
                            comboboxProps={{ shadow: 'md', withinPortal: true }}
                            {...form.getInputProps('proveedor_id')}
                        />
                        {!readOnly && (
                            <>
                                <ActionIcon variant="light" color="green" size="lg" mb={1} onClick={openCreateProveedor} title="Registrar nuevo proveedor"><IconPlus size={18} /></ActionIcon>
                                <ActionIcon variant="light" color="blue" size="lg" mb={1} onClick={() => queryClient.invalidateQueries({ queryKey: ['proveedores_simple'] })} title="Actualizar lista"><IconRefresh size={18} /></ActionIcon>
                            </>
                        )}
                    </Group>

                    <Divider label={<Group gap="xs"><IconReceipt size={14} />Detalle de Productos</Group>} labelPosition="center" />
                    <TransactionItemList form={form} readOnly={readOnly} itemSuggestions={itemSuggestions} />
                    {!readOnly && (
                        <Button variant="light" leftSection={<IconPlus size={16} />} onClick={() => form.insertListItem('items', { key: Math.random().toString(36).substring(7), nombre: '', monto: 0, con_iva: false })} size="xs">Añadir Producto</Button>
                    )}

                    <TransactionSummary totals={totals} availableBalance={availableBalance} originalTotal={originalTotal} transactionId={transactionId} />

                    {form.values.tipo_documento === 'sin_factura' && (
                        <Button variant="light" color="orange" leftSection={<IconPrinter size={16} />} onClick={handlePrintReceipt} fullWidth>Imprimir Recibo de Egreso</Button>
                    )}

                    {!readOnly ? (
                        <AppActionButtons onCancel={onCancel} loading={saveMutation.isPending} submitLabel={transactionId ? "Actualizar Transacción" : "Guardar Transacción"} />
                    ) : (
                        <Button color="gray" variant="light" onClick={onCancel} fullWidth>Cerrar Detalle</Button>
                    )}
                </Stack>
            </form>
            <ProveedorFormModal opened={createProveedorOpened} onClose={closeCreateProveedor} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['proveedores_simple'] })} />
        </>
    );
}
