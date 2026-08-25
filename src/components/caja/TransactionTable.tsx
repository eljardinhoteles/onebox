import { useState, useEffect } from 'react';
import { Table, Text, Group, Stack, ActionIcon, ScrollArea, Badge, Tooltip, ThemeIcon, Checkbox } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { AppLoader } from '../ui/AppLoader';
import { TableSkeleton } from '../ui/TableSkeleton';
import { IconEdit, IconTrash, IconFileDescription, IconEye, IconFileInvoice, IconAlertTriangle, IconCheck, IconMessage2, IconMessage2Filled, IconFileInvoiceFilled, IconSortAscending, IconSortDescending, IconSelector, IconBuildingBank } from '@tabler/icons-react';
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
    onMarkNoDeducible?: (id: number) => void;
    onRevertNoDeducible?: (id: number) => void;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    onSort?: (key: string) => void;
    isReadOnly?: boolean;
    isFilterActive?: boolean;
}



export function TransactionTable({
    transactions,
    loading,
    cajaEstado,
    onEdit,
    onDelete,
    onRetention,
    onNovedades,
    onMarkNoDeducible,
    onRevertNoDeducible,
    sortBy,
    sortOrder,
    onSort,
    isReadOnly,
    isFilterActive
}: TransactionTableProps) {
    const isMobile = useMediaQuery('(max-width: 768px)');

    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const toggleSelection = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleAll = () => {
        if (selectedIds.length === transactions.length && transactions.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(transactions.map(t => t.id));
        }
    };

    const selectedTransactions = transactions.filter(t => selectedIds.includes(t.id));
    const sumTotal = selectedTransactions.reduce((acc, t) => acc + t.total_factura, 0);
    const sumFte = selectedTransactions.reduce((acc, t) => acc + (t.retencion?.total_fuente || 0), 0);
    const sumIva = selectedTransactions.reduce((acc, t) => acc + (t.retencion?.total_iva || 0), 0);
    const sumNeto = selectedTransactions.reduce((acc, t) => acc + (t.total_factura - (t.retencion?.total_retenido || 0)), 0);

    const sumFilteredTotal = transactions.reduce((acc, t) => acc + t.total_factura, 0);
    const sumFilteredFte = transactions.reduce((acc, t) => acc + (t.retencion?.total_fuente || 0), 0);
    const sumFilteredIva = transactions.reduce((acc, t) => acc + (t.retencion?.total_iva || 0), 0);
    const sumFilteredNeto = transactions.reduce((acc, t) => acc + (t.total_factura - (t.retencion?.total_retenido || 0)), 0);

    const showFooter = selectedIds.length > 0 || isFilterActive;
    const isShowingSelection = selectedIds.length > 0;
    const shouldHideNavbar = isShowingSelection || isFilterActive;

    useEffect(() => {
        if (shouldHideNavbar) {
            window.dispatchEvent(new Event('hide-navbar'));
        } else {
            window.dispatchEvent(new Event('show-navbar'));
        }

        return () => {
            window.dispatchEvent(new Event('show-navbar'));
        };
    }, [shouldHideNavbar]);

    const rows = transactions.map((t) => (
        <Table.Tr
            key={t.id}
            bg={selectedIds.includes(t.id) ? 'var(--mantine-color-blue-light)' : undefined}
        >
            <Table.Td onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    checked={selectedIds.includes(t.id)}
                    onChange={() => toggleSelection(t.id)}
                    size="sm"
                    color="blue"
                />
            </Table.Td>
            <Table.Td>
                <Stack gap={0}>
                    <Text size="xs" fw={600} tt="capitalize" c="dimmed">
                        {dayjs(t.fecha_factura).format('dddd')}
                    </Text>
                    <Text size={isMobile ? "xs" : "sm"}>
                        {dayjs(t.fecha_factura).format('DD/MM/YYYY')}
                    </Text>
                </Stack>
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
                            variant="light"
                            color={
                                t.tipo_documento === 'factura' ? 'blue' :
                                    t.tipo_documento === 'nota_venta' ? 'orange' :
                                        t.tipo_documento === 'liquidacion_compra' ? 'teal' :
                                            t.tipo_documento === 'deposito' ? 'green' :
                                                t.tipo_documento === 'no_deducible' ? 'teal' :
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
                    {/* Botón Marcar No Deducible - solo para sin_factura en caja abierta */}
                    {cajaEstado === 'abierta' && !isReadOnly && t.tipo_documento === 'sin_factura' && (
                        <Tooltip label="Marcar como No Deducible para permitir cierre" withArrow>
                            <ActionIcon
                                variant="filled"
                                color="red"
                                onClick={(e) => { e.stopPropagation(); onMarkNoDeducible?.(t.id); }}
                                size={isMobile ? "lg" : "md"}
                            >
                                <IconAlertTriangle size={isMobile ? 20 : 16} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                    {/* Botón Revertir No Deducible - solo para no_deducible en caja abierta */}
                    {cajaEstado === 'abierta' && !isReadOnly && t.tipo_documento === 'no_deducible' && (
                        <Tooltip label="Revertir a Sin Factura" withArrow>
                            <ActionIcon
                                variant="filled"
                                color="teal"
                                onClick={(e) => { e.stopPropagation(); onRevertNoDeducible?.(t.id); }}
                                size={isMobile ? "lg" : "md"}
                            >
                                <IconCheck size={isMobile ? 20 : 16} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                    {!(t.tipo_documento === 'sin_factura' || t.tipo_documento === 'no_deducible' || t.tipo_documento === 'deposito') && (
                        <ActionIcon
                            variant="subtle"
                            color="orange"
                            onClick={(e) => { e.stopPropagation(); onRetention(t.id); }}
                            disabled={isReadOnly}
                            title="Comprobante de Retención"
                            size={isMobile ? "lg" : "md"}
                        >
                            {t.retencion && t.retencion.total_retenido > 0 ? <IconFileInvoiceFilled size={isMobile ? 20 : 16} /> : <IconFileInvoice size={isMobile ? 20 : 16} />}
                        </ActionIcon>
                    )}
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
                        onClick={(e) => { e.stopPropagation(); if (!isReadOnly) onEdit(t.id); }}
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
                striped
                withRowBorders={false}
                style={{ minWidth: isMobile ? 800 : '100%' }}
            >
                <Table.Thead bg="white" style={{ zIndex: 10, position: 'sticky', top: 0 }}>
                    <Table.Tr>
                        <Table.Th w={40}>
                            <Checkbox
                                checked={selectedIds.length > 0 && selectedIds.length === transactions.length}
                                indeterminate={selectedIds.length > 0 && selectedIds.length !== transactions.length}
                                onChange={toggleAll}
                                size="sm"
                                color="blue"
                            />
                        </Table.Th>
                        <Table.Th w={110} style={{ cursor: 'pointer' }} onClick={() => onSort?.('fecha_factura')}>
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
                        <Table.Th w={220}><Text size="xs" fw={700}>Doc.</Text></Table.Th>
                        <Table.Th w={90} ta="right"><Text size="xs" fw={700}>Total</Text></Table.Th>
                        <Table.Th w={70} ta="right"><Text size="xs" fw={700}>R. Fte</Text></Table.Th>
                        <Table.Th w={70} ta="right"><Text size="xs" fw={700}>R. IVA</Text></Table.Th>
                        <Table.Th w={90} ta="right"><Text size="xs" fw={700}>Neto</Text></Table.Th>
                        <Table.Th w={110} ta="right"><Text size="xs" fw={700}>Acc.</Text></Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {loading && transactions.length === 0 ? (
                        <Table.Tr>
                            <Table.Td colSpan={9} p={0}>
                                <TableSkeleton rows={15} cols={9} />
                            </Table.Td>
                        </Table.Tr>
                    ) : transactions.length > 0 ? rows : (
                        <Table.Tr>
                            <Table.Td colSpan={9}>
                                <Text ta="center" py="xl" c="dimmed">No hay transacciones registradas</Text>
                            </Table.Td>
                        </Table.Tr>
                    )}
                </Table.Tbody>
                {showFooter && (
                    <Table.Tfoot style={{ position: 'sticky', bottom: -12, zIndex: 10, background: isShowingSelection ? 'var(--mantine-color-blue-9)' : 'var(--mantine-color-dark-7)', boxShadow: '0 -4px 16px rgba(0,0,0,0.15)' }}>
                        <Table.Tr>
                            <Table.Td colSpan={4}>
                                {isShowingSelection ? (
                                    <Text size="sm" fw={700} c="white">Seleccionados: {selectedIds.length}</Text>
                                ) : isFilterActive ? (
                                    <Text size="sm" fw={700} c="gray.2">Resultados Filtro: {transactions.length}</Text>
                                ) : (
                                    <Text size="sm" fw={700} c="gray.2">Total Transacciones: {transactions.length}</Text>
                                )}
                            </Table.Td>
                            <Table.Td ta="right">
                                <Text fw={700} size={isMobile ? "xs" : "sm"} c="red.4">-${(isShowingSelection ? sumTotal : sumFilteredTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                            </Table.Td>
                            <Table.Td ta="right">
                                <Text fw={700} size={isMobile ? "xs" : "sm"} c="orange.4">-${(isShowingSelection ? sumFte : sumFilteredFte).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                            </Table.Td>
                            <Table.Td ta="right">
                                <Text fw={700} size={isMobile ? "xs" : "sm"} c="orange.4">-${(isShowingSelection ? sumIva : sumFilteredIva).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                            </Table.Td>
                            <Table.Td ta="right">
                                <Text fw={700} size={isMobile ? "xs" : "sm"} c="cyan.3">${(isShowingSelection ? sumNeto : sumFilteredNeto).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                            </Table.Td>
                            <Table.Td></Table.Td>
                        </Table.Tr>
                    </Table.Tfoot>
                )}
            </Table>
        </ScrollArea>
    );
}
