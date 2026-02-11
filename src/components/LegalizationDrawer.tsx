import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Drawer, Stack, Text, Button, Checkbox, Table, TextInput, Group, Paper, Divider, ScrollArea, LoadingOverlay, Select } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { supabase } from '../lib/supabaseClient';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconFileDescription, IconAlertCircle } from '@tabler/icons-react';

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
    onSuccess: () => void;
}

export function LegalizationDrawer({ opened, onClose, cajaId, onSuccess }: LegalizationDrawerProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [availableExpenses, setAvailableExpenses] = useState<Transaction[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Form state for the new invoice
    const [proveedorId, setProveedorId] = useState<string | null>('');
    const [proveedores, setProveedores] = useState<{ value: string; label: string }[]>([]);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState<Date | null>(new Date());

    useEffect(() => {
        if (opened) {
            fetchAvailableExpenses();
            fetchProveedores();
        }
    }, [opened]);

    const fetchAvailableExpenses = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('transacciones')
                .select(`
                    id,
                    fecha_factura,
                    numero_factura,
                    total_factura,
                    proveedor:proveedores (id, nombre),
                    items:transaccion_items!transaccion_items_transaccion_id_fkey (nombre)
                `)
                .eq('caja_id', cajaId)
                .eq('tipo_documento', 'sin_factura')
                .is('parent_id', null);

            if (error) throw error;

            console.log('Available expenses for caja', cajaId, ':', data);

            setAvailableExpenses((data || []).map((t: any) => ({
                ...t,
                proveedor: Array.isArray(t.proveedor) ? t.proveedor[0] : t.proveedor
            })));
        } catch (error: any) {
            console.error('Error fetching available expenses:', error);
            notifications.show({
                title: 'Error al cargar gastos',
                message: error.message || 'No se pudieron cargar los gastos disponibles',
                color: 'red',
                icon: <IconAlertCircle size={16} />
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchProveedores = async () => {
        const { data } = await supabase.from('proveedores').select('id, nombre, ruc, regimen').order('nombre');
        if (data) {
            setProveedores(data.map(p => ({
                value: p.id.toString(),
                label: `${p.nombre} (${p.ruc}) ${p.regimen ? `- ${p.regimen}` : ''}`
            })));
        }
    };

    const totalSelected = availableExpenses
        .filter(t => selectedIds.includes(t.id))
        .reduce((acc, curr) => acc + curr.total_factura, 0);

    const handleSubmit = async () => {
        if (selectedIds.length === 0) {
            notifications.show({ title: 'Error', message: 'Selecciona al menos un gasto', color: 'red' });
            return;
        }
        if (!proveedorId || !invoiceNumber || !invoiceDate) {
            notifications.show({ title: 'Error', message: 'Completa los datos de la factura', color: 'red' });
            return;
        }

        setSubmitting(true);
        try {
            // 1. Create the master Justification Invoice
            const { data: mainTrans, error: transError } = await supabase
                .from('transacciones')
                .insert({
                    caja_id: cajaId,
                    proveedor_id: parseInt(proveedorId),
                    fecha_factura: dayjs(invoiceDate).format('YYYY-MM-DD'),
                    numero_factura: invoiceNumber,
                    total_factura: totalSelected,
                    tipo_documento: 'factura',
                    es_justificacion: true
                })
                .select()
                .single();

            if (transError) throw transError;

            // 2. Fetch all items from original expenses
            const { data: originalItems, error: fetchItemsError } = await supabase
                .from('transaccion_items')
                .select('*')
                .in('transaccion_id', selectedIds);

            if (fetchItemsError) throw fetchItemsError;

            if (originalItems && originalItems.length > 0) {
                // 3. Prepare items for the master invoice
                const newItems = originalItems.map(item => ({
                    transaccion_id: mainTrans.id,
                    nombre: item.nombre,
                    monto: item.monto,
                    con_iva: item.con_iva,
                    monto_iva: item.monto_iva,
                    subtotal: item.subtotal
                }));

                const { error: insertItemsError } = await supabase
                    .from('transaccion_items')
                    .insert(newItems);

                if (insertItemsError) throw insertItemsError;
            }

            // 3. Link children expenses to this master invoice
            const { error: updateError } = await supabase
                .from('transacciones')
                .update({ parent_id: mainTrans.id })
                .in('id', selectedIds);

            if (updateError) throw updateError;

            // 4. Registrar en Bitácora
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('bitacora').insert({
                accion: 'LEGALIZACION_GASTOS',
                detalle: {
                    main_transaccion_id: mainTrans.id,
                    caja_id: cajaId,
                    total: totalSelected,
                    numero_factura: invoiceNumber,
                    gastos_agrupados: selectedIds
                },
                user_id: user?.id,
                user_email: user?.email
            });

            notifications.show({
                title: 'Legalización Exitosa',
                message: 'Los gastos han sido agrupados y justificados correctamente.',
                color: 'teal',
                icon: <IconCheck size={16} />
            });
            onSuccess();
            onClose();
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: error.message || 'No se pudo procesar la legalización',
                color: 'red',
                icon: <IconX size={16} />
            });
        } finally {
            setSubmitting(false);
        }
    };

    const toggleSelection = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            title={<Text fw={700} size="lg">Legalización de Gastos</Text>}
            position="right"
            size="md"
        >
            <Stack gap="md" pos="relative">
                <LoadingOverlay visible={loading || submitting} overlayProps={{ blur: 2 }} />

                <Text size="sm" c="dimmed">
                    Selecciona los gastos registrados "Sin Factura" que deseas agrupar bajo una factura formal de justificación.
                </Text>

                <Paper withBorder p="xs" radius="md" bg="blue.0">
                    <Group justify="space-between">
                        <Stack gap={0}>
                            <Text size="xs" fw={700} c="blue.6">SELECCIONADOS</Text>
                            <Text size="lg" fw={800} c="blue.9">{selectedIds.length} Gastos</Text>
                        </Stack>
                        <Stack gap={0} align="flex-end">
                            <Text size="xs" fw={700} c="blue.6">TOTAL A JUSTIFICAR</Text>
                            <Text size="lg" fw={800} c="blue.9">
                                ${totalSelected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                        </Stack>
                    </Group>
                </Paper>

                <Divider label="Gastos Disponibles" labelPosition="center" />

                <ScrollArea h={300}>
                    {availableExpenses.length === 0 ? (
                        <Group justify="center" py="xl" c="dimmed">
                            <IconAlertCircle size={20} />
                            <Text size="sm">No hay gastos sin factura pendientes</Text>
                        </Group>
                    ) : (
                        <Table verticalSpacing="xs">
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th w={40}></Table.Th>
                                    <Table.Th>Detalle</Table.Th>
                                    <Table.Th ta="right">Monto</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {availableExpenses.map(exp => (
                                    <Table.Tr key={exp.id} onClick={() => toggleSelection(exp.id)} style={{ cursor: 'pointer' }}>
                                        <Table.Td>
                                            <Checkbox
                                                checked={selectedIds.includes(exp.id)}
                                                onChange={() => { }} // Handled by row click
                                            />
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" fw={500}>
                                                {exp.proveedor?.nombre || (exp.items && exp.items[0]?.nombre) || 'Sin detalle'}
                                            </Text>
                                            <Text size="xs" c="dimmed">{exp.fecha_factura}</Text>
                                        </Table.Td>
                                        <Table.Td ta="right">
                                            <Text size="sm" fw={700}>${exp.total_factura.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    )}
                </ScrollArea>

                <Divider label="Datos de la Factura Justificativa" labelPosition="center" />

                <Stack gap="sm">
                    <Select
                        label="Proveedor Legalizador"
                        placeholder="Selecciona un proveedor..."
                        data={proveedores}
                        value={proveedorId}
                        onChange={setProveedorId}
                        searchable
                        required
                        radius="md"
                    />

                    <TextInput
                        label="Número de Factura"
                        placeholder="Ej: 001-001-000000123"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.currentTarget.value)}
                        required
                    />

                    <DatePickerInput
                        label="Fecha de la Factura"
                        placeholder="Elegir fecha"
                        locale="es"
                        value={invoiceDate}
                        onChange={(val: any) => setInvoiceDate(val)}
                        required
                        maxDate={new Date()}
                        allowDeselect={false}
                    />
                </Stack>

                <Button
                    fullWidth
                    size="md"
                    mt="md"
                    leftSection={<IconFileDescription size={18} />}
                    onClick={handleSubmit}
                    disabled={selectedIds.length === 0 || !proveedorId || !invoiceNumber}
                >
                    Procesar Agrupación
                </Button>
            </Stack>
        </Drawer>
    );
}
