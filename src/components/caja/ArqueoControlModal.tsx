import { useState } from 'react';
import { Text, Stack, Group, Paper, Divider, Badge, Textarea, Grid } from '@mantine/core';
import { AppModal } from '../ui/AppModal';
import { AppActionButtons } from '../ui/AppActionButtons';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../lib/supabaseClient';
import { IconCheck, IconX, IconCash } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArqueoDenominaciones, type ArqueoDesglose } from './ArqueoDenominaciones';
import dayjs from 'dayjs';

interface ArqueoControlModalProps {
    opened: boolean;
    onClose: () => void;
    cajaId: number;
    cajaNumero?: number;
    sucursal?: string;
    efectivoEsperado: number;
}

export function ArqueoControlModal({ opened, onClose, cajaId, cajaNumero, sucursal, efectivoEsperado }: ArqueoControlModalProps) {
    const queryClient = useQueryClient();
    const [arqueoDesglose, setArqueoDesglose] = useState<ArqueoDesglose | null>(null);
    const [observacion, setObservacion] = useState('');

    const arqueoTotal = arqueoDesglose?.total ?? 0;
    const diferencia = Math.round((arqueoTotal - efectivoEsperado) * 100) / 100;
    const tieneItems = (arqueoDesglose?.items.length ?? 0) > 0;

    const registrarArqueoMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase.from('bitacora').insert({
                accion: 'ARQUEO_CONTROL',
                detalle: {
                    caja_id: cajaId,
                    sucursal,
                    efectivo_esperado: efectivoEsperado,
                    arqueo: {
                        items: arqueoDesglose?.items.map(i => ({
                            denominacion: i.denominacion,
                            cantidad: i.cantidad,
                            subtotal: Math.round(i.denominacion * i.cantidad * 100) / 100,
                        })),
                        total_contado: arqueoTotal,
                    },
                    diferencia,
                    coincide: diferencia === 0,
                    observacion: observacion || null,
                    fecha_arqueo: new Date().toISOString(),
                },
                user_id: user?.id,
                user_email: user?.email,
            });

            if (error) throw error;
        },
        onSuccess: () => {
            notifications.show({
                title: 'Arqueo Registrado',
                message: `Conteo de efectivo registrado exitosamente (${dayjs().format('HH:mm')})`,
                color: 'teal',
                icon: <IconCheck size={16} />,
            });
            queryClient.invalidateQueries({ queryKey: ['arqueos_control', cajaId] });
            handleClose();
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error.message || 'No se pudo registrar el arqueo',
                color: 'red',
                icon: <IconX size={16} />,
            });
        },
    });

    const handleClose = () => {
        setArqueoDesglose(null);
        setObservacion('');
        onClose();
    };

    return (
        <AppModal
            opened={opened}
            onClose={handleClose}
            title={
                <Group gap="xs">
                    <IconCash size={20} color="teal" />
                    <Text fw={700}>Arqueo de Control</Text>
                </Group>
            }
            loading={registrarArqueoMutation.isPending}
            size="xl"
            closeOnClickOutside={false}
        >
            <form onSubmit={(e) => { e.preventDefault(); registrarArqueoMutation.mutate(); }}>
                <Grid gutter="xl">
                    {/* Columna Izquierda: Conteo Físico */}
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <Stack gap="md">
                            <ArqueoDenominaciones
                                montoEsperado={efectivoEsperado}
                                onChange={setArqueoDesglose}
                            />
                        </Stack>
                    </Grid.Col>

                    {/* Columna Derecha: Resumen y Observaciones */}
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <Stack gap="md">
                            <Paper withBorder p="md" radius="md" bg="gray.0">
                                <Stack gap="xs">
                                    <Group justify="space-between">
                                        <Text size="sm" c="dimmed">Sucursal:</Text>
                                        <Text size="sm" fw={600}>{sucursal || '---'}</Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm" c="dimmed">Caja:</Text>
                                        <Text size="sm" fw={600}>#{cajaNumero || cajaId}</Text>
                                    </Group>
                                    <Divider />
                                    <Group justify="space-between">
                                        <Text size="sm" fw={700}>Efectivo Esperado:</Text>
                                        <Text size="lg" fw={800} c="teal.9">
                                            ${efectivoEsperado.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </Text>
                                    </Group>
                                </Stack>
                            </Paper>

                            {tieneItems && diferencia !== 0 && (
                                <Paper withBorder p="xs" radius="md" bg={diferencia > 0 ? 'orange.0' : 'red.0'}>
                                    <Group justify="space-between">
                                        <Badge color={diferencia > 0 ? 'orange' : 'red'} variant="light" size="lg">
                                            {diferencia > 0 ? `Sobrante: $${diferencia.toFixed(2)}` : `Faltante: $${Math.abs(diferencia).toFixed(2)}`}
                                        </Badge>
                                        <Text size="xs" c="dimmed">Se registrará la diferencia</Text>
                                    </Group>
                                </Paper>
                            )}

                            {tieneItems && diferencia === 0 && (
                                <Paper withBorder p="xs" radius="md" bg="teal.0">
                                    <Group justify="center">
                                        <Badge color="teal" variant="light" size="lg">✓ El conteo coincide con el efectivo esperado</Badge>
                                    </Group>
                                </Paper>
                            )}

                            <Textarea
                                label="Observaciones (opcional)"
                                placeholder="Notas adicionales sobre el conteo..."
                                value={observacion}
                                onChange={(e) => setObservacion(e.currentTarget.value)}
                                autosize
                                minRows={3}
                                maxRows={5}
                            />
                        </Stack>
                    </Grid.Col>
                </Grid>

                <Divider my="md" />

                <Text size="xs" c="dimmed" ta="center" mb="xs">
                    Solo control: Este conteo no afecta el saldo de la caja.
                </Text>

                <AppActionButtons
                    onCancel={handleClose}
                    loading={registrarArqueoMutation.isPending}
                    showSubmit={tieneItems}
                    submitLabel={tieneItems ? '✓ Registrar Conteo' : 'Contar Efectivo Primero'}
                />
            </form>
        </AppModal>
    );
}
