import dayjs from 'dayjs';
import { Paper, Text, Stack, Group, NumberInput, TextInput, Select, Grid, Divider } from '@mantine/core';
import { AppModal } from '../ui/AppModal';
import { AppActionButtons } from '../ui/AppActionButtons';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../lib/supabaseClient';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArqueoDenominaciones, type ArqueoDesglose } from './ArqueoDenominaciones';

interface AperturaCajaModalProps {
    opened: boolean;
    close: () => void;
}

export function AperturaCajaModal({ opened, close }: AperturaCajaModalProps) {
    const queryClient = useQueryClient();
    const [arqueoDesglose, setArqueoDesglose] = useState<ArqueoDesglose | null>(null);

    const form = useForm({
        initialValues: {
            saldo_anterior: 0,
            reposicion: 0,
            fecha_apertura: new Date(),
            responsable: '',
            sucursal: '',
        },
        validate: {
            responsable: (value: string) => (value.length < 2 ? 'El responsable es obligatorio' : null),
            sucursal: (value: string) => (value ? null : 'Debes seleccionar un sucursal'),
        },
    });

    const montoInicial = (form.values.saldo_anterior || 0) + (form.values.reposicion || 0);
    const arqueoTotal = arqueoDesglose?.total ?? 0;
    const arqueoConcuerda = montoInicial > 0 && Math.abs(arqueoTotal - montoInicial) < 0.005;
    const tieneItemsArqueo = (arqueoDesglose?.items.length ?? 0) > 0;

    const { data: sucursales = [] } = useQuery({
        queryKey: ['sucursales_list'],
        queryFn: async () => {
            const { data } = await supabase.from('sucursales').select('nombre').order('nombre');
            return (data || [])
                .filter(s => s.nombre != null)
                .map(s => ({ value: String(s.nombre), label: String(s.nombre) }));
        }
    });

    const openCajaMutation = useMutation({
        mutationFn: async (values: any) => {
            const monto_inicial = (values.saldo_anterior || 0) + (values.reposicion || 0);
            const { data: { user } } = await supabase.auth.getUser();

            const { data: newCaja, error } = await supabase.from('cajas').insert([{
                ...values,
                monto_inicial,
                fecha_apertura: dayjs(values.fecha_apertura).toISOString(),
            }]).select().single();

            if (error) throw error;

            await supabase.from('bitacora').insert({
                accion: 'APERTURA_CAJA',
                detalle: {
                    caja_id: newCaja.id,
                    sucursal: newCaja.sucursal,
                    responsable: newCaja.responsable,
                    monto_inicial,
                    arqueo: arqueoDesglose ? {
                        items: arqueoDesglose.items.map(i => ({
                            denominacion: i.denominacion,
                            cantidad: i.cantidad,
                            subtotal: Math.round(i.denominacion * i.cantidad * 100) / 100,
                        })),
                        total_verificado: arqueoDesglose.total,
                    } : null,
                },
                user_id: user?.id,
                user_email: user?.email
            });
            return newCaja;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cajas'] });
            notifications.show({
                title: 'Caja creada',
                message: 'La caja se ha abierto correctamente con arqueo verificado.',
                color: 'teal',
                icon: <IconCheck size={16} />,
            });
            form.reset();
            setArqueoDesglose(null);
            close();
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error.message || 'No se pudo abrir la caja',
                color: 'red',
                icon: <IconX size={16} />,
            });
        }
    });

    const handleClose = () => {
        form.reset();
        setArqueoDesglose(null);
        close();
    };

    const canSubmit = arqueoConcuerda && tieneItemsArqueo;

    return (
        <AppModal
            opened={opened}
            onClose={handleClose}
            title="Nueva Apertura de Caja"
            loading={openCajaMutation.isPending}
            size="xl"
        >
            <form onSubmit={form.onSubmit((v) => {
                if (!canSubmit) return;
                openCajaMutation.mutate(v);
            })}>
                <Grid gutter="xl">
                    {/* Columna Izquierda: Datos de la caja */}
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <Stack gap="md">
                            <Text size="xs" fw={700} tt="uppercase" c="dimmed">Datos de Apertura</Text>

                            <DatePickerInput
                                label="Fecha de Apertura"
                                placeholder="Seleccione fecha"
                                locale="es"
                                required
                                maxDate={new Date()}
                                allowDeselect={false}
                                {...form.getInputProps('fecha_apertura')}
                            />

                            <TextInput
                                label="Responsable"
                                placeholder="Nombre del encargado"
                                required
                                {...form.getInputProps('responsable')}
                            />

                            <Select
                                label="Sucursal"
                                placeholder="Seleccione sucursal"
                                data={Array.isArray(sucursales) && sucursales.length > 0 ? sucursales : [
                                    { value: 'norte', label: 'Sucursal Norte (Default)' },
                                    { value: 'sur', label: 'Sucursal Sur' },
                                    { value: 'centro', label: 'Sucursal Centro' },
                                ]}
                                required
                                {...form.getInputProps('sucursal')}
                            />

                            <Group grow>
                                <NumberInput
                                    label="Saldo Anterior"
                                    placeholder="0.00"
                                    leftSection="$"
                                    decimalScale={2}
                                    required
                                    hideControls
                                    {...form.getInputProps('saldo_anterior')}
                                />
                                <NumberInput
                                    label="Reposición"
                                    placeholder="0.00"
                                    leftSection="$"
                                    decimalScale={2}
                                    hideControls
                                    {...form.getInputProps('reposicion')}
                                />
                            </Group>

                            <Paper withBorder p="xs" radius="md" className="bg-blue-50/50 border-blue-100">
                                <Group justify="space-between">
                                    <Text size="sm" fw={600} c="blue.8">Monto Inicial:</Text>
                                    <Text size="lg" fw={700} c="blue.9">
                                        ${montoInicial.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </Text>
                                </Group>
                            </Paper>
                        </Stack>
                    </Grid.Col>

                    {/* Columna Derecha: Arqueo de Denominaciones */}
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <Stack gap="md">
                            <Text size="xs" fw={700} tt="uppercase" c="dimmed">Arqueo de Dinero</Text>

                            <ArqueoDenominaciones
                                montoEsperado={montoInicial}
                                onChange={setArqueoDesglose}
                            />
                        </Stack>
                    </Grid.Col>
                </Grid>

                <Divider my="md" />

                {!canSubmit && montoInicial > 0 && tieneItemsArqueo && (
                    <Text size="xs" c="red" ta="center" mb="sm">
                        El arqueo debe coincidir con el monto inicial para abrir la caja
                    </Text>
                )}

                <AppActionButtons
                    onCancel={handleClose}
                    loading={openCajaMutation.isPending}
                    submitLabel={canSubmit ? '✓ Abrir Caja' : 'Abrir Caja (Verifique Arqueo)'}
                />
            </form>
        </AppModal>
    );
}
