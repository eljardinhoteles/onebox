import dayjs from 'dayjs';
import { Paper, Text, Stack, Group, TextInput, Select, Divider, SegmentedControl, Alert, Textarea, Stepper, Button, Badge, Grid } from '@mantine/core';
import { AppModal } from '../ui/AppModal';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../lib/supabaseClient';
import { IconCheck, IconX, IconLock, IconFileInvoice, IconBuildingBank, IconTransfer, IconCircleOff, IconAlertCircle, IconNotes, IconCalendar, IconCreditCard } from '@tabler/icons-react';
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
        totalRetRecaudada?: number;
        totalRetPendiente?: number;
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
    const [activeStep, setActiveStep] = useState(0);

    const form = useForm({
        initialValues: {
            fecha_cierre: new Date(),
            metodo_reposicion: 'cheque' as 'cheque' | 'transferencia' | 'ninguna',
            numero_cheque_reposicion: '',
            banco_reposicion: '',
            observaciones: caja?.observaciones || '',
        },
        validate: {
            banco_reposicion: (value, values) =>
                values.metodo_reposicion !== 'ninguna' && !value ? 'Requerido para la reposición' : null,
            numero_cheque_reposicion: (value, values) =>
                values.metodo_reposicion === 'cheque' && !value ? 'Requerido para el cierre con cheque' : null,
        },
    });

    const metodo = form.values.metodo_reposicion;
    const efectivoEsperado = totals.efectivo;
    const arqueoTotal = arqueoDesglose?.total ?? 0;
    const arqueoConcuerda = Math.abs(arqueoTotal - efectivoEsperado) < 0.005;
    const tieneItemsArqueo = (arqueoDesglose?.items.length ?? 0) > 0;
    const esCierreDefinitivo = metodo === 'ninguna';
    const requiereDepositoParaCerrar = esCierreDefinitivo && efectivoEsperado > 0.005;
    const canSubmit = arqueoConcuerda && tieneItemsArqueo && !readOnly && !requiereDepositoParaCerrar;

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
                reposicion: values.metodo_reposicion === 'ninguna' ? 0 : totals.neto,
                metodo_reposicion: values.metodo_reposicion,
                numero_cheque_reposicion: values.metodo_reposicion === 'cheque' ? values.numero_cheque_reposicion : null,
                banco_reposicion: values.metodo_reposicion !== 'ninguna' ? values.banco_reposicion : null,
                observaciones: values.observaciones,
            };

            const { error: updateError } = await supabase
                .from('cajas')
                .update(payload)
                .eq('id', caja.id);

            if (updateError) throw updateError;

            await supabase.from('bitacora').insert({
                accion: 'CIERRE_CAJA',
                detalle: {
                    caja_id: caja.id,
                    numero_caja: caja.numero || caja.id,
                    sucursal: caja.sucursal,
                    monto_inicial: caja.monto_inicial,
                    gastos_netos: totals.neto,
                    efectivo_esperado: efectivoEsperado,
                    metodo_reposicion: values.metodo_reposicion,
                    observaciones: values.observaciones,
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
                    banco: values.metodo_reposicion !== 'ninguna' ? values.banco_reposicion : null,
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
            setActiveStep(0);
            form.reset();
            setArqueoDesglose(null);
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

    const handleClose = () => {
        setActiveStep(0);
        form.reset();
        setArqueoDesglose(null);
        close();
    };

    const canGoToStep2 = arqueoConcuerda && tieneItemsArqueo;

    const metodoColor = metodo === 'transferencia' ? 'violet' : metodo === 'ninguna' ? 'red' : 'blue';
    const metodoLabel = metodo === 'cheque' ? 'Cheque' : metodo === 'transferencia' ? 'Transferencia' : 'Sin Reposición';

    return (
        <AppModal
            opened={opened}
            onClose={handleClose}
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
            <form onSubmit={form.onSubmit((values) => { if (canSubmit) closeCajaMutation.mutate(values); })}>
                {readOnly && (
                    <Paper withBorder p="sm" bg="blue.0" c="blue.9" mb="md">
                        <Group gap="xs">
                            <Text size="xs" fw={700}>ℹ️ MODO LECTURA:</Text>
                            <Text size="xs">Está viendo una simulación. Los datos no se guardarán.</Text>
                        </Group>
                    </Paper>
                )}

                <Stepper active={activeStep} size="sm" mb="xl" color="teal">
                    <Stepper.Step label="Arqueo" description="Conteo físico">
                        {/* ── PASO 1: Resumen + Arqueo (2 columnas) ── */}
                        <Grid gutter="xl" mt="md">
                            {/* Columna izquierda: resumen financiero */}
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
                                            {(totals.totalRetPendiente || 0) > 0 && (
                                                <Paper withBorder p="xs" radius="md" bg="red.0" mt="xs">
                                                    <Group gap="xs" justify="space-between">
                                                        <Text size="xs" fw={700} c="red.7" tt="uppercase">⚠ Retenciones Pendientes</Text>
                                                        <Text size="sm" fw={700} c="red.7">-${(totals.totalRetPendiente || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                                    </Group>
                                                    <Text size="xs" c="red.6" mt={2}>Retenciones no recaudadas = faltante de efectivo. Recáudalas antes del cierre.</Text>
                                                </Paper>
                                            )}
                                            <Paper withBorder p="xs" radius="md" bg="orange.0" mt="xs">
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
                                </Stack>
                            </Grid.Col>

                            {/* Columna derecha: arqueo de denominaciones */}
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <Stack gap="md">
                                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">Conteo Físico (Arqueo)</Text>
                                    <ArqueoDenominaciones
                                        montoEsperado={efectivoEsperado}
                                        onChange={setArqueoDesglose}
                                    />
                                </Stack>
                            </Grid.Col>
                        </Grid>

                        {/* Botones paso 1 */}
                        <Group justify="space-between" mt="lg">
                            <Button variant="subtle" color="gray" onClick={handleClose}>Cancelar</Button>
                            <Button
                                color="teal"
                                rightSection={<IconCheck size={16} />}
                                onClick={() => setActiveStep(1)}
                                disabled={!canGoToStep2}
                            >
                                {!tieneItemsArqueo
                                    ? 'Ingrese el arqueo para continuar'
                                    : !arqueoConcuerda
                                        ? `Diferencia: $${Math.abs(arqueoTotal - efectivoEsperado).toFixed(2)}`
                                        : 'Siguiente: Reposición'
                                }
                            </Button>
                        </Group>
                    </Stepper.Step>

                    <Stepper.Step label="Reposición" description="Método de pago">
                        {/* ── PASO 2: Fecha + Método ── */}
                        <Stack gap="md" mt="md">
                            <DatePickerInput
                                label="Fecha de Cierre"
                                placeholder="Seleccione la fecha"
                                locale="es"
                                required
                                maxDate={new Date()}
                                allowDeselect={false}
                                leftSection={<IconCalendar size={16} stroke={1.5} />}
                                disabled={readOnly}
                                {...form.getInputProps('fecha_cierre')}
                            />

                            <Stack gap={4}>
                                <Text size="sm" fw={500}>Método de Reposición</Text>
                                <SegmentedControl
                                    color={metodoColor}
                                    data={[
                                        {
                                            value: 'cheque',
                                            label: (
                                                <Stack gap={2} align="center" py={4}>
                                                    <IconBuildingBank size={18} />
                                                    <Text size="xs" fw={600}>Cheque</Text>
                                                </Stack>
                                            )
                                        },
                                        {
                                            value: 'transferencia',
                                            label: (
                                                <Stack gap={2} align="center" py={4}>
                                                    <IconTransfer size={18} />
                                                    <Text size="xs" fw={600}>Transfer</Text>
                                                </Stack>
                                            )
                                        },
                                        {
                                            value: 'ninguna',
                                            label: (
                                                <Stack gap={2} align="center" py={4}>
                                                    <IconCircleOff size={18} />
                                                    <Text size="xs" fw={600}>Ninguna</Text>
                                                </Stack>
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

                            {metodo !== 'ninguna' ? (
                                <Group grow>
                                    <Select
                                        label="Banco"
                                        placeholder="Seleccione banco"
                                        data={bancos}
                                        required
                                        searchable
                                        leftSection={<IconCreditCard size={16} stroke={1.5} />}
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
                            ) : (
                                <Stack gap="xs">
                                    {requiereDepositoParaCerrar ? (
                                        <Alert variant="light" color="red" title="Cierre Definitivo Bloqueado" icon={<IconAlertCircle size={16} />}>
                                            Todo el efectivo debe ser depositado antes de cerrar sin reposición.
                                            <Text mt="xs" fw={700} size="sm">Saldo pendiente: ${efectivoEsperado.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                        </Alert>
                                    ) : (
                                        <Alert variant="light" color="blue" icon={<IconAlertCircle size={16} />}>
                                            Esta caja se cerrará definitivamente sin generar reposición de efectivo.
                                        </Alert>
                                    )}
                                </Stack>
                            )}

                            <Text size="xs" c="dimmed" fs="italic">
                                {metodo === 'ninguna'
                                    ? '* Esta caja no recibirá reposición de efectivo tras el cierre.'
                                    : `* Se emitirá una reposición por ${metodo === 'cheque' ? 'cheque' : 'transferencia'} por $${totals.neto.toFixed(2)}.`
                                }
                            </Text>

                            {/* Botones paso 2 */}
                            <Group justify="space-between" mt="sm">
                                <Button variant="subtle" color="gray" onClick={() => setActiveStep(0)}>← Volver</Button>
                                <Button
                                    color="teal"
                                    rightSection={<IconCheck size={16} />}
                                    onClick={() => {
                                        const result = form.validate();
                                        if (!result.hasErrors) setActiveStep(2);
                                    }}
                                    disabled={requiereDepositoParaCerrar}
                                >
                                    Siguiente: Confirmación
                                </Button>
                            </Group>
                        </Stack>
                    </Stepper.Step>

                    <Stepper.Step label="Confirmación" description="Revisar y cerrar">
                        {/* ── PASO 3: Observaciones + Confirmación ── */}
                        <Stack gap="md" mt="md">
                            {/* Resumen compacto */}
                            <Paper withBorder p="md" radius="md" bg="teal.0">
                                <Text size="xs" fw={700} tt="uppercase" c="teal.8" mb="xs">Resumen del Cierre</Text>
                                <Group gap="md" wrap="wrap">
                                    <Stack gap={2}>
                                        <Text size="xs" c="dimmed">Efectivo Final</Text>
                                        <Text fw={700} c="teal.9">${efectivoEsperado.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                    </Stack>
                                    <Stack gap={2}>
                                        <Text size="xs" c="dimmed">Fecha</Text>
                                        <Text fw={700}>{dayjs(form.values.fecha_cierre).format('DD/MM/YYYY')}</Text>
                                    </Stack>
                                    <Stack gap={2}>
                                        <Text size="xs" c="dimmed">Reposición</Text>
                                        <Badge variant="light" color={metodoColor}>{metodoLabel}</Badge>
                                    </Stack>
                                    {metodo !== 'ninguna' && form.values.banco_reposicion && (
                                        <Stack gap={2}>
                                            <Text size="xs" c="dimmed">Banco</Text>
                                            <Text fw={700}>{form.values.banco_reposicion}</Text>
                                        </Stack>
                                    )}
                                    {metodo !== 'ninguna' && form.values.numero_cheque_reposicion && (
                                        <Stack gap={2}>
                                            <Text size="xs" c="dimmed">{metodo === 'cheque' ? 'N° Cheque' : 'N° Referencia'}</Text>
                                            <Text fw={700}>{form.values.numero_cheque_reposicion}</Text>
                                        </Stack>
                                    )}
                                </Group>
                            </Paper>

                            <Textarea
                                label="Observaciones del Cierre (opcional)"
                                placeholder="Ingrese notas o detalles relevantes del cierre de esta caja..."
                                minRows={3}
                                maxRows={5}
                                leftSection={<IconNotes size={18} stroke={1.5} />}
                                leftSectionProps={{ style: { alignItems: 'flex-start', paddingTop: '8px' } }}
                                disabled={readOnly}
                                {...form.getInputProps('observaciones')}
                            />

                            {/* Botones paso 3 */}
                            <Group justify="space-between" mt="sm">
                                <Button variant="subtle" color="gray" onClick={() => setActiveStep(1)}>← Volver</Button>
                                {!readOnly && (
                                    <Button
                                        type="submit"
                                        color="red"
                                        loading={closeCajaMutation.isPending}
                                        disabled={!canSubmit}
                                        leftSection={<IconLock size={16} />}
                                    >
                                        Confirmar y Cerrar Caja
                                    </Button>
                                )}
                            </Group>
                        </Stack>
                    </Stepper.Step>
                </Stepper>
            </form >
        </AppModal >
    );
}
