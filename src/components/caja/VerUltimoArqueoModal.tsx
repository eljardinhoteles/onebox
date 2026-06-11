import { Modal, Text, Stack, Group, Table, Divider, Badge, Paper, Grid } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { AppLoader } from '../ui/AppLoader';
import { IconCash, IconCalendar, IconUser, IconAlertTriangle, IconNotes } from '@tabler/icons-react';
import dayjs from 'dayjs';

interface VerUltimoArqueoModalProps {
    opened: boolean;
    onClose: () => void;
    cajaId: number;
    cajaNumero?: number;
}

export function VerUltimoArqueoModal({ opened, onClose, cajaId, cajaNumero }: VerUltimoArqueoModalProps) {
    const { data: ultimoArqueo, isLoading } = useQuery({
        queryKey: ['ultimo_arqueo', cajaId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bitacora')
                .select('*')
                .in('accion', ['ARQUEO_CONTROL', 'CIERRE_CAJA'])
                .filter('detalle->>caja_id', 'eq', cajaId.toString())
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;
            return data && data.length > 0 ? data[0] : null;
        },
        enabled: opened,
    });

    const renderContenido = () => {
        if (isLoading) {
            return <AppLoader py={40} message="Cargando último arqueo..." />;
        }

        if (!ultimoArqueo) {
            return (
                <Paper p="xl" withBorder radius="md" bg="gray.0" ta="center">
                    <Stack align="center" gap="sm">
                        <IconAlertTriangle size={36} className="text-gray-400" />
                        <Text fw={600} size="sm" c="dimmed">
                            No hay arqueos disponibles registrados para esta caja.
                        </Text>
                    </Stack>
                </Paper>
            );
        }

        const detalle = ultimoArqueo.detalle;
        const esCierre = ultimoArqueo.accion === 'CIERRE_CAJA';
        const arqueoInfo = esCierre ? detalle?.arqueo_cierre : detalle?.arqueo;
        const items = arqueoInfo?.items || [];
        const totalContado = arqueoInfo?.total_contado || 0;
        const efectivoEsperado = detalle?.efectivo_esperado || 0;
        const diferencia = esCierre ? (totalContado - efectivoEsperado) : (detalle?.diferencia || 0);
        const observaciones = esCierre ? detalle?.observaciones : detalle?.observacion;
        const fecha = esCierre 
            ? (detalle?.fecha_accion_cierre || ultimoArqueo.created_at) 
            : (detalle?.fecha_arqueo || ultimoArqueo.created_at);

        return (
            <Stack gap="md">
                <Paper withBorder p="md" radius="md" bg="teal.0">
                    <Grid gutter="xs">
                        <Grid.Col span={{ base: 12, sm: 6 }}>
                            <Stack gap={4}>
                                <Group gap={6}>
                                    <IconCalendar size={14} className="text-teal-600" />
                                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">Fecha y Hora</Text>
                                </Group>
                                <Text size="sm" fw={600}>{dayjs(fecha).format('DD/MM/YYYY HH:mm:ss')}</Text>
                            </Stack>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 6 }}>
                            <Stack gap={4}>
                                <Group gap={6}>
                                    <IconUser size={14} className="text-teal-600" />
                                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">Realizado por</Text>
                                </Group>
                                <Text size="sm" fw={600} lineClamp={1}>{ultimoArqueo.user_email || 'Desconocido'}</Text>
                            </Stack>
                        </Grid.Col>
                    </Grid>
                </Paper>

                <Group justify="space-between">
                    <Text size="sm" fw={700} tt="uppercase" c="dimmed">Detalle de Conteo</Text>
                    <Badge color={esCierre ? 'indigo' : 'teal'} variant="light">
                        {esCierre ? 'ARQUEO DE CIERRE' : 'ARQUEO DE CONTROL'}
                    </Badge>
                </Group>

                {items.length === 0 ? (
                    <Text size="xs" c="dimmed" ta="center" py="md">Sin desglose de monedas/billetes</Text>
                ) : (
                    <Table withTableBorder withColumnBorders verticalSpacing="xs">
                        <Table.Thead bg="gray.0">
                            <Table.Tr>
                                <Table.Th>Denominación</Table.Th>
                                <Table.Th ta="center">Cantidad</Table.Th>
                                <Table.Th ta="right">Total</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {items.map((item: any, idx: number) => (
                                <Table.Tr key={idx}>
                                    <Table.Td>
                                        {item.denominacion >= 1 ? `$${item.denominacion}` : `${(item.denominacion * 100).toFixed(0)} ctvs`}
                                    </Table.Td>
                                    <Table.Td ta="center">{item.cantidad}</Table.Td>
                                    <Table.Td ta="right">${Number(item.subtotal || 0).toFixed(2)}</Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                )}

                <Paper withBorder p="md" radius="md" bg="gray.0">
                    <Stack gap="xs">
                        <Group justify="space-between">
                            <Text size="sm">Total Contado:</Text>
                            <Text size="sm" fw={700}>${totalContado.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                        </Group>
                        <Group justify="space-between">
                            <Text size="sm">Efectivo Esperado:</Text>
                            <Text size="sm" fw={700}>${efectivoEsperado.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                        </Group>
                        <Divider />
                        <Group justify="space-between" align="center">
                            <Text size="sm" fw={700}>Diferencia:</Text>
                            <Badge 
                                color={diferencia === 0 ? 'teal' : (diferencia > 0 ? 'orange' : 'red')} 
                                variant="light" 
                                size="lg"
                            >
                                {diferencia === 0 
                                    ? 'Cuadra perfectamente' 
                                    : (diferencia > 0 ? `Sobrante: +$${diferencia.toFixed(2)}` : `Faltante: -$${Math.abs(diferencia).toFixed(2)}`)}
                            </Badge>
                        </Group>
                    </Stack>
                </Paper>

                {observaciones && (
                    <Stack gap={4}>
                        <Group gap={6}>
                            <IconNotes size={14} className="text-gray-500" />
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Observaciones</Text>
                        </Group>
                        <Paper withBorder p="xs" radius="sm" bg="gray.0" style={{ borderStyle: 'dashed' }}>
                            <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>{observaciones}</Text>
                        </Paper>
                    </Stack>
                )}
            </Stack>
        );
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <IconCash size={20} className="text-teal-600" />
                    <Text fw={700}>Último Arqueo — Caja #{cajaNumero || cajaId}</Text>
                </Group>
            }
            centered
            size="md"
        >
            {renderContenido()}
        </Modal>
    );
}
