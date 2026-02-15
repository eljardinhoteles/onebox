import { Table, Text, Stack, Group, Checkbox, Button, Title, Paper, Badge } from '@mantine/core';
import { IconPrinter, IconX } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { AppDrawer } from '../ui/AppDrawer';
import { notifications } from '@mantine/notifications';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import dayjs from 'dayjs';

interface RetencionesRecaudacionDrawerProps {
    opened: boolean;
    onClose: () => void;
    cajaId: number;
    sucursal?: string;
}

interface RetencioData {
    id: number;
    transaction_id: number;
    numero_factura: string;
    proveedor: string;
    ruc: string;
    numero_retencion: string;
    total_retenido: number;
    fecha_retencion: string;
    recaudada: boolean;
}

export function RetencionesRecaudacionDrawer({ opened, onClose, cajaId, sucursal }: RetencionesRecaudacionDrawerProps) {
    const queryClient = useQueryClient();
    const printRef = useRef<HTMLDivElement>(null);

    const { data: retenciones = [], isLoading } = useQuery<RetencioData[]>({
        queryKey: ['retenciones_recaudacion', cajaId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('transacciones')
                .select(`
                    id, 
                    numero_factura,
                    proveedor:proveedores (nombre, ruc),
                    retencion:retenciones (
                        id, 
                        numero_retencion, 
                        total_retenido, 
                        fecha_retencion,
                        recaudada
                    )
                `)
                .eq('caja_id', cajaId);

            if (error) throw error;

            // Filtrar y aplanar los datos para facilitar su uso
            return (data || [])
                .filter((t: any) => {
                    const ret = Array.isArray(t.retencion) ? t.retencion[0] : t.retencion;
                    return !!ret;
                })
                .map((t: any) => {
                    const ret = Array.isArray(t.retencion) ? t.retencion[0] : t.retencion;
                    const prov = Array.isArray(t.proveedor) ? t.proveedor[0] : t.proveedor;

                    return {
                        id: ret.id,
                        transaction_id: t.id,
                        numero_factura: t.numero_factura,
                        proveedor: prov?.nombre || 'Gasto General',
                        ruc: prov?.ruc || '---',
                        numero_retencion: ret.numero_retencion,
                        total_retenido: Number(ret.total_retenido),
                        fecha_retencion: ret.fecha_retencion,
                        recaudada: ret.recaudada || false
                    };
                })
                .filter(Boolean)
                .sort((a: any, b: any) => dayjs(b.fecha_retencion).unix() - dayjs(a.fecha_retencion).unix()) as RetencioData[];
        },
        enabled: opened
    });

    const toggleRecaudadaMutation = useMutation({
        mutationFn: async ({ id, value }: { id: number; value: boolean }) => {
            const { error } = await supabase
                .from('retenciones')
                .update({ recaudada: value })
                .eq('id', id);

            if (error) throw error;
        },
        onMutate: async ({ id, value }) => {
            // Cancelar queries en curso para evitar sobreescritura
            await queryClient.cancelQueries({ queryKey: ['retenciones_recaudacion', cajaId] });

            // Guardar snapshot anterior para rollback
            const previous = queryClient.getQueryData<RetencioData[]>(['retenciones_recaudacion', cajaId]);

            // Actualización optimista instantánea
            queryClient.setQueryData<RetencioData[]>(['retenciones_recaudacion', cajaId], (old) =>
                old?.map(r => r.id === id ? { ...r, recaudada: value } : r) ?? []
            );

            return { previous };
        },
        onError: (error: any, _vars, context) => {
            // Rollback al estado anterior si falla
            if (context?.previous) {
                queryClient.setQueryData(['retenciones_recaudacion', cajaId], context.previous);
            }
            notifications.show({
                title: 'Error',
                message: error.message || 'No se pudo actualizar el estado',
                color: 'red',
                icon: <IconX size={16} />
            });
        },
        onSettled: () => {
            // Re-sincronizar con el servidor después de la operación
            queryClient.invalidateQueries({ queryKey: ['retenciones_recaudacion', cajaId] });
            queryClient.invalidateQueries({ queryKey: ['transactions', cajaId] });
        }
    });

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Recaudacion-Retenciones-Caja-${cajaId}`,
    });

    const totalPendiente = retenciones
        .filter(r => !r.recaudada)
        .reduce((sum, r) => sum + Number(r.total_retenido), 0);

    const totalRecaudado = retenciones
        .filter(r => r.recaudada)
        .reduce((sum, r) => sum + Number(r.total_retenido), 0);

    return (
        <AppDrawer
            opened={opened}
            onClose={onClose}
            title="Control de Recaudación de Retenciones"
            size="xl"
            closeOnClickOutside={false}
        >
            <Stack gap="md">
                <Group justify="space-between" align="flex-end">
                    <Stack gap={0}>
                        <Text size="sm" c="dimmed">Sucursal: <Text span fw={700} c="dark">{sucursal || '---'}</Text></Text>
                        <Text size="sm" c="dimmed">ID Caja: <Text span fw={700} c="dark">#{cajaId}</Text></Text>
                    </Stack>
                    <Button
                        variant="light"
                        leftSection={<IconPrinter size={18} />}
                        onClick={() => handlePrint()}
                        disabled={retenciones.length === 0}
                    >
                        Imprimir Lista Control
                    </Button>
                </Group>

                <Group grow>
                    <Paper withBorder p="xs" radius="md" bg="orange.0">
                        <Stack gap={0} align="center">
                            <Text size="xs" fw={700} c="orange.9">PENDIENTES</Text>
                            <Text size="lg" fw={800} c="orange.9">${totalPendiente.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                        </Stack>
                    </Paper>
                    <Paper withBorder p="xs" radius="md" bg="teal.0">
                        <Stack gap={0} align="center">
                            <Text size="xs" fw={700} c="teal.9">RECAUDADAS</Text>
                            <Text size="lg" fw={800} c="teal.9">${totalRecaudado.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                        </Stack>
                    </Paper>
                </Group>

                <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                    <Table verticalSpacing="sm" highlightOnHover>
                        <Table.Thead bg="gray.0">
                            <Table.Tr>
                                <Table.Th w={50} ta="center"></Table.Th>
                                <Table.Th>Proveedor / Retención</Table.Th>
                                <Table.Th ta="right" w={120}>Monto</Table.Th>
                                <Table.Th ta="center" w={100}>Estado</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {isLoading ? (
                                <Table.Tr><Table.Td colSpan={4} ta="center" py="xl"><Text c="dimmed">Cargando retenciones...</Text></Table.Td></Table.Tr>
                            ) : retenciones.length === 0 ? (
                                <Table.Tr><Table.Td colSpan={4} ta="center" py="xl"><Text c="dimmed">No hay retenciones en esta caja</Text></Table.Td></Table.Tr>
                            ) : (
                                retenciones.map((ret: any) => (
                                    <Table.Tr key={ret.id} bg={ret.recaudada ? 'teal.0' : undefined}>
                                        <Table.Td ta="center">
                                            <Checkbox
                                                checked={ret.recaudada}
                                                onChange={(e) => toggleRecaudadaMutation.mutate({ id: ret.id, value: e.currentTarget.checked })}
                                                color="teal"
                                                styles={{ input: { cursor: 'pointer' } }}
                                            />
                                        </Table.Td>
                                        <Table.Td>
                                            <Stack gap={0}>
                                                <Text size="sm" fw={700}>{ret.proveedor}</Text>
                                                <Group gap="xs">
                                                    <Text size="xs" c="dimmed">#{ret.numero_retencion}</Text>
                                                    <Text size="xs" c="dimmed">·</Text>
                                                    <Text size="xs" c="dimmed">{dayjs(ret.fecha_retencion).format('DD/MM/YYYY')}</Text>
                                                </Group>
                                            </Stack>
                                        </Table.Td>
                                        <Table.Td ta="right">
                                            <Text size="sm" fw={700}>${ret.total_retenido.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                        </Table.Td>
                                        <Table.Td ta="center">
                                            <Badge
                                                color={ret.recaudada ? 'teal' : 'orange'}
                                                variant="light"
                                                size="xs"
                                            >
                                                {ret.recaudada ? 'RECAUDADA' : 'PENDIENTE'}
                                            </Badge>
                                        </Table.Td>
                                    </Table.Tr>
                                ))
                            )}
                        </Table.Tbody>
                    </Table>
                </Paper>
            </Stack>

            {/* Versión para Impresión (Oculta en pantalla) */}
            <div style={{ display: 'none' }}>
                <div ref={printRef} style={{ padding: '40px', fontFamily: 'sans-serif' }}>
                    <Group justify="space-between" mb="xl">
                        <Stack gap={4}>
                            <Title order={3}>CONTROL DE RECAUDACIÓN DE RETENCIONES</Title>
                            <Text size="sm" fw={700}>Sucursal: {sucursal} | Caja #{cajaId}</Text>
                        </Stack>
                        <Stack gap={0} align="flex-end">
                            <Text size="xs" fw={700}>FECHA IMPRESIÓN</Text>
                            <Text size="xs">{dayjs().format('DD/MM/YYYY HH:mm')}</Text>
                        </Stack>
                    </Group>

                    <Table withTableBorder withColumnBorders verticalSpacing="xs">
                        <Table.Thead>
                            <Table.Tr bg="gray.1">
                                <Table.Th w={40} ta="center">V</Table.Th>
                                <Table.Th>Proveedor</Table.Th>
                                <Table.Th w={150}>Número Retención</Table.Th>
                                <Table.Th w={100} ta="center">Fecha</Table.Th>
                                <Table.Th w={100} ta="right">Monto</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {retenciones.map((ret: any) => (
                                <Table.Tr key={ret.id}>
                                    <Table.Td ta="center">
                                        <div style={{ border: '1px solid black', width: '14px', height: '14px', margin: 'auto' }}>
                                            {ret.recaudada ? 'X' : ''}
                                        </div>
                                    </Table.Td>
                                    <Table.Td><Text size="xs">{ret.proveedor}</Text></Table.Td>
                                    <Table.Td><Text size="xs">{ret.numero_retencion}</Text></Table.Td>
                                    <Table.Td ta="center"><Text size="xs">{dayjs(ret.fecha_retencion).format('DD/MM/YYYY')}</Text></Table.Td>
                                    <Table.Td ta="right"><Text size="xs" fw={700}>${ret.total_retenido.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                        <Table.Tfoot>
                            <Table.Tr>
                                <Table.Td colSpan={4} ta="right"><Text size="xs" fw={700}>TOTAL A RECAUDAR:</Text></Table.Td>
                                <Table.Td ta="right"><Text size="xs" fw={800}>${(totalPendiente + totalRecaudado).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></Table.Td>
                            </Table.Tr>
                        </Table.Tfoot>
                    </Table>

                    <Group mt={100} grow>
                        <Stack gap={4} align="center">
                            <div style={{ borderTop: '1px solid black', width: '200px' }} />
                            <Text size="xs" fw={700}>ENTREGADO POR</Text>
                        </Stack>
                        <Stack gap={4} align="center">
                            <div style={{ borderTop: '1px solid black', width: '200px' }} />
                            <Text size="xs" fw={700}>RECIBIDO POR (RECAUDADOR)</Text>
                        </Stack>
                    </Group>
                </div>
            </div>
        </AppDrawer>
    );
}
