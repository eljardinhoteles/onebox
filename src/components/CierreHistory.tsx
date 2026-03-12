import { useState, useEffect } from 'react';
import { Table, Text, Badge, ScrollArea, Group, Paper, Title, Avatar } from '@mantine/core';
import { AppLoader } from './ui/AppLoader';
import { IconBuildingBank, IconTransfer, IconCircleOff } from '@tabler/icons-react';
import { supabase } from '../lib/supabaseClient';
import dayjs from 'dayjs';

interface CierreHistoryProps {
    empresaId?: string;
}

export function CierreHistory({ empresaId }: CierreHistoryProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('cajas')
                .select(`
                    id, fecha_cierre, monto_inicial, reposicion,
                    numero_cheque_reposicion, banco_reposicion,
                    metodo_reposicion, responsable,
                    datos_cierre, empresa_id
                `)
                .eq('estado', 'cerrada');

            if (empresaId) {
                query = query.eq('empresa_id', empresaId);
            }

            const { data, error } = await query.order('fecha_cierre', { ascending: false });

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    return (
        <Paper withBorder radius="md" p="md" bg="white" shadow="sm">
            <Group justify="space-between" mb="md">
                <Title order={3} size="h4" fw={700}>Historial de Cierres y Reposiciones</Title>
                <Badge variant="light" color="gray">{history.length} registros</Badge>
            </Group>

            <div style={{ position: 'relative', minHeight: '200px' }}>
                {loading && <AppLoader py={80} message="Cargando historial..." />}

                <ScrollArea h={500}>
                    <Table striped highlightOnHover verticalSpacing="sm">
                        <Table.Thead bg="gray.0" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                            <Table.Tr>
                                <Table.Th>Fecha Cierre</Table.Th>
                                <Table.Th>Responsable</Table.Th>
                                <Table.Th ta="right">Monto Inicial</Table.Th>
                                <Table.Th ta="right">Total Gastos (Neto)</Table.Th>
                                <Table.Th>Método</Table.Th>
                                <Table.Th>Referencia / Cheque</Table.Th>
                                <Table.Th>Banco</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {history.map((item) => {
                                const metodo = item.metodo_reposicion || 'cheque';
                                const esTransferencia = metodo === 'transferencia';
                                const esNinguna = metodo === 'ninguna';

                                return (
                                    <Table.Tr key={item.id}>
                                        <Table.Td>{dayjs(item.fecha_cierre).format('DD/MM/YYYY HH:mm')}</Table.Td>
                                        <Table.Td>
                                            <Group gap="xs">
                                                <Avatar size="sm" radius="xl" color="blue" variant="light">
                                                    {item.responsable?.charAt(0).toUpperCase()}
                                                </Avatar>
                                                <Text size="sm">{item.responsable || 'Desconocido'}</Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td ta="right">${item.monto_inicial?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Table.Td>
                                        <Table.Td ta="right">
                                            <Text fw={700} c={esNinguna ? 'dimmed' : 'red.6'}>
                                                {esNinguna ? '$0.00' : `-$${item.reposicion?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                variant="light"
                                                color={esNinguna ? 'gray' : (esTransferencia ? 'violet' : 'blue')}
                                                size="sm"
                                                leftSection={esNinguna
                                                    ? <IconCircleOff size={11} />
                                                    : (esTransferencia ? <IconTransfer size={11} /> : <IconBuildingBank size={11} />)
                                                }
                                            >
                                                {esNinguna ? 'Ninguna' : (esTransferencia ? 'Transfer' : 'Cheque')}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            {item.numero_cheque_reposicion ? (
                                                <Badge variant="outline" color={esTransferencia ? 'violet' : 'blue'} size="sm">
                                                    {item.numero_cheque_reposicion}
                                                </Badge>
                                            ) : (
                                                <Text size="xs" c="dimmed">{esNinguna ? 'Cierre Final' : '-'}</Text>
                                            )}
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{item.banco_reposicion || '-'}</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                );
                            })}
                            {!loading && history.length === 0 && (
                                <Table.Tr>
                                    <Table.Td colSpan={7} ta="center" py="xl" c="dimmed">
                                        No hay cierres registrados.
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            </div>
        </Paper>
    );
}
