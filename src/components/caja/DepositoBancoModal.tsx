import { useEffect } from 'react';
import { Stack, NumberInput, Select, Button, Text, Group, ScrollArea, Table, ActionIcon, Grid, Title } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../lib/supabaseClient';
import { AppModal } from '../ui/AppModal';
import { IconBuildingBank, IconCalendar, IconCurrencyDollar, IconTrash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

interface DepositoBancoModalProps {
    opened: boolean;
    onClose: () => void;
    cajaId: number;
    maxMonto: number; // El saldo actual en efectivo para no depositar más de lo que hay
    onSuccess?: () => void;
    existingDeposits?: any[];
    onDeleteDeposit?: (id: number) => void;
}

export function DepositoBancoModal({ opened, onClose, cajaId, maxMonto, onSuccess, existingDeposits = [], onDeleteDeposit }: DepositoBancoModalProps) {
    const queryClient = useQueryClient();

    const form = useForm({
        initialValues: {
            fecha: new Date(),
            monto: undefined as number | undefined,
            banco_id: '' as string,
        },
        validate: {
            fecha: (value) => (!value ? 'La fecha es obligatoria' : null),
            monto: (value) => {
                if (!value || value <= 0) return 'El monto debe ser mayor a 0';
                if (value > maxMonto) return `El monto no puede exceder el efectivo disponible ($${maxMonto.toFixed(2)})`;
                return null;
            },
            banco_id: (value) => (!value ? 'Debe seleccionar un banco de destino' : null),
        },
    });

    useEffect(() => {
        if (opened) {
            form.reset();
            form.setFieldValue('fecha', new Date());
        }
    }, [opened]);

    // Consultar lista de bancos
    const { data: bancosList = [] } = useQuery({
        queryKey: ['bancos_list_deposito'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bancos')
                .select('id, nombre')
                .order('nombre');

            if (error) throw error;

            return (data || []).map(b => ({
                value: String(b.id),
                label: b.nombre
            }));
        },
        enabled: opened // Solo cargar cuando se abre el modal
    });

    const mutation = useMutation({
        mutationFn: async (values: typeof form.values) => {
            if (!values.monto) throw new Error("Monto inválido");

            // 1. Insertar transacción de tipo 'deposito'
            // Nota: Un depósito es una SALIDA de dinero de la caja
            const { error } = await supabase.from('transacciones').insert({
                caja_id: cajaId,
                fecha_factura: dayjs(values.fecha).format('YYYY-MM-DD'),
                total_factura: values.monto, // Se registra positivo, pero al ser 'deposito' restará en la vista
                tipo_documento: 'deposito', // Nuevo tipo
                banco_id: values.banco_id,
                numero_factura: 'DEPOSITO', // Placeholder
                proveedor_id: null, // No aplica
                es_justificacion: false
            });

            if (error) throw error;

            // 2. Registro en bitácora
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('bitacora').insert({
                accion: 'REGISTRAR_DEPOSITO',
                detalle: {
                    caja_id: cajaId,
                    monto: values.monto,
                    banco_id: values.banco_id
                },
                user_id: user?.id,
                user_email: user?.email
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['caja_transactions', cajaId] });
            queryClient.invalidateQueries({ queryKey: ['caja', cajaId] });
            notifications.show({
                title: 'Depósito Registrado',
                message: 'El dinero ha sido descontado de la caja correctamente.',
                color: 'teal',
            });
            onClose();
            onSuccess?.();
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error.message || 'No se pudo registrar el depósito',
                color: 'red',
            });
        }
    });

    return (
        <AppModal
            opened={opened}
            onClose={onClose}
            title="Gestión de Depósitos Bancarios"
            size="xl"
        >
            <form onSubmit={form.onSubmit((v) => mutation.mutate(v))}>
                <Grid gutter="xl">
                    <Grid.Col span={{ base: 12, md: 7 }}>
                        <Title order={4} mb="md">Historial de Depósitos</Title>
                        <ScrollArea h={350} type="auto" offsetScrollbars>
                            <Table striped highlightOnHover withTableBorder>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Fecha</Table.Th>
                                        <Table.Th>Banco</Table.Th>
                                        <Table.Th style={{ textAlign: 'right' }}>Monto</Table.Th>
                                        <Table.Th></Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {existingDeposits?.length === 0 ? (
                                        <Table.Tr>
                                            <Table.Td colSpan={4} align="center">
                                                <Text size="sm" c="dimmed" py="xl">No hay depósitos registrados en esta apertura.</Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    ) : (
                                        existingDeposits?.map((deposit) => (
                                            <Table.Tr key={deposit.id}>
                                                <Table.Td>{dayjs(deposit.fecha_factura).format('DD/MM/YYYY')}</Table.Td>
                                                <Table.Td>{deposit.banco?.nombre || 'Banco'}</Table.Td>
                                                <Table.Td align="right">${deposit.total_factura.toFixed(2)}</Table.Td>
                                                <Table.Td align="right">
                                                    <ActionIcon
                                                        color="red"
                                                        variant="subtle"
                                                        onClick={() => onDeleteDeposit?.(deposit.id)}
                                                        title="Eliminar depósito"
                                                    >
                                                        <IconTrash size={16} />
                                                    </ActionIcon>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))
                                    )}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 5 }} style={{ borderLeft: '1px solid var(--mantine-color-gray-3)' }}>
                        <Stack gap="md" p="xs">
                            <Title order={4}>Nuevo Depósito</Title>
                            <Text size="sm" c="dimmed">
                                Registre la salida de efectivo hacia el banco.
                            </Text>

                            <DateInput
                                label="Fecha"
                                placeholder="Seleccione fecha"
                                leftSection={<IconCalendar size={16} />}
                                maxDate={new Date()}
                                locale="es"
                                required
                                {...form.getInputProps('fecha')}
                            />

                            <Select
                                label="Banco Destino"
                                placeholder="Seleccione cuenta"
                                leftSection={<IconBuildingBank size={16} />}
                                data={bancosList}
                                searchable
                                nothingFoundMessage="No hay bancos"
                                required
                                {...form.getInputProps('banco_id')}
                            />

                            <NumberInput
                                label="Monto"
                                placeholder="0.00"
                                leftSection={<IconCurrencyDollar size={16} />}
                                min={0.01}
                                max={maxMonto}
                                decimalScale={2}
                                fixedDecimalScale
                                required
                                description={`Disponible: $${maxMonto.toFixed(2)}`}
                                {...form.getInputProps('monto')}
                            />

                            <Group justify="flex-end" mt="xl">
                                <Button variant="default" onClick={onClose}>
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    color="blue"
                                    loading={mutation.isPending}
                                    disabled={!form.isValid()}
                                >
                                    Registrar
                                </Button>
                            </Group>
                        </Stack>
                    </Grid.Col>
                </Grid>
            </form>
        </AppModal>
    );
}
