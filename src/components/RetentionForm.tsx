import { useState, useEffect } from 'react';
import { Stack, TextInput, Select, NumberInput, Group, Paper, Text, Divider, Table, Button } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { supabase } from '../lib/supabaseClient';
import { IconCheck, IconX, IconReceipt, IconTrash } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import dayjs from 'dayjs';

interface RetentionFormProps {
    transactionId: number;
    onSuccess: () => void;
    onCancel: () => void;
    readOnly?: boolean;
}

interface TransactionItem {
    id: number;
    nombre: string;
    monto: number;
    con_iva: boolean;
    monto_iva: number;
}

export function RetentionForm({ transactionId, onSuccess, onCancel, readOnly = false }: RetentionFormProps) {
    const [loading, setLoading] = useState(false);
    const [transItems, setTransItems] = useState<TransactionItem[]>([]);
    const [retentionId, setRetentionId] = useState<number | null>(null);

    const form = useForm({
        initialValues: {
            fecha_retencion: new Date(),
            numero_retencion: '',
            items: [] as any[],
        },
        validate: {
            numero_retencion: (value) => (value ? null : 'Requerido'),
            items: {
                tipo: (value) => (value ? null : 'Requerido'),
            }
        }
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch transaction details
                const { data: trans, error: transError } = await supabase
                    .from('transacciones')
                    .select('*, items:transaccion_items(*)')
                    .eq('id', transactionId)
                    .single();

                if (transError) throw transError;
                setTransItems(trans.items);

                // Check if retention already exists
                const { data: ret } = await supabase
                    .from('retenciones')
                    .select('*, items:retencion_items(*)')
                    .eq('transaccion_id', transactionId)
                    .single();

                if (ret) {
                    setRetentionId(ret.id);
                    form.setValues({
                        fecha_retencion: dayjs(ret.fecha_retencion).toDate(),
                        numero_retencion: ret.numero_retencion,
                        items: ret.items.map((item: any) => ({
                            id: item.id,
                            transaccion_item_id: item.transaccion_item_id,
                            tipo: item.tipo,
                            porcentaje_fuente: item.porcentaje_fuente,
                            porcentaje_iva: item.porcentaje_iva,
                        }))
                    });
                } else {
                    // Pre-fill with items from transaction
                    form.setValues({
                        fecha_retencion: dayjs(trans.fecha_factura).toDate(),
                        items: trans.items.map((item: any) => ({
                            transaccion_item_id: item.id,
                            tipo: 'bien',
                            porcentaje_fuente: 0,
                            porcentaje_iva: 0,
                        }))
                    });
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [transactionId]);

    const calculateItemTotals = (index: number) => {
        const item = form.values.items[index];
        const transItem = transItems.find(ti => ti.id === item.transaccion_item_id);
        if (!transItem) return { fuente: 0, iva: 0 };

        const montoFuente = Number(((transItem.monto * (item.porcentaje_fuente || 0)) / 100).toFixed(4));
        const montoIva = Number(((transItem.monto_iva * (item.porcentaje_iva || 0)) / 100).toFixed(4));

        return { fuente: montoFuente, iva: montoIva };
    };

    const totals = form.values.items.reduce((acc, _, index) => {
        const { fuente, iva } = calculateItemTotals(index);
        return {
            fuente: Number((Number(acc.fuente) + Number(fuente)).toFixed(2)),
            iva: Number((Number(acc.iva) + Number(iva)).toFixed(2)),
            total: Number((Number(acc.total) + Number(fuente) + Number(iva)).toFixed(2))
        };
    }, { fuente: 0, iva: 0, total: 0 });

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        try {
            // 1. Create/Update Retention Header
            const { data: retData, error: retError } = await supabase
                .from('retenciones')
                .upsert({
                    transaccion_id: transactionId,
                    fecha_retencion: values.fecha_retencion.toISOString().split('T')[0],
                    numero_retencion: values.numero_retencion,
                    total_fuente: totals.fuente,
                    total_iva: totals.iva,
                    total_retenido: totals.total,
                    user_id: (await supabase.auth.getUser()).data.user?.id
                }, { onConflict: 'transaccion_id' })
                .select()
                .single();

            if (retError) throw retError;

            // 2. Clear and Insert Items
            await supabase.from('retencion_items').delete().eq('retencion_id', retData.id);

            const itemsToInsert = values.items.map((item, index) => {
                const { fuente, iva } = calculateItemTotals(index);
                const transItem = transItems.find(ti => ti.id === item.transaccion_item_id)!;
                return {
                    retencion_id: retData.id,
                    transaccion_item_id: item.transaccion_item_id,
                    tipo: item.tipo,
                    base_imponible: transItem.monto,
                    porcentaje_fuente: item.porcentaje_fuente,
                    monto_fuente: fuente,
                    porcentaje_iva: item.porcentaje_iva,
                    monto_iva: iva
                };
            });

            const { error: itemsError } = await supabase
                .from('retencion_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            notifications.show({
                title: 'Éxito',
                message: 'Retención guardada correctamente',
                color: 'teal',
                icon: <IconCheck size={16} />,
            });

            onSuccess();
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: error.message || 'No se pudo guardar la retención',
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!retentionId) return;

        modals.openConfirmModal({
            title: '¿Eliminar retención?',
            centered: true,
            children: (
                <Text size="sm">
                    ¿Estás seguro de que deseas eliminar esta retención? Esta acción no se puede deshacer.
                </Text>
            ),
            labels: { confirm: 'Eliminar', cancel: 'Cancelar' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                setLoading(true);
                try {
                    const { error } = await supabase
                        .from('retenciones')
                        .delete()
                        .eq('id', retentionId);

                    if (error) throw error;

                    notifications.show({
                        title: 'Éxito',
                        message: 'Retención eliminada correctamente',
                        color: 'teal',
                        icon: <IconCheck size={16} />,
                    });

                    onSuccess();
                } catch (error: any) {
                    notifications.show({
                        title: 'Error',
                        message: error.message || 'No se pudo eliminar la retención',
                        color: 'red',
                        icon: <IconX size={16} />,
                    });
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
                {readOnly && (
                    <Paper withBorder p="xs" bg="blue.0" c="blue.9" className="border-blue-200">
                        <Group gap="xs">
                            <IconCheck size={16} /> {/* Using IconCheck as placeholder, check if IconInfoCircle is imported */}
                            <Text size="xs" fw={500}>Modo solo lectura.</Text>
                        </Group>
                    </Paper>
                )}
                <Group grow>
                    <DatePickerInput
                        label="Fecha de Retención"
                        placeholder="Seleccione fecha"
                        locale="es"
                        required
                        readOnly={readOnly}
                        variant={readOnly ? "filled" : "default"}
                        {...form.getInputProps('fecha_retencion')}
                    />
                    <TextInput
                        label="Número de Retención"
                        placeholder="Ej: 001-001-000000123"
                        required
                        readOnly={readOnly}
                        variant={readOnly ? "filled" : "default"}
                        {...form.getInputProps('numero_retencion')}
                    />
                </Group>

                <Divider label={<Group gap="xs"><IconReceipt size={14} />Desglose por Ítem</Group>} labelPosition="center" />

                <Table verticalSpacing="xs">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Ítem / Base</Table.Th>
                            <Table.Th w={120}>Tipo</Table.Th>
                            <Table.Th w={100}>% Fuente</Table.Th>
                            <Table.Th w={100}>% IVA</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {form.values.items.map((item, index) => {
                            const transItem = transItems.find(ti => ti.id === item.transaccion_item_id);
                            return (
                                <Table.Tr key={item.transaccion_item_id}>
                                    <Table.Td>
                                        <Text size="sm" fw={500}>{transItem?.nombre}</Text>
                                        <Text size="xs" c="dimmed">Base: ${transItem?.monto.toLocaleString(undefined, { minimumFractionDigits: 4 })} | IVA: ${transItem?.monto_iva.toLocaleString(undefined, { minimumFractionDigits: 4 })}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Select
                                            size="xs"
                                            data={[
                                                { value: 'bien', label: 'Bien' },
                                                { value: 'servicio', label: 'Servicio' },
                                            ]}
                                            readOnly={readOnly}
                                            variant={readOnly ? "filled" : "default"}
                                            {...form.getInputProps(`items.${index}.tipo`)}
                                        />
                                    </Table.Td>
                                    <Table.Td>
                                        <NumberInput
                                            size="xs"
                                            placeholder="0.0000%"
                                            suffix="%"
                                            hideControls
                                            decimalScale={4}
                                            fixedDecimalScale
                                            readOnly={readOnly}
                                            variant={readOnly ? "filled" : "default"}
                                            {...form.getInputProps(`items.${index}.porcentaje_fuente`)}
                                        />
                                    </Table.Td>
                                    <Table.Td>
                                        <NumberInput
                                            size="xs"
                                            placeholder="0.0000%"
                                            suffix="%"
                                            hideControls
                                            decimalScale={4}
                                            fixedDecimalScale
                                            readOnly={readOnly}
                                            variant={readOnly ? "filled" : "default"}
                                            {...form.getInputProps(`items.${index}.porcentaje_iva`)}
                                        />
                                    </Table.Td>
                                </Table.Tr>
                            );
                        })}
                    </Table.Tbody>
                </Table>

                <Paper withBorder p="md" radius="md" bg="gray.0">
                    <Stack gap="xs">
                        <Group justify="space-between">
                            <Text size="sm">Total Retención Fuente:</Text>
                            <Text size="sm" fw={500}>${totals.fuente.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                        </Group>
                        <Group justify="space-between">
                            <Text size="sm">Total Retención IVA:</Text>
                            <Text size="sm" fw={500}>${totals.iva.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                        </Group>
                        <Divider />
                        <Group justify="space-between">
                            <Text size="md" fw={700}>Total Retenido:</Text>
                            <Text size="lg" fw={700} color="orange.7">
                                ${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                        </Group>
                    </Stack>
                </Paper>

                {!readOnly ? (
                    <Group justify="space-between" align="center">
                        {retentionId && (
                            <Button
                                variant="light"
                                color="red"
                                leftSection={<IconTrash size={16} />}
                                onClick={handleDelete}
                                loading={loading}
                            >
                                Eliminar Retención
                            </Button>
                        )}
                        <Group ml="auto">
                            <Button variant="default" onClick={onCancel} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button type="submit" color="orange" loading={loading}>
                                Guardar Retención
                            </Button>
                        </Group>
                    </Group>
                ) : (
                    <div className="flex justify-end">
                        <Button variant="default" onClick={onCancel}>
                            Cerrar
                        </Button>
                    </div>
                )}
            </Stack>
        </form>
    );
}
