import { useState, useEffect } from 'react';
import { Drawer, Stack, Text, Button, Checkbox, Table, TextInput, Group, Paper, Divider, ScrollArea, LoadingOverlay } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { supabase } from '../lib/supabaseClient';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconFileDescription, IconAlertCircle } from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

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
    const [proveedorId, setProveedorId] = useState<string>('');
    const [proveedores, setProveedores] = useState<any[]>([]);
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
            const { data } = await supabase
                .from('transacciones')
                .select(`
                    id,
                    fecha_factura,
                    numero_factura,
                    total_factura,
                    proveedor:proveedores (id, nombre),
                    items:transaccion_items (nombre)
                `)
                .eq('caja_id', cajaId)
                .eq('tipo_documento', 'sin_factura')
                .is('parent_id', null);

            setAvailableExpenses((data || []).map((t: any) => ({
                ...t,
                proveedor: Array.isArray(t.proveedor) ? t.proveedor[0] : t.proveedor
            })));
        } catch (error) {
            console.error('Error fetching available expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProveedores = async () => {
        const { data } = await supabase.from('proveedores').select('id, nombre').order('nombre');
        setProveedores(data || []);
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
                    fecha_factura: invoiceDate.toISOString().split('T')[0],
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
                    <Group grow>
                        <Stack gap={4}>
                            <Text size="xs" fw={700}>Proveedor Legalizador</Text>
                            <select
                                value={proveedorId}
                                onChange={(e) => setProveedorId(e.target.value)}
                                style={{
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ced4da',
                                    fontSize: '14px'
                                }}
                            >
                                <option value="">Selecciona un proveedor...</option>
                                {proveedores.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                            </select>
                        </Stack>
                    </Group>

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
