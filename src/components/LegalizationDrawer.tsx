import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Drawer, Stack, Text, Button, Divider, LoadingOverlay } from '@mantine/core';
import { supabase } from '../lib/supabaseClient';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconFileDescription } from '@tabler/icons-react';

// Sub-components
import { LegalizationSummary } from './legalization/LegalizationSummary';
import { LegalizationExpenseList } from './legalization/LegalizationExpenseList';
import { LegalizationForm } from './legalization/LegalizationForm';

interface Transaction {
    id: number;
    fecha_factura: string;
    numero_factura: string;
    total_factura: number;
    proveedor: {
        nombre: string;
    } | null;
    items?: {
        nombre: string;
    }[];
}

interface LegalizationDrawerProps {
    opened: boolean;
    onClose: () => void;
    cajaId: number;
    cajaNumero?: number;
    onSuccess: () => void;
}

export function LegalizationDrawer({ opened, onClose, cajaId, cajaNumero, onSuccess }: LegalizationDrawerProps) {
    const [state, setState] = useState({
        loading: false,
        submitting: false,
        availableExpenses: [] as Transaction[],
        selectedIds: [] as number[],
        proveedorId: '' as string | null,
        proveedores: [] as { value: string; label: string }[],
        invoiceNumber: '',
        invoiceDate: new Date() as Date | null
    });

    useEffect(() => {
        if (!opened) return;

        const fetchData = async () => {
            setState(prev => ({ ...prev, loading: true }));
            try {
                const [expensesRes, proveedoresRes] = await Promise.all([
                    supabase.from('transacciones').select(`
                        id, fecha_factura, numero_factura, total_factura,
                        proveedor:proveedores (id, nombre),
                        items:transaccion_items!transaccion_items_transaccion_id_fkey (nombre, cantidad)
                    `).eq('caja_id', cajaId).eq('tipo_documento', 'sin_factura').is('parent_id', null),
                    supabase.from('proveedores').select('id, nombre, ruc, regimen').order('nombre')
                ]);

                const formattedExpenses = (expensesRes.data || []).map((t: any) => ({
                    ...t,
                    proveedor: Array.isArray(t.proveedor) ? t.proveedor[0] : t.proveedor
                }));

                const formattedProveedores = (proveedoresRes.data || []).map(p => ({
                    value: p.id.toString(),
                    label: `${p.nombre} (${p.ruc}) ${p.regimen ? `- ${p.regimen}` : ''}`
                }));

                setState(prev => ({
                    ...prev,
                    availableExpenses: formattedExpenses,
                    proveedores: formattedProveedores,
                    loading: false
                }));
            } catch (error: any) {
                notifications.show({ title: 'Error', message: 'No se pudo cargar la información', color: 'red' });
                setState(prev => ({ ...prev, loading: false }));
            }
        };

        fetchData();
    }, [opened, cajaId]);

    const totalSelected = state.availableExpenses
        .filter(t => state.selectedIds.includes(t.id))
        .reduce((acc, curr) => acc + curr.total_factura, 0);

    const handleSubmit = async () => {
        if (state.selectedIds.length === 0 || !state.proveedorId || !state.invoiceNumber || !state.invoiceDate) {
            notifications.show({ title: 'Error', message: 'Completa todos los campos obligatorios', color: 'red' });
            return;
        }

        setState(prev => ({ ...prev, submitting: true }));
        try {
            const { data: mainTrans, error: transError } = await supabase.from('transacciones').insert({
                caja_id: cajaId,
                proveedor_id: parseInt(state.proveedorId),
                fecha_factura: dayjs(state.invoiceDate).format('YYYY-MM-DD'),
                numero_factura: state.invoiceNumber,
                total_factura: totalSelected,
                tipo_documento: 'factura',
                es_justificacion: true
            }).select().single();

            if (transError) throw transError;

            const { data: originalItems } = await supabase.from('transaccion_items').select('*').in('transaccion_id', state.selectedIds);

            if (originalItems && originalItems.length > 0) {
                const newItems = originalItems.map(item => ({
                    transaccion_id: mainTrans.id,
                    nombre: item.nombre,
                    monto: item.monto,
                    con_iva: item.con_iva,
                    monto_iva: item.monto_iva,
                    subtotal: item.subtotal
                }));
                await supabase.from('transaccion_items').insert(newItems);
            }

            await supabase.from('transacciones').update({ parent_id: mainTrans.id }).in('id', state.selectedIds);

            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('bitacora').insert({
                accion: 'LEGALIZACION_GASTOS',
                detalle: { main_transaccion_id: mainTrans.id, total: totalSelected, factura: state.invoiceNumber },
                user_id: user?.id, user_email: user?.email
            });

            notifications.show({ title: 'Éxito', message: 'Legalización procesada', color: 'teal', icon: <IconCheck size={16} /> });
            onSuccess();
            onClose();
        } catch (error: any) {
            notifications.show({ title: 'Error', message: error.message, color: 'red', icon: <IconX size={16} /> });
        } finally {
            setState(prev => ({ ...prev, submitting: false }));
        }
    };

    const toggleSelection = (id: number) => {
        setState(prev => ({
            ...prev,
            selectedIds: prev.selectedIds.includes(id) ? prev.selectedIds.filter(i => i !== id) : [...prev.selectedIds, id]
        }));
    };

    return (
        <Drawer opened={opened} onClose={onClose} title={<Text fw={700} size="lg">Legalización de Gastos {cajaNumero && `· Caja #${cajaNumero}`}</Text>} position="right" size="md">
            <Stack gap="md" pos="relative">
                <LoadingOverlay visible={state.loading || state.submitting} overlayProps={{ blur: 2 }} />
                <Text size="sm" c="dimmed">Selecciona los gastos registrados "Sin Factura" para agrupar bajo una factura formal.</Text>

                <LegalizationSummary selectedCount={state.selectedIds.length} totalAmount={totalSelected} />

                <Divider label="Gastos Disponibles" labelPosition="center" />
                <LegalizationExpenseList expenses={state.availableExpenses} selectedIds={state.selectedIds} onToggle={toggleSelection} />

                <Divider label="Datos de la Factura Justificativa" labelPosition="center" />
                <LegalizationForm
                    proveedores={state.proveedores}
                    proveedorId={state.proveedorId}
                    invoiceNumber={state.invoiceNumber}
                    invoiceDate={state.invoiceDate}
                    onProveedorChange={(val) => setState(prev => ({ ...prev, proveedorId: val }))}
                    onInvoiceNumberChange={(val) => setState(prev => ({ ...prev, invoiceNumber: val }))}
                    onInvoiceDateChange={(val) => setState(prev => ({ ...prev, invoiceDate: val }))}
                />

                <Button fullWidth size="md" mt="md" leftSection={<IconFileDescription size={18} />} onClick={handleSubmit} disabled={state.selectedIds.length === 0 || !state.proveedorId || !state.invoiceNumber}>
                    Procesar Agrupación
                </Button>
            </Stack>
        </Drawer>
    );
}
