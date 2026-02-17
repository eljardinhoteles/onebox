import { Table, Text, Group, Stack, ActionIcon, ScrollArea, Badge, Tooltip } from '@mantine/core';
import { IconEdit, IconTrash, IconFileDescription, IconEye, IconFileInvoice, IconAlertTriangle, IconMessage2, IconMessage2Filled, IconFileInvoiceFilled, IconSortAscending, IconSortDescending, IconSelector } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import type { Transaction } from '../../hooks/useCajaCalculations';

interface TransactionTableProps {
    transactions: Transaction[];
    loading: boolean;
    cajaEstado: string;
    onEdit: (id: number) => void;
    onDelete: (t: Transaction) => void;
    onRetention: (id: number) => void;
    onNovedades: (t: Transaction) => void;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    onSort?: (key: string) => void;
}

const MotionTr = motion.create(Table.Tr);

export function TransactionTable({
    transactions,
    loading,
    cajaEstado,
    onEdit,
    onDelete,
    onRetention,
    onNovedades,
    sortBy,
    sortOrder,
    onSort
}: TransactionTableProps) {

    const rows = transactions.map((t, index) => (
        <MotionTr
            key={t.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
        >
            <Table.Td>
                <Text size="sm">{dayjs(t.fecha_factura).format('DD/MM/YYYY')}</Text>
            </Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <Stack gap={0}>
                        <Text fw={500} size="sm">
                            {t.proveedor?.nombre || (t.items && t.items[0]?.nombre) || 'Gasto sin detalle'}
                        </Text>
                        <Text size="xs" c="dimmed">
                            {t.proveedor?.ruc || 'Categoría/Producto'}
                        </Text>
                    </Stack>
                    {t.es_justificacion && (
                        <Badge variant="light" color="blue" size="xs" leftSection={<IconFileDescription size={10} />}>
                            Justificativo
                        </Badge>
                    )}
                </Group>
            </Table.Td>
            <Table.Td
                onClick={() => onEdit(t.id)}
                style={{ cursor: 'pointer' }}
                className="hover:bg-blue-50/30 transition-colors"
            >
                <Tooltip
                    label={
                        <Stack gap={0} p={4}>
                            <Text size="xs" fw={700} mb={2} c="blue.1">Items:</Text>
                            {t.items?.map((i: any, idx: number) => (
                                <Text key={idx} size="xs" style={{ whiteSpace: 'normal' }}>• {i.nombre}</Text>
                            ))}
                        </Stack>
                    }
                    multiline
                    w={220}
                    withArrow
                    transitionProps={{ duration: 200 }}
                    disabled={!t.items || t.items.length === 0}
                    color="dark"
                >
                    <Stack gap={2} style={{ cursor: 'help' }}>
                        <Badge
                            variant="dot"
                            color={
                                t.tipo_documento === 'factura' ? 'blue' :
                                    t.tipo_documento === 'nota_venta' ? 'orange' :
                                        t.tipo_documento === 'liquidacion_compra' ? 'teal' :
                                            'gray'
                            }
                            size="sm"
                        >
                            {t.tipo_documento.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                        {t.numero_factura && t.numero_factura !== 'S/N' && (
                            <Text size="xs" c="dimmed" fw={500} ml={12}>
                                {t.numero_factura}
                            </Text>
                        )}
                    </Stack>
                </Tooltip>
            </Table.Td>
            <Table.Td ta="right">
                <Text fw={700} size="sm" c="red.6">
                    -${t.total_factura.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
            </Table.Td>
            <Table.Td ta="right">
                <Text size="sm" c="orange.7">
                    -${(t.retencion?.total_fuente || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
            </Table.Td>
            <Table.Td ta="right">
                <Text size="sm" c="orange.7">
                    -${(t.retencion?.total_iva || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
            </Table.Td>
            <Table.Td ta="right">
                <Text fw={800} size="sm">
                    ${(t.total_factura - (t.retencion?.total_retenido || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
            </Table.Td>
            <Table.Td>
                <Group gap={4} justify="flex-end">
                    <ActionIcon
                        variant="subtle"
                        color="orange"
                        onClick={(e) => { e.stopPropagation(); onRetention(t.id); }}
                        disabled={t.tipo_documento === 'sin_factura'}
                        title="Comprobante de Retención"
                    >
                        {t.retencion && t.retencion.total_retenido > 0 ? <IconFileInvoiceFilled size={16} /> : <IconFileInvoice size={16} />}
                    </ActionIcon>
                    <ActionIcon
                        variant="subtle"
                        color="grape"
                        onClick={(e) => { e.stopPropagation(); onNovedades(t); }}
                        title="Novedades y Auditoría"
                    >
                        {t.has_manual_novedad ? <IconMessage2Filled size={16} /> : <IconMessage2 size={16} />}
                    </ActionIcon>
                    <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={(e) => { e.stopPropagation(); onEdit(t.id); }}
                    >
                        {cajaEstado !== 'abierta' || (t.retencion && t.retencion.total_retenido > 0) ?
                            <IconEye size={16} /> :
                            <IconEdit size={16} />
                        }
                    </ActionIcon>
                    {cajaEstado === 'abierta' && (
                        <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (t.retencion && t.retencion.total_retenido > 0) {
                                    notifications.show({
                                        title: 'Acción no permitida',
                                        message: 'Elimine primero la retención asociada antes de eliminar esta transacción.',
                                        color: 'red',
                                        icon: <IconAlertTriangle size={18} />
                                    });
                                    return;
                                }
                                onDelete(t);
                            }}
                        >
                            <IconTrash size={16} />
                        </ActionIcon>
                    )}
                </Group>
            </Table.Td>
        </MotionTr>
    ));

    return (
        <ScrollArea h={600} type="auto" offsetScrollbars>
            <Table stickyHeader verticalSpacing="xs" highlightOnHover>
                <Table.Thead bg="white" style={{ zIndex: 10, position: 'sticky', top: 0 }}>
                    <Table.Tr>
                        <Table.Th style={{ cursor: 'pointer' }} onClick={() => onSort?.('fecha_factura')}>
                            <Group gap="xs" wrap="nowrap">
                                <Text size="sm" fw={700}>Fecha</Text>
                                {sortBy === 'fecha_factura' ? (
                                    sortOrder === 'asc' ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />
                                ) : (
                                    <IconSelector size={16} color="var(--mantine-color-gray-5)" />
                                )}
                            </Group>
                        </Table.Th>
                        <Table.Th>Proveedor</Table.Th>
                        <Table.Th>Documento</Table.Th>
                        <Table.Th ta="right">Total</Table.Th>
                        <Table.Th ta="right">Ret. Fuente</Table.Th>
                        <Table.Th ta="right">Ret. IVA</Table.Th>
                        <Table.Th ta="right">Gasto Neto</Table.Th>
                        <Table.Th ta="right">Acciones</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    <AnimatePresence mode="popLayout">
                        {!loading && rows.length > 0 ? rows : (
                            <Table.Tr>
                                <Table.Td colSpan={8}>
                                    {loading ? (
                                        <Text ta="center" py="xl" c="dimmed">Cargando transacciones...</Text>
                                    ) : (
                                        <Text ta="center" py="xl" c="dimmed">No hay transacciones registradas</Text>
                                    )}
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </AnimatePresence>
                </Table.Tbody>
            </Table>
        </ScrollArea>
    );
}
