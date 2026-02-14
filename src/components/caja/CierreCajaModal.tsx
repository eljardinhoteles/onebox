import dayjs from 'dayjs';
import { Paper, Text, Stack, Group, TextInput, Select, Grid, Divider } from '@mantine/core';
import { AppModal } from '../ui/AppModal';
import { AppActionButtons } from '../ui/AppActionButtons';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../lib/supabaseClient';
import { IconCheck, IconX, IconLock, IconFileInvoice } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArqueoDenominaciones, type ArqueoDesglose } from './ArqueoDenominaciones';

interface CierreCajaModalProps {
    opened: boolean;
    close: () => void;
    caja: any;
    totals: {
        facturado: number;
        totalRet: number;
        fuente: number;
        iva: number;
        neto: number;
        efectivo: number;
    };
    onSuccess: () => void;
    readOnly?: boolean;
}

export function CierreCajaModal({ opened, close, caja, totals, onSuccess, readOnly = false }: CierreCajaModalProps) {
    const queryClient = useQueryClient();
    const [arqueoDesglose, setArqueoDesglose] = useState<ArqueoDesglose | null>(null);

    const form = useForm({
        initialValues: {
            fecha_cierre: new Date(),
            numero_cheque_reposicion: '',
            banco_reposicion: '',
        },
        validate: {
            numero_cheque_reposicion: (value) => (value ? null : 'Requerido para el cierre'),
            banco_reposicion: (value) => (value ? null : 'Requerido para el cierre'),
        },
    });

    const efectivoEsperado = totals.efectivo;
    const arqueoTotal = arqueoDesglose?.total ?? 0;
    // Permitir pequeña discrepancia por redondeo de centavos si es necesario, 
    // pero idealmente coincidencia exacta.
    const arqueoConcuerda = Math.abs(arqueoTotal - efectivoEsperado) < 0.005;
    const tieneItemsArqueo = (arqueoDesglose?.items.length ?? 0) > 0;
    const canSubmit = arqueoConcuerda && tieneItemsArqueo && !readOnly;

    const { data: bancos = [] } = useQuery({
        queryKey: ['bancos'],
        queryFn: async () => {
            const { data } = await supabase.from('bancos').select('nombre').order('nombre');
            return (data || []).map(b => ({ value: b.nombre, label: b.nombre }));
        },
    });

    const closeCajaMutation = useMutation({
        mutationFn: async (values: typeof form.values) => {
            const { data: { user } } = await supabase.auth.getUser();

            const payload = {
                estado: 'cerrada',
                fecha_cierre: dayjs(values.fecha_cierre).toISOString(),
                reposicion: totals.neto,
                numero_cheque_reposicion: values.numero_cheque_reposicion,
                banco_reposicion: values.banco_reposicion,
                // Almacenamos el arqueo en la bitácora
                // Si la tabla cajas tuviera un campo jsonb para el arqueo_cierre, se podría añadir aquí.
            };

            const { error: updateError } = await supabase
                .from('cajas')
                .update(payload)
                .eq('id', caja.id);

            if (updateError) throw updateError;

            // Log en bitácora
            await supabase.from('bitacora').insert({
                accion: 'CIERRE_CAJA',
                detalle: {
                    caja_id: caja.id,
                    sucursal: caja.sucursal,
                    monto_inicial: caja.monto_inicial,
                    gastos_netos: totals.neto,
                    efectivo_esperado: efectivoEsperado,
                    arqueo_cierre: arqueoDesglose ? {
                        items: arqueoDesglose.items.map(i => ({
                            denominacion: i.denominacion,
                            cantidad: i.cantidad,
                            subtotal: Math.round(i.denominacion * i.cantidad * 100) / 100,
                        })),
                        total_contado: arqueoDesglose.total,
                    } : null,
                    numero_cheque: values.numero_cheque_reposicion,
                    banco: values.banco_reposicion,
                    fecha_accion_cierre: new Date().toISOString()
                },
                user_id: user?.id,
                user_email: user?.email
            });

            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['caja', caja.id] });
            queryClient.invalidateQueries({ queryKey: ['cajas'] });
            notifications.show({
                title: 'Caja Cerrada',
                message: 'El cierre se ha registrado exitosamente con el arqueo verificado.',
                color: 'teal',
                icon: <IconCheck size={16} />,
            });
            onSuccess(); // Esto cerrará el modal y mostrará la pantalla de éxito en el padre si se desea
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error al cerrar',
                message: error.message || 'No se pudo completar el cierre',
                color: 'red',
                icon: <IconX size={16} />,
            });
        }
    });

    const handleFormSubmit = (values: typeof form.values) => {
        if (!canSubmit) return;
        closeCajaMutation.mutate(values);
    };

    return (
        <AppModal
            opened={opened}
            onClose={close}
            title={
                <Group gap="xs">
                    {readOnly ? <IconLock size={20} color="gray" /> : <IconLock size={20} color="red" />}
                    <Text fw={700}>{readOnly ? 'Simulación de Cierre' : 'Cierre de Caja Definitivo'}</Text>
                </Group>
            }
            loading={closeCajaMutation.isPending}
            size="xl"
            closeOnClickOutside={false}
        >
            <form onSubmit={form.onSubmit(handleFormSubmit)}>
                {readOnly && (
                    <Paper withBorder p="sm" bg="blue.0" c="blue.9" className="border-blue-200" mb="md">
                        <Group gap="xs">
                            <Text size="xs" fw={700}>ℹ️ MODO LECTURA:</Text>
                            <Text size="xs">Está viendo una simulación de los totales. Los datos no se guardarán.</Text>
                        </Group>
                    </Paper>
                )}
                <Grid gutter="xl">
                    {/* Columna Izquierda: Arqueo */}
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <Stack gap="md">
                            <Text size="xs" fw={700} tt="uppercase" c="dimmed">Conteo Físico (Arqueo)</Text>
                            <ArqueoDenominaciones
                                montoEsperado={efectivoEsperado}
                                onChange={setArqueoDesglose}
                            />
                        </Stack>
                    </Grid.Col>

                    {/* Columna Derecha: Datos del Cierre */}
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <Stack gap="md">
                            <Text size="xs" fw={700} tt="uppercase" c="dimmed">Resumen Financiero</Text>

                            <Paper withBorder p="md" radius="md" bg="gray.0">
                                <Stack gap="xs">
                                    <Group justify="space-between">
                                        <Text size="sm">Monto Inicial:</Text>
                                        <Text size="sm" fw={600}>${caja?.monto_inicial.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm" c="red.6">Total Gastos Netos:</Text>
                                        <Text size="sm" fw={600} c="red.6">-${totals.neto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                    </Group>
                                    <Divider />
                                    <Group justify="space-between">
                                        <Text size="sm" fw={700}>Efectivo Final Esperado:</Text>
                                        <Text size="lg" fw={800} c="blue.9">
                                            ${efectivoEsperado.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </Text>
                                    </Group>

                                    <Paper withBorder p="xs" radius="md" bg="orange.0" className="border-orange-100" mt="xs">
                                        <Group gap="xs" justify="space-between">
                                            <Group gap="xs">
                                                <IconFileInvoice size={14} color="orange" />
                                                <Text size="xs" fw={700} c="orange.6" tt="uppercase">Retenciones Totales</Text>
                                            </Group>
                                            <Text size="sm" fw={800} c="orange.9">
                                                ${totals.totalRet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </Text>
                                        </Group>
                                    </Paper>
                                </Stack>
                            </Paper>

                            <DatePickerInput
                                label="Fecha de Cierre"
                                placeholder="Seleccione la fecha"
                                locale="es"
                                required
                                maxDate={new Date()}
                                allowDeselect={false}
                                disabled={readOnly}
                                {...form.getInputProps('fecha_cierre')}
                            />

                            <Group grow>
                                <Select
                                    label="Banco del Cheque"
                                    placeholder="Seleccione banco"
                                    data={bancos}
                                    required
                                    searchable
                                    disabled={readOnly}
                                    {...form.getInputProps('banco_reposicion')}
                                />
                                <TextInput
                                    label="Número de Cheque"
                                    placeholder="Ej: CH-123456"
                                    required
                                    disabled={readOnly}
                                    {...form.getInputProps('numero_cheque_reposicion')}
                                />
                            </Group>

                            <Text size="xs" c="dimmed" fs="italic">
                                * Se emitirá un cheque de reposición por el total neto de gastos (${totals.neto.toFixed(2)}).
                            </Text>
                        </Stack>
                    </Grid.Col>
                </Grid>

                <Divider my="md" />

                {!canSubmit && tieneItemsArqueo && Math.abs(arqueoTotal - efectivoEsperado) > 0.005 && (
                    <Text size="xs" c="red" ta="center" mb="sm" fw={500}>
                        ⚠️ El arqueo fisico debe coincidir exactamente con el efectivo final esperado para poder cerrar la caja.
                    </Text>
                )}

                <AppActionButtons
                    onCancel={close}
                    loading={closeCajaMutation.isPending}
                    showSubmit={!readOnly}
                    submitLabel={canSubmit ? '✓ Confirmar e Imprimir' : 'Cerrar Caja (Contar Efectivo)'}
                />
            </form>
        </AppModal>
    );
}
