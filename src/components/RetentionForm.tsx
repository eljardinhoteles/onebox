import { useEffect } from 'react';
import { Stack, TextInput, Select, NumberInput, Group, Paper, Text, Divider, Table, Button } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { supabase } from '../lib/supabaseClient';
import { IconCheck, IconX, IconReceipt, IconTrash } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import dayjs from 'dayjs';
import { useQuery, useMutation } from '@tanstack/react-query';

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

    const form = useForm({
        initialValues: {
            fecha_retencion: new Date(),
            numero_retencion: '',
            ajuste_centavos: 0,
            items: [] as any[],
        },
        validate: {
            numero_retencion: (value) => (value ? null : 'Requerido'),
            items: {
                tipo: (value) => (value ? null : 'Requerido'),
            }
        }
    });

    // --- QUERIES ---

    const { data: retentionData } = useQuery({
        queryKey: ['retention_detail', transactionId],
        queryFn: async () => {
            const { data: trans } = await supabase
                .from('transacciones')
                .select('*, items:transaccion_items!transaccion_items_transaccion_id_fkey(*)')
                .eq('id', transactionId)
                .single();

            const { data: ret } = await supabase
                .from('retenciones')
                .select('*, items:retencion_items(*)')
                .eq('transaccion_id', transactionId)
                .single();

            return { trans, ret };
        }
    });

    const transItems = retentionData?.trans?.items || [];
    const retentionId = retentionData?.ret?.id || null;

    useEffect(() => {
        if (retentionData) {
            const { trans, ret } = retentionData;
            if (ret) {
                form.setValues({
                    fecha_retencion: dayjs(ret.fecha_retencion).toDate(),
                    numero_retencion: ret.numero_retencion,
                    ajuste_centavos: Number(ret.ajuste_centavos || 0),
                    items: ret.items.map((item: any) => ({
                        id: item.id,
                        transaccion_item_id: item.transaccion_item_id,
                        tipo: item.tipo,
                        porcentaje_fuente: item.porcentaje_fuente,
                        porcentaje_iva: item.porcentaje_iva,
                    }))
                });
            } else if (trans) {
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
        }
    }, [retentionData]);



    // --- MUTATIONS ---

    const saveMutation = useMutation({
        mutationFn: async (values: any) => {
            const { data: retData, error: retError } = await supabase
                .from('retenciones')
                .upsert({
                    transaccion_id: transactionId,
                    fecha_retencion: values.fecha_retencion.toISOString().split('T')[0],
                    numero_retencion: values.numero_retencion,
                    total_fuente: totals.fuente,
                    total_iva: totals.iva,
                    total_retenido: totals.total,
                    ajuste_centavos: values.ajuste_centavos || 0,
                    user_id: (await supabase.auth.getUser()).data.user?.id
                }, { onConflict: 'transaccion_id' })
                .select()
                .single();

            if (retError) throw retError;

            await supabase.from('retencion_items').delete().eq('retencion_id', retData.id);

            const itemsToInsert = values.items.map((item: any, index: number) => {
                const { fuente, iva } = calculateItemTotals(index);
                const transItem = transItems.find((ti: TransactionItem) => ti.id === item.transaccion_item_id)!;
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

            const { error: itemsError } = await supabase.from('retencion_items').insert(itemsToInsert);
            if (itemsError) throw itemsError;

            // --- Auditoría en Bitácora ---
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('bitacora').insert({
                accion: retentionId ? 'EDITAR_RETENCION' : 'CREAR_RETENCION',
                detalle: {
                    retencion_id: retData.id,
                    transaccion_id: transactionId,
                    numero_retencion: values.numero_retencion,
                    total_retenido: totals.total
                },
                user_id: user?.id,
                user_email: user?.email
            });

            return retData;
        },
        onSuccess: () => {
            notifications.show({ title: 'Éxito', message: 'Retención guardada', color: 'teal', icon: <IconCheck size={16} /> });
            onSuccess();
        },
        onError: (err: any) => notifications.show({ title: 'Error', message: err.message, color: 'red', icon: <IconX size={16} /> })
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from('retenciones').delete().eq('id', retentionId);
            if (error) throw error;

            // --- Auditoría en Bitácora ---
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('bitacora').insert({
                accion: 'ELIMINAR_RETENCION',
                detalle: {
                    retencion_id: retentionId,
                    transaccion_id: transactionId,
                    numero_retencion: form.values.numero_retencion
                },
                user_id: user?.id,
                user_email: user?.email
            });
        },
        onSuccess: () => {
            notifications.show({ title: 'Eliminado', message: 'Retención eliminada', color: 'teal', icon: <IconCheck size={16} /> });
            onSuccess();
        },
        onError: (err: any) => notifications.show({ title: 'Error', message: err.message, color: 'red' })
    });

    const calculateItemTotals = (index: number) => {
        const item = form.values.items[index];
        const transItem = transItems.find((ti: any) => ti.id === item.transaccion_item_id);
        if (!transItem) return { fuente: 0, iva: 0 };

        const montoFuente = Number(((transItem.monto * (item.porcentaje_fuente || 0)) / 100).toFixed(4));
        const montoIva = Number(((transItem.monto_iva * (item.porcentaje_iva || 0)) / 100).toFixed(4));

        return { fuente: montoFuente, iva: montoIva };
    };

    const subtotals = form.values.items.reduce((acc, _, index) => {
        const { fuente, iva } = calculateItemTotals(index);
        return {
            fuente: Number((Number(acc.fuente) + Number(fuente)).toFixed(2)),
            iva: Number((Number(acc.iva) + Number(iva)).toFixed(2)),
            subtotal: Number((Number(acc.subtotal) + Number(fuente) + Number(iva)).toFixed(2))
        };
    }, { fuente: 0, iva: 0, subtotal: 0 });

    const ajuste = Number(form.values.ajuste_centavos || 0);
    const totals = {
        fuente: subtotals.fuente,
        iva: subtotals.iva,
        total: Number((subtotals.subtotal + ajuste).toFixed(2))
    };

    const handleSubmit = (values: typeof form.values) => saveMutation.mutate(values);

    const openDeleteModal = () => {
        if (!retentionId) return;
        modals.openConfirmModal({
            title: '¿Eliminar retención?',
            centered: true,
            children: <Text size="sm">¿Estás seguro de que deseas eliminar esta retención?</Text>,
            labels: { confirm: 'Eliminar', cancel: 'Cancelar' },
            confirmProps: { color: 'red' },
            onConfirm: () => deleteMutation.mutate(),
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
                        maxDate={new Date()}
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
                            const transItem = transItems.find((ti: any) => ti.id === item.transaccion_item_id);
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
                        <Group justify="space-between" align="center">
                            <NumberInput
                                label="Ajuste de Centavos"
                                description="+/- para diferencias decimales"
                                placeholder="0.00"
                                prefix="$"
                                hideControls
                                decimalScale={2}
                                fixedDecimalScale
                                allowNegative
                                step={0.01}
                                size="xs"
                                style={{ flex: 1, maxWidth: 200 }}
                                readOnly={readOnly}
                                variant={readOnly ? "filled" : "default"}
                                {...form.getInputProps('ajuste_centavos')}
                            />
                            <Stack gap={0} align="flex-end">
                                <Text size="xs" c="dimmed">Total Retenido</Text>
                                <Text size="lg" fw={700} c="orange.7">
                                    ${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Text>
                            </Stack>
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
                                onClick={openDeleteModal}
                                loading={deleteMutation.isPending}
                            >
                                Eliminar Retención
                            </Button>
                        )}
                        <Group ml="auto">
                            <Button variant="default" onClick={onCancel} disabled={saveMutation.isPending}>
                                Cancelar
                            </Button>
                            <Button type="submit" color="orange" loading={saveMutation.isPending}>
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
