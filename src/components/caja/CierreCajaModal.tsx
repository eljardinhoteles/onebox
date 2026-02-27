import dayjs from 'dayjs';
import { Paper, Text, Stack, Group, TextInput, Select, Grid, Divider, SegmentedControl } from '@mantine/core';
import { AppModal } from '../ui/AppModal';
import { AppActionButtons } from '../ui/AppActionButtons';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../lib/supabaseClient';
import { IconCheck, IconX, IconLock, IconFileInvoice, IconBuildingBank, IconTransfer } from '@tabler/icons-react';
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
        totalDepositos?: number;
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
            metodo_reposicion: 'cheque' as 'cheque' | 'transferencia',
            numero_cheque_reposicion: '',
            banco_reposicion: '',
        },
        validate: {
            banco_reposicion: (value) => (value ? null : 'Requerido para el cierre'),
            numero_cheque_reposicion: (value, values) =>
                values.metodo_reposicion === 'cheque' && !value ? 'Requerido para el cierre con cheque' : null,
        },
    });

    const metodo = form.values.metodo_reposicion;

    const efectivoEsperado = totals.efectivo;
    const arqueoTotal = arqueoDesglose?.total ?? 0;
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
            if (!caja) throw new Error('Caja not found');
            const { data: { user } } = await supabase.auth.getUser();

            const payload = {
                estado: 'cerrada',
                fecha_cierre: dayjs(values.fecha_cierre).toISOString(),
                reposicion: totals.neto,
                metodo_reposicion: values.metodo_reposicion,
                numero_cheque_reposicion: values.numero_cheque_reposicion || null,
                banco_reposicion: values.banco_reposicion,
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
                    metodo_reposicion: values.metodo_reposicion,
                    arqueo_cierre: arqueoDesglose ? {
                        items: arqueoDesglose.items.map(i => ({
                            denominacion: i.denominacion,
                            cantidad: i.cantidad,
                            subtotal: Math.round(i.denominacion * i.cantidad * 100) / 100,
                        })),
                        total_contado: arqueoDesglose.total,
                    } : null,
                    numero_cheque: values.metodo_reposicion === 'cheque' ? values.numero_cheque_reposicion : null,
                    numero_referencia: values.metodo_reposicion === 'transferencia' ? values.numero_cheque_reposicion : null,
                    banco: values.banco_reposicion,
                    fecha_accion_cierre: new Date().toISOString()
                },
                user_id: user?.id,
                user_email: user?.email
            });

            return true;
        },
        onSuccess: () => {
            if (!caja) return;
            queryClient.invalidateQueries({ queryKey: ['caja', caja.id] });
            queryClient.invalidateQueries({ queryKey: ['cajas'] });
            notifications.show({
                title: 'Caja Cerrada',
                message: 'El cierre se ha registrado exitosamente con el arqueo verificado.',
                color: 'teal',
                icon: <IconCheck size={16} />,
            });
            onSuccess();
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

    if (!caja) return null;

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
                    <Text fw={700}>{readOnly ? 'Simulación de Cierre' : 'Cierre de Caja Definitivo'} #{caja.numero || caja.id}</Text>
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
                                        <Text size="sm" fw={600}>${caja.monto_inicial?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm" c="red.6">Total Gastos Netos:</Text>
                                        <Text size="sm" fw={600} c="red.6">-${totals.neto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm" c="red.6">Depósitos a Banco:</Text>
                                        <Text size="sm" fw={600} c="red.6">-${(totals.totalDepositos || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                    </Group>
                                    <Divider />
                                    <Group justify="space-between">
                                        <Text size="sm" fw={700}>Efectivo Final Esperado:</Text>
                                        <Text size="lg" fw={700} c="blue.9">
                                            ${efectivoEsperado.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </Text>
                                    </Group>

                                    <Paper withBorder p="xs" radius="md" bg="orange.0" className="border-orange-100" mt="xs">
                                        <Group gap="xs" justify="space-between">
                                            <Group gap="xs">
                                                <IconFileInvoice size={14} color="orange" />
                                                <Text size="xs" fw={700} c="orange.6" tt="uppercase">Retenciones Totales</Text>
                                            </Group>
                                            <Text size="sm" fw={700} c="orange.9">
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

                            {/* Método de Reposición */}
                            <Stack gap={4}>
                                <Text size="sm" fw={500}>Método de Reposición</Text>
                                <SegmentedControl
                                    color={metodo === 'transferencia' ? 'violet' : 'blue'}
                                    data={[
                                        {
                                            value: 'cheque',
                                            label: (
                                                <Group gap={6} justify="center" py={2}>
                                                    <IconBuildingBank size={15} />
                                                    <span>Cheque</span>
                                                </Group>
                                            )
                                        },
                                        {
                                            value: 'transferencia',
                                            label: (
                                                <Group gap={6} justify="center" py={2}>
                                                    <IconTransfer size={15} />
                                                    <span>Transferencia</span>
                                                </Group>
                                            )
                                        },
                                    ]}
                                    disabled={readOnly}
                                    styles={{
                                        root: { backgroundColor: 'var(--mantine-color-gray-1)', border: '1px solid var(--mantine-color-gray-3)' },
                                        label: { fontWeight: 500 },
                                    }}
                                    {...form.getInputProps('metodo_reposicion')}
                                />
                            </Stack>

                            <Group grow>
                                <Select
                                    label="Banco"
                                    placeholder="Seleccione banco"
                                    data={bancos}
                                    required
                                    searchable
                                    disabled={readOnly}
                                    {...form.getInputProps('banco_reposicion')}
                                />
                                <TextInput
                                    label={metodo === 'cheque' ? 'Número de Cheque' : 'N° de Referencia'}
                                    placeholder={metodo === 'cheque' ? 'Ej: CH-123456' : 'Ej: REF-789012'}
                                    required={metodo === 'cheque'}
                                    disabled={readOnly}
                                    {...form.getInputProps('numero_cheque_reposicion')}
                                />
                            </Group>

                            <Text size="xs" c="dimmed" fs="italic">
                                * Se emitirá una reposición por {metodo === 'cheque' ? 'cheque' : 'transferencia'} por el total neto de gastos (${totals.neto.toFixed(2)}).
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
