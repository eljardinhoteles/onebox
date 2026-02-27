import dayjs from 'dayjs';
import { Paper, Text, Stack, Group, NumberInput, TextInput, Select, Grid, Divider, Button, Badge, Tooltip } from '@mantine/core';
import { AppModal } from '../ui/AppModal';
import { AppActionButtons } from '../ui/AppActionButtons';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../lib/supabaseClient';
import { IconCheck, IconX, IconArrowRight, IconCash } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useEmpresa } from '../../context/EmpresaContext';
import { ArqueoDenominaciones, type ArqueoDesglose } from './ArqueoDenominaciones';

interface AperturaCajaModalProps {
    opened: boolean;
    close: () => void;
}

export function AperturaCajaModal({ opened, close }: AperturaCajaModalProps) {
    const { empresa } = useEmpresa();
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

    const sucursalSeleccionada = form.values.sucursal;
    const montoInicial = (form.values.saldo_anterior || 0) + (form.values.reposicion || 0);
    const arqueoTotal = arqueoDesglose?.total ?? 0;
    const arqueoConcuerda = montoInicial > 0 && Math.abs(arqueoTotal - montoInicial) < 0.005;
    const tieneItemsArqueo = (arqueoDesglose?.items.length ?? 0) > 0;

    const { data: sucursales = [] } = useQuery({
        queryKey: ['sucursales_list', empresa?.id],
        queryFn: async () => {
            if (!empresa) return [];
            const { data } = await supabase.from('sucursales').select('nombre').eq('empresa_id', empresa.id).order('nombre');
            return (data || [])
                .filter(s => s.nombre != null)
                .map(s => ({ value: String(s.nombre), label: String(s.nombre) }));
        },
        enabled: !!empresa
    });

    // Buscar la caja cerrada más reciente de la sucursal seleccionada
    const { data: cajaAnterior } = useQuery({
        queryKey: ['caja_anterior', empresa?.id, sucursalSeleccionada],
        queryFn: async () => {
            if (!empresa || !sucursalSeleccionada) return null;
            const { data } = await supabase
                .from('cajas')
                .select('id, numero, fecha_cierre, monto_inicial, reposicion, responsable')
                .eq('empresa_id', empresa.id)
                .eq('sucursal', sucursalSeleccionada)
                .eq('estado', 'cerrada')
                .order('fecha_cierre', { ascending: false })
                .limit(1)
                .maybeSingle();
            return data || null;
        },
        enabled: !!empresa && !!sucursalSeleccionada,
    });

    // Calcular el efectivo sobrante de la caja anterior
    // El efectivo sobrante = monto_inicial - reposicion (gastos netos descontados)
    // En realidad el valor neto guardado en cajas es totals.efectivo al momento del cierre,
    // que se guarda como (monto_inicial - reposicion [gastos netos])
    const effectivoSobrante = cajaAnterior
        ? Math.max(0, (cajaAnterior.monto_inicial || 0) - (cajaAnterior.reposicion || 0))
        : 0;

    const aplicarSaldoAnterior = () => {
        form.setFieldValue('saldo_anterior', effectivoSobrante);
        setArqueoDesglose(null); // Resetear arqueo al cambiar el monto
    };

    const openCajaMutation = useMutation({
        mutationFn: async (values: any) => {
            const monto_inicial = (values.saldo_anterior || 0) + (values.reposicion || 0);
            const { data: { user } } = await supabase.auth.getUser();

            const { data: newCaja, error } = await supabase.from('cajas').insert([{
                ...values,
                monto_inicial,
                fecha_apertura: dayjs(values.fecha_apertura).toISOString(),
                empresa_id: empresa?.id
            }]).select().single();

            if (error) throw error;

            await supabase.from('bitacora').insert({
                accion: 'APERTURA_CAJA',
                detalle: {
                    caja_id: newCaja.id,
                    numero_caja: newCaja.numero || newCaja.id,
                    sucursal: newCaja.sucursal,
                    responsable: newCaja.responsable,
                    monto_inicial,
                    saldo_anterior: values.saldo_anterior,
                    reposicion: values.reposicion,
                    caja_anterior_id: cajaAnterior?.id ?? null,
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
                user_email: user?.email,
                empresa_id: empresa?.id
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
                                onChange={(v) => {
                                    form.setFieldValue('sucursal', v ?? '');
                                    // Limpiar saldo anterior al cambiar de sucursal
                                    form.setFieldValue('saldo_anterior', 0);
                                    setArqueoDesglose(null);
                                }}
                            />

                            {/* Sugerencia de saldo sobrante de caja anterior */}
                            {cajaAnterior && effectivoSobrante > 0 && (
                                <Paper withBorder p="sm" radius="md" bg="teal.0" style={{ borderColor: 'var(--mantine-color-teal-3)' }}>
                                    <Stack gap={6}>
                                        <Group gap="xs">
                                            <IconCash size={16} color="var(--mantine-color-teal-7)" />
                                            <Text size="xs" fw={700} c="teal.8">Saldo sobrante disponible</Text>
                                            <Badge variant="light" color="teal" size="xs">
                                                Caja #{cajaAnterior.numero ?? cajaAnterior.id}
                                            </Badge>
                                        </Group>
                                        <Text size="xs" c="teal.7">
                                            La última caja de <b>{sucursalSeleccionada}</b> cerró con{' '}
                                            <b>${effectivoSobrante.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>{' '}
                                            de efectivo sobrante ({dayjs(cajaAnterior.fecha_cierre).format('DD/MM/YYYY')}).
                                        </Text>
                                        <Tooltip label="Carga este valor en el campo Saldo Anterior" position="right" withArrow>
                                            <Button
                                                variant="light"
                                                color="teal"
                                                size="xs"
                                                leftSection={<IconArrowRight size={14} />}
                                                w="fit-content"
                                                onClick={aplicarSaldoAnterior}
                                            >
                                                Aplicar ${effectivoSobrante.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </Button>
                                        </Tooltip>
                                    </Stack>
                                </Paper>
                            )}

                            <Group grow>
                                <NumberInput
                                    label="Saldo Anterior"
                                    description="Efectivo sobrante de la caja previa"
                                    placeholder="0.00"
                                    leftSection="$"
                                    decimalScale={2}
                                    hideControls
                                    {...form.getInputProps('saldo_anterior')}
                                />
                                <NumberInput
                                    label="Reposición"
                                    description="Monto nuevo que ingresa a la caja"
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
