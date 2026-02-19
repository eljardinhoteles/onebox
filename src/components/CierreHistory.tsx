import { useState, useEffect } from 'react';
import { Table, Text, Badge, ScrollArea, Group, LoadingOverlay, Paper, Title, Avatar } from '@mantine/core';
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
                    id, fecha_cierre, monto_inicial, reposicion, numero_cheque_reposicion, banco_reposicion, responsable,
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
                <LoadingOverlay visible={loading} overlayProps={{ blur: 1, radius: 'md' }} />

                <ScrollArea h={500}>
                    <Table striped highlightOnHover verticalSpacing="sm">
                        <Table.Thead bg="gray.0" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                            <Table.Tr>
                                <Table.Th>Fecha Cierre</Table.Th>
                                <Table.Th>Responsable</Table.Th>
                                <Table.Th ta="right">Monto Inicial</Table.Th>
                                <Table.Th ta="right">Total Gastos (Neto)</Table.Th>
                                <Table.Th>Reposición (Cheque)</Table.Th>
                                <Table.Th>Banco</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {history.map((item) => (
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
                                        <Text fw={700} c="red.6">
                                            -${item.reposicion?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        {item.numero_cheque_reposicion ? (
                                            <Badge variant="outline" color="blue" size="sm">
                                                {item.numero_cheque_reposicion}
                                            </Badge>
                                        ) : (
                                            <Text size="xs" c="dimmed">-</Text>
                                        )}
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm">{item.banco_reposicion || '-'}</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                            {!loading && history.length === 0 && (
                                <Table.Tr>
                                    <Table.Td colSpan={6} ta="center" py="xl" c="dimmed">
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
