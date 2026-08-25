import { useState } from 'react';
import { Stack, Title, Text, Paper, Group, Badge, SimpleGrid, ActionIcon, Menu, Center, Loader, Divider, Modal, Button, Textarea, CopyButton, SegmentedControl, ThemeIcon, Box, Popover, Tooltip } from '@mantine/core';
import { IconDownload, IconDotsVertical, IconCheck, IconX, IconFileSpreadsheet, IconEdit, IconPlus, IconTrash, IconLock, IconCalendar, IconLockOpen, IconBuildingBank, IconAlertTriangle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { useEmpresa } from '../context/EmpresaContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { AppLoader } from '../components/ui/AppLoader';
import { generateCashManagementTSV, downloadTSV } from '../utils/cashManagementExport';
import type { PagoDetalleExport } from '../utils/cashManagementExport';

import { useNavigate } from 'react-router-dom';
import { TextInput } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

interface PayCashPageProps {
    opened?: boolean;
    close?: () => void;
}

export function PayCashPage({ opened, close }: PayCashPageProps) {
    const { empresa, loading: empresaLoading } = useEmpresa();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const [exportContent, setExportContent] = useState('');
    const [exportFileName, setExportFileName] = useState('');
    const [exportModalOpen, setExportModalOpen] = useState(false);
    
    // Filtros
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

    // Estado para el modal de creación
    const [nuevaDescripcion, setNuevaDescripcion] = useState('');
    const [creandoLote, setCreandoLote] = useState(false);

    const handleCrearLote = async () => {
        if (!nuevaDescripcion.trim()) {
            notifications.show({ title: 'Error', message: 'Ingrese una descripción', color: 'red' });
            return;
        }

        try {
            setCreandoLote(true);
            const { data, error } = await supabase
                .from('ordenes_pago')
                .insert({
                    empresa_id: empresa?.id,
                    descripcion: nuevaDescripcion,
                    estado: 'BORRADOR',
                    total: 0
                })
                .select()
                .single();

            if (error) throw error;
            
            close?.();
            setNuevaDescripcion('');
            navigate(`/paycash/edit/${data.id}`);
        } catch (error: any) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setCreandoLote(false);
        }
    };
    
    // Obtener las órdenes de pago de la BD
    const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
        queryKey: ['ordenes_pago', empresa?.id],
        queryFn: async () => {
            if (!empresa) return [];
            const { data, error } = await supabase
                .from('ordenes_pago')
                .select(`
                    id, 
                    created_at, 
                    descripcion, 
                    total, 
                    estado,
                    ordenes_pago_detalles (
                        proveedores (
                            ruc,
                            numero_cuenta,
                            codigo_banco,
                            tipo_cuenta
                        )
                    )
                `)
                .eq('empresa_id', empresa.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            return data.map((o: any) => {
                const detalles = o.ordenes_pago_detalles || [];
                const hasIncomplete = detalles.some((d: any) => {
                    const p = d.proveedores;
                    if (!p) return true;
                    return !p.ruc || !p.numero_cuenta || !p.codigo_banco || !p.tipo_cuenta;
                });

                return {
                    id: o.id,
                    fecha: o.created_at,
                    descripcion: o.descripcion,
                    total: o.total,
                    estado: o.estado,
                    cantidad_pagos: detalles.length,
                    hasIncompleteProvider: hasIncomplete
                };
            });
        },
        enabled: !!empresa
    });

    const handleExport = async (order: any) => {
        try {
            console.log("=== INICIANDO EXPORTACION TSV ===");
            console.log("Order ID:", order.id);
            
            // Fetch detalles de la orden
            const { data, error } = await supabase
                .from('ordenes_pago_detalles')
                .select(`
                    valor_factura,
                    referencia,
                    tipo_id,
                    proveedores (
                        ruc,
                        nombre,
                        tipo_cuenta,
                        numero_cuenta,
                        codigo_banco
                    )
                `)
                .eq('orden_pago_id', order.id);

            if (error) {
                console.error("Error al buscar detalles:", error);
                throw error;
            }

            console.log("Detalles encontrados en BD:", data);

            if (!data || data.length === 0) {
                console.warn("No hay detalles para exportar.");
                notifications.show({ title: 'Error', message: 'No hay detalles en esta orden', color: 'red' });
                return;
            }

            const detallesToExport: PagoDetalleExport[] = data.map((d: any) => ({
                valor_factura: d.valor_factura,
                referencia: d.referencia,
                tipo_id: d.tipo_id,
                proveedor: d.proveedores
            }));

            console.log("Detalles a exportar mapeados:", detallesToExport);

            const tsvContent = generateCashManagementTSV(detallesToExport);
            
            console.log("Contenido TSV generado (primeros 100 caracteres):", tsvContent.substring(0, 100));
            console.log("Tamaño del contenido TSV en bytes:", new Blob([tsvContent]).size);
            
            const orderIdShort = order.id.toString().split('-')[0];
            const fileName = `Lote_${orderIdShort}_CashManagement.txt`;
            console.log("Preparando archivo para modal:", fileName);
            
            // Mostrar modal con las opciones (sin descargar automáticamente)
            setExportContent(tsvContent);
            setExportFileName(fileName);
            setExportModalOpen(true);
            
            notifications.show({
                title: 'Lote Preparado',
                message: 'Revisa el contenido y elige cómo exportarlo.',
                color: 'teal'
            });
        } catch (error: any) {
            notifications.show({
                title: 'Error al exportar',
                message: error.message || 'Intente nuevamente.',
                color: 'red'
            });
        }
    };

    const handleEliminar = (id: number) => {
        modals.openConfirmModal({
            title: 'Eliminar Lote',
            children: <Text size="sm">¿Seguro que deseas eliminar este lote de pago?</Text>,
            labels: { confirm: 'Eliminar', cancel: 'Cancelar' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                try {
                    const { error } = await supabase.from('ordenes_pago').delete().eq('id', id);
                    if (error) throw error;
                    queryClient.invalidateQueries({ queryKey: ['ordenes_pago'] });
                    notifications.show({ title: 'Eliminado', message: 'El lote fue eliminado', color: 'teal' });
                } catch (e: any) {
                    notifications.show({ title: 'Error', message: e.message, color: 'red' });
                }
            }
        });
    };

    const handleCompletar = (id: number) => {
        modals.openConfirmModal({
            title: 'Completar Lote',
            children: <Text size="sm">¿Seguro que deseas completar este lote? Se bloqueará la edición y quedará listo para enviarse al banco.</Text>,
            labels: { confirm: 'Completar', cancel: 'Cancelar' },
            confirmProps: { color: 'teal' },
            onConfirm: async () => {
                try {
                    const { error } = await supabase.from('ordenes_pago').update({ estado: 'COMPLETADA' }).eq('id', id);
                    if (error) throw error;
                    queryClient.invalidateQueries({ queryKey: ['ordenes_pago'] });
                    notifications.show({ title: 'Completado', message: 'El lote fue bloqueado para edición', color: 'teal' });
                } catch (e: any) {
                    notifications.show({ title: 'Error', message: e.message, color: 'red' });
                }
            }
        });
    };

    if (empresaLoading) {
        return <AppLoader fullScreen message="Cargando módulo..." />;
    }

    const filteredOrders = orders.filter((order: any) => {
        let matchStatus = true;
        if (statusFilter === 'Borradores') matchStatus = order.estado !== 'COMPLETADA';
        else if (statusFilter === 'Completadas') matchStatus = order.estado === 'COMPLETADA';
        
        let matchDate = true;
        if (dateRange[0]) {
            const orderDate = new Date(order.fecha).getTime();
            const start = new Date(dateRange[0]).getTime();
            const end = dateRange[1] ? new Date(dateRange[1]).setHours(23, 59, 59, 999) : new Date(dateRange[0]).setHours(23, 59, 59, 999);
            matchDate = orderDate >= start && orderDate <= end;
        }
        
        return matchStatus && matchDate;
    });

    const dateRangeStr = dateRange[0] 
        ? `${dayjs(dateRange[0]).format('DD MMM')} - ${dateRange[1] ? dayjs(dateRange[1]).format('DD MMM') : '...'}`
        : 'Cualquier fecha';

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="center" mb="lg">
                <Stack gap={2}>
                    <Title order={2} fw={800} style={{ letterSpacing: '-0.5px' }}>
                        Órdenes de pago
                    </Title>
                    <Text size="sm" c="dimmed" fw={500}>
                        {statusFilter} &bull; {dateRangeStr}
                    </Text>
                </Stack>

                <Group align="center" gap="sm">
                    <SegmentedControl
                        data={['Todos', 'Borradores', 'Completadas']}
                        value={statusFilter}
                        onChange={setStatusFilter}
                        radius="xl"
                        size="sm"
                        color="blue"
                    />
                    
                    <Popover position="bottom-end" withArrow shadow="md">
                        <Popover.Target>
                            <ActionIcon variant="light" size="lg" radius="xl" color={dateRange[0] ? 'blue' : 'gray'}>
                                <IconCalendar size={20} />
                            </ActionIcon>
                        </Popover.Target>
                        <Popover.Dropdown p="xs">
                            <DatePicker 
                                type="range"
                                value={dateRange}
                                onChange={setDateRange}
                                locale="es"
                                maxDate={new Date()}
                            />
                            {dateRange[0] && (
                                <Button 
                                    size="xs" 
                                    variant="subtle" 
                                    fullWidth 
                                    mt="xs" 
                                    onClick={() => setDateRange([null, null])}
                                >
                                    Limpiar Fechas
                                </Button>
                            )}
                        </Popover.Dropdown>
                    </Popover>
                </Group>
            </Group>

            {/* Modal para Crear Lote */}
            <Modal opened={!!opened} onClose={() => close?.()} title="Nuevo Lote de Pago" size="md">
                <TextInput
                    label="Descripción del Lote"
                    placeholder="Ej. Pago a proveedores primera quincena"
                    value={nuevaDescripcion}
                    onChange={(e) => setNuevaDescripcion(e.currentTarget.value)}
                    required
                    mb="md"
                    data-autofocus
                />
                <Group justify="flex-end">
                    <Button variant="default" onClick={() => close?.()}>Cancelar</Button>
                    <Button onClick={handleCrearLote} loading={creandoLote}>Crear Lote</Button>
                </Group>
            </Modal>

            {/* Modal para exportar */}
            <Modal opened={exportModalOpen} onClose={() => setExportModalOpen(false)} title="Exportación de Cash Management" size="xl">
                <Text size="sm" mb="md">
                    Verifica el contenido de tu lote de pago. Puedes copiar el texto o forzar la descarga del archivo <b>{exportFileName}</b>.
                </Text>
                <Textarea
                    value={exportContent}
                    readOnly
                    autosize
                    minRows={10}
                    maxRows={20}
                    styles={{ input: { fontFamily: 'monospace', whiteSpace: 'pre', overflowX: 'auto', fontSize: '0.85rem' } }}
                    mb="md"
                />
                <Group justify="space-between">
                    <Button variant="outline" onClick={() => setExportModalOpen(false)}>Cerrar</Button>
                    <Group>
                        <CopyButton value={exportContent}>
                            {({ copied, copy }) => (
                                <Button color={copied ? 'teal' : 'gray'} variant="light" onClick={copy} leftSection={copied ? <IconCheck size={16} /> : <IconFileSpreadsheet size={16} />}>
                                    {copied ? 'Copiado' : 'Copiar Texto'}
                                </Button>
                            )}
                        </CopyButton>
                        <Button color="blue" onClick={() => downloadTSV(exportContent, exportFileName)} leftSection={<IconDownload size={16} />}>
                            Descargar TXT
                        </Button>
                    </Group>
                </Group>
            </Modal>

            {isLoadingOrders ? (
                <Center py={40}>
                    <Loader color="blue" />
                </Center>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                {filteredOrders.map((order: any) => (
                    <Paper 
                        key={order.id} 
                        shadow={order.estado === 'COMPLETADA' ? 'xs' : 'sm'} 
                        radius="lg" 
                        p="lg" 
                        withBorder 
                        bg={order.estado === 'COMPLETADA' ? 'gray.0' : 'white'} 
                        className="transition-all group flex flex-col hover:shadow-md"
                        style={{ display: 'flex', flexDirection: 'column', minHeight: '200px' }}
                    >
                        <Group justify="space-between" align="flex-start" mb="sm" wrap="nowrap">
                            <Box mih={50}>
                                <Text size="lg" fw={700} c="dark.9" lineClamp={2} style={{ lineHeight: 1.2 }}>{order.descripcion}</Text>
                                <Group gap={4} mt={6}>
                                    <IconCalendar size={12} className="text-gray-400" />
                                    <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1 }}>
                                        {dayjs(order.fecha).format('DD MMM YYYY')}
                                    </Text>
                                </Group>
                            </Box>
                        </Group>
                        
                        <Stack gap={4} mt="auto" style={{ flex: 1 }}>
                            <Group justify="space-between" align="flex-end">
                                <Stack gap={0}>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total a Pagar</Text>
                                    <Text size="xl" fw={700} className="font-mono" c={order.estado === 'COMPLETADA' ? 'dark.6' : 'blue.9'}>
                                        ${order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </Text>
                                </Stack>
                                <Stack gap={6} align="flex-end">
                                    <Group gap={4}>
                                        <Text size="sm" fw={600} c="dimmed">
                                            {order.cantidad_pagos} {order.cantidad_pagos === 1 ? 'pago' : 'pagos'}
                                        </Text>
                                    </Group>
                                    <Badge 
                                        size="sm"
                                        radius="sm"
                                        variant="light"
                                        color={order.estado === 'COMPLETADA' ? 'teal' : 'orange'} 
                                        leftSection={order.estado === 'COMPLETADA' ? <IconLock size={10} /> : <IconLockOpen size={10} />}
                                    >
                                        {order.estado}
                                    </Badge>
                                </Stack>
                            </Group>
                        </Stack>

                        <Divider my="sm" variant="dashed" />

                        <Group justify="space-between" align="center" mt="auto">
                            {order.hasIncompleteProvider ? (
                                <Tooltip label="Faltan datos bancarios de uno o más proveedores" withArrow position="top">
                                    <Button variant="light" size="xs" color="red" disabled leftSection={<IconAlertTriangle size={14}/>}>
                                        Exportar
                                    </Button>
                                </Tooltip>
                            ) : (
                                <Button variant="light" size="xs" color="blue" onClick={() => handleExport(order)} leftSection={<IconDownload size={14}/>}>
                                    Exportar
                                </Button>
                            )}
                            <Group gap={8}>
                                {order.estado !== 'COMPLETADA' && (
                                    <>
                                        <ActionIcon variant="light" color="red" size="md" onClick={() => handleEliminar(order.id)}>
                                            <IconTrash size={16} />
                                        </ActionIcon>
                                        <ActionIcon variant="light" color="blue" size="md" onClick={() => navigate(`/paycash/edit/${order.id}`)}>
                                            <IconEdit size={16} />
                                        </ActionIcon>
                                        <ActionIcon variant="light" color="teal" size="md" onClick={() => handleCompletar(order.id)}>
                                            <IconCheck size={16} />
                                        </ActionIcon>
                                    </>
                                )}
                                {order.estado === 'COMPLETADA' && (
                                    <ActionIcon variant="light" color="gray" size="md" onClick={() => navigate(`/paycash/edit/${order.id}`)} title="Ver Lote (Sólo Lectura)">
                                        <IconLock size={16} />
                                    </ActionIcon>
                                )}
                            </Group>
                        </Group>
                    </Paper>
                ))}
            </SimpleGrid>
            )}

            {!isLoadingOrders && filteredOrders.length === 0 && (
                <Paper p="xl" radius="md" withBorder ta="center" bg="gray.0">
                    <Text c="dimmed">No hay lotes de pago registrados o que coincidan con los filtros.</Text>
                </Paper>
            )}
        </Stack>
    );
}
