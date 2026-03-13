import { Table, Text, Group, Stack, ActionIcon, ScrollArea, Badge, Tooltip, ThemeIcon } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { AppLoader } from '../ui/AppLoader';
import { TableSkeleton } from '../ui/TableSkeleton';
import { IconEdit, IconTrash, IconFileDescription, IconEye, IconFileInvoice, IconAlertTriangle, IconMessage2, IconMessage2Filled, IconFileInvoiceFilled, IconSortAscending, IconSortDescending, IconSelector, IconBuildingBank } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
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
    isReadOnly?: boolean;
}



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
    onSort,
    isReadOnly
}: TransactionTableProps) {
    const isMobile = useMediaQuery('(max-width: 768px)');

    const rows = transactions.map((t) => (
        <Table.Tr
            key={t.id}
        >
            <Table.Td>
                <Text size={isMobile ? "xs" : "sm"}>{dayjs(t.fecha_factura).format('DD/MM/YYYY')}</Text>
            </Table.Td>
            <Table.Td>
                <Group gap="xs" wrap="nowrap">
                    {t.tipo_documento === 'deposito' && !isMobile && (
                        <ThemeIcon variant="light" color="teal" size="md" radius="md">
                            <IconBuildingBank size={18} stroke={1.5} />
                        </ThemeIcon>
                    )}
                    <Stack gap={0}>
                        <Text fw={500} size={isMobile ? "xs" : "sm"} lineClamp={1}>
                            {t.tipo_documento === 'deposito'
                                ? t.banco?.nombre || 'Banco'
                                : t.proveedor?.nombre || (t.items && t.items[0]?.nombre) || 'Gasto sin detalle'}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                            {t.tipo_documento === 'deposito'
                                ? 'Depósito Bancario'
                                : t.proveedor?.ruc || 'Categoría/Producto'}
                        </Text>
                    </Stack>
                    {t.es_justificacion && !isMobile && (
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
                            {t.items?.map((i: any, idx: number) => {
                                const qty = Number(i.cantidad) || 1;
                                return (
                                    <Text key={i.id || idx} size="xs" style={{ whiteSpace: 'normal' }}>
                                        • {qty !== 1 ? `${qty} x ` : ''}{i.nombre}
                                    </Text>
                                );
                            })}
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
                                            t.tipo_documento === 'deposito' ? 'green' :
                                                'gray'
                            }
                            size="sm"
                        >
                            {t.tipo_documento.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                        {t.numero_factura && t.numero_factura !== 'S/N' && (
                            <Text size="xs" c="dimmed" fw={500} ml={isMobile ? 0 : 12}>
                                {t.numero_factura}
                            </Text>
                        )}
                    </Stack>
                </Tooltip>
            </Table.Td>
            <Table.Td ta="right">
                <Text fw={700} size={isMobile ? "xs" : "sm"} c="red.6" style={{ whiteSpace: 'nowrap' }}>
                    -${t.total_factura.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
            </Table.Td>
            <Table.Td ta="right">
                <Text size={isMobile ? "xs" : "sm"} c="orange.7" style={{ whiteSpace: 'nowrap' }}>
                    -${(t.retencion?.total_fuente || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
            </Table.Td>
            <Table.Td ta="right">
                <Text size={isMobile ? "xs" : "sm"} c="orange.7" style={{ whiteSpace: 'nowrap' }}>
                    -${(t.retencion?.total_iva || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
            </Table.Td>
            <Table.Td ta="right">
                <Text fw={700} size={isMobile ? "xs" : "sm"} style={{ whiteSpace: 'nowrap' }}>
                    ${(t.total_factura - (t.retencion?.total_retenido || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
            </Table.Td>
            <Table.Td>
                <Group gap={isMobile ? 2 : 4} justify="flex-end" wrap="nowrap">
                    <ActionIcon
                        variant="subtle"
                        color="orange"
                        onClick={(e) => { e.stopPropagation(); onRetention(t.id); }}
                        disabled={t.tipo_documento === 'sin_factura' || t.tipo_documento === 'deposito' || isReadOnly}
                        title="Comprobante de Retención"
                        size={isMobile ? "lg" : "md"}
                    >
                        {t.retencion && t.retencion.total_retenido > 0 ? <IconFileInvoiceFilled size={isMobile ? 20 : 16} /> : <IconFileInvoice size={isMobile ? 20 : 16} />}
                    </ActionIcon>
                    <ActionIcon
                        variant="subtle"
                        color="grape"
                        onClick={(e) => { e.stopPropagation(); onNovedades(t); }}
                        title="Novedades y Auditoría"
                        size={isMobile ? "lg" : "md"}
                    >
                        {t.has_manual_novedad ? <IconMessage2Filled size={isMobile ? 20 : 16} /> : <IconMessage2 size={isMobile ? 20 : 16} />}
                    </ActionIcon>
                    <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={(e) => { e.stopPropagation(); if(!isReadOnly) onEdit(t.id); }}
                        disabled={t.tipo_documento === 'deposito' || isReadOnly}
                        style={t.tipo_documento === 'deposito' ? { opacity: 0.5 } : undefined}
                        title={isReadOnly ? 'Solo lectura' : ''}
                        size={isMobile ? "lg" : "md"}
                    >
                        {cajaEstado !== 'abierta' || isReadOnly || (t.retencion && t.retencion.total_retenido > 0) ?
                            <IconEye size={isMobile ? 20 : 16} /> :
                            <IconEdit size={isMobile ? 20 : 16} />
                        }
                    </ActionIcon>
                    {cajaEstado === 'abierta' && !isReadOnly && (
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
                            size={isMobile ? "lg" : "md"}
                        >
                            <IconTrash size={isMobile ? 20 : 16} />
                        </ActionIcon>
                    )}
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <ScrollArea h={600} type="auto" offsetScrollbars style={{ position: 'relative' }}>
            {loading && transactions.length > 0 && <AppLoader variant="bar" />}
                <Table 
                    stickyHeader 
                    verticalSpacing={isMobile ? "4px" : "xs"} 
                    horizontalSpacing={isMobile ? "xs" : "sm"}
                    highlightOnHover
                    style={{ minWidth: isMobile ? 800 : '100%' }}
                >
                    <Table.Thead bg="white" style={{ zIndex: 10, position: 'sticky', top: 0 }}>
                        <Table.Tr>
                            <Table.Th style={{ cursor: 'pointer' }} onClick={() => onSort?.('fecha_factura')}>
                                <Group gap="xs" wrap="nowrap">
                                    <Text size="xs" fw={700}>Fecha</Text>
                                    {sortBy === 'fecha_factura' ? (
                                        sortOrder === 'asc' ? <IconSortAscending size={14} /> : <IconSortDescending size={14} />
                                    ) : (
                                        <IconSelector size={14} color="var(--mantine-color-gray-5)" />
                                    )}
                                </Group>
                            </Table.Th>
                            <Table.Th><Text size="xs" fw={700}>Proveedor</Text></Table.Th>
                            <Table.Th><Text size="xs" fw={700}>Doc.</Text></Table.Th>
                            <Table.Th ta="right"><Text size="xs" fw={700}>Total</Text></Table.Th>
                            <Table.Th ta="right"><Text size="xs" fw={700}>R. Fte</Text></Table.Th>
                            <Table.Th ta="right"><Text size="xs" fw={700}>R. IVA</Text></Table.Th>
                            <Table.Th ta="right"><Text size="xs" fw={700}>Neto</Text></Table.Th>
                            <Table.Th ta="right"><Text size="xs" fw={700}>Acc.</Text></Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {loading && transactions.length === 0 ? (
                            <Table.Tr>
                                <Table.Td colSpan={8} p={0}>
                                    <TableSkeleton rows={15} cols={8} />
                                </Table.Td>
                            </Table.Tr>
                        ) : transactions.length > 0 ? rows : (
                            <Table.Tr>
                                <Table.Td colSpan={8}>
                                    <Text ta="center" py="xl" c="dimmed">No hay transacciones registradas</Text>
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </ScrollArea>
    );
}
