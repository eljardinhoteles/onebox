import { Table, Group, Text, Badge, Tooltip, Checkbox, ActionIcon, Pagination, Stack } from '@mantine/core';
import { IconInfoCircle, IconPlayerPlay, IconPlayerPause, IconCheck, IconX, IconTrash, IconCrown, IconFileText } from '@tabler/icons-react';
import dayjs from 'dayjs';
import type { Comercio } from '../types';

const estadoColor: Record<string, string> = {
    trial: 'blue',
    activa: 'teal',
    vencida: 'red',
    pendiente_pago: 'orange',
    suspendida: 'gray',
};

const estadoLabel: Record<string, string> = {
    trial: 'Trial',
    activa: 'Activa',
    vencida: 'Vencida',
    pendiente_pago: 'Pendiente',
    suspendida: 'Suspendida',
};

interface AdminTableProps {
    paginatedItems: Comercio[];
    currentPage: number;
    totalPages: number;
    setCurrentPage: (p: number) => void;
    handleChangePlanClick: (sub: Comercio) => void;
    handleToggleFacturaEmitida: (sub: Comercio, checked: boolean) => void;
    handleApproveUpgrade: (sub: Comercio) => void;
    handleApproveClick: (sub: Comercio) => void;
    handleReject: (sub: Comercio) => void;
    handleReactivate: (sub: Comercio) => void;
    handleSuspend: (sub: Comercio) => void;
    openDetailsModal: (sub: Comercio) => void;
    handleDeleteComercio: (sub: Comercio) => void;
}

export function AdminTable({
    paginatedItems, currentPage, totalPages, setCurrentPage,
    handleChangePlanClick, handleToggleFacturaEmitida, handleApproveUpgrade,
    handleApproveClick, handleReject, handleReactivate, handleSuspend,
    openDetailsModal, handleDeleteComercio
}: AdminTableProps) {
    return (
        <Stack gap="md" mt="md">
            <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Razón Social</Table.Th>
                        <Table.Th>Estado / Plan</Table.Th>
                        <Table.Th>Facturación</Table.Th>
                        <Table.Th>Días Restantes</Table.Th>
                        <Table.Th>Vencimiento</Table.Th>
                        <Table.Th>Método</Table.Th>
                        <Table.Th ta="center">Fac. Legal</Table.Th>
                        <Table.Th ta="right">Acciones</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {paginatedItems.length === 0 ? (
                        <Table.Tr>
                            <Table.Td colSpan={8} ta="center" py="xl">
                                <Text c="dimmed">No hay comercios para este filtro o búsqueda.</Text>
                            </Table.Td>
                        </Table.Tr>
                    ) : (
                        paginatedItems.map((c) => {
                            const days = Math.max(0, dayjs(c.fecha_fin).diff(dayjs(), 'day'));
                            return (
                                <Table.Tr key={c.id}>
                                    <Table.Td>
                                        <div>
                                            <Group gap={4}>
                                                <Text fw={600} size="sm">{c.empresa_nombre}</Text>
                                            </Group>
                                            {c.empresa_ruc && <Text size="xs" c="dimmed">{c.empresa_ruc}</Text>}
                                        </div>
                                    </Table.Td>
                                    <Table.Td>
                                        {(() => {
                                            if (c.estado === 'activa') {
                                                if (c.plan === 'mensual') {
                                                    return (
                                                        <Badge
                                                            variant="light"
                                                            color="teal"
                                                            size="sm"
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => handleChangePlanClick(c)}
                                                            title="Clic para cambiar a plan Anual"
                                                            rightSection={<IconCrown size={12} />}
                                                        >
                                                            Activa · Mensual
                                                        </Badge>
                                                    );
                                                }
                                                return (
                                                    <Badge variant="light" color="blue" size="sm">
                                                        Activa · Anual
                                                    </Badge>
                                                );
                                            }
                                            if (c.estado === 'trial') {
                                                return (
                                                    <Badge
                                                        variant="light"
                                                        color="gray"
                                                        size="sm"
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => handleChangePlanClick(c)}
                                                        title="Clic para cambiar plan"
                                                        rightSection={<IconCrown size={12} />}
                                                    >
                                                        Trial
                                                    </Badge>
                                                );
                                            }
                                            return (
                                                <Badge color={estadoColor[c.estado] || 'gray'} size="sm" variant="light">
                                                    {estadoLabel[c.estado] || c.estado}
                                                </Badge>
                                            );
                                        })()}
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="xs" fw={700} c="teal.7">
                                            ${c.total_pagado?.toLocaleString() || '0'}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap={4}>
                                            <Text size="sm" fw={700} c={days <= 3 ? 'red' : days <= 7 ? 'orange' : undefined}>
                                                {days}
                                            </Text>
                                            <Text size="xs" c="dimmed">días</Text>
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="xs">{dayjs(c.fecha_fin).format('DD/MM/YYYY')}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="xs" c="dimmed">{c.metodo_pago || '—'}</Text>
                                    </Table.Td>
                                    <Table.Td ta="center">
                                        <Tooltip label={c.factura_emitida ? "Factura enviada" : "Marcar como enviada"} position="top" withArrow>
                                            <Checkbox 
                                                checked={c.factura_emitida}
                                                onChange={(e) => handleToggleFacturaEmitida(c, e.currentTarget.checked)}
                                                color="teal"
                                                radius="xl"
                                                size="sm"
                                                style={{ display: 'flex', justifyContent: 'center' }}
                                            />
                                        </Tooltip>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap={4} justify="flex-end">
                                            {c.upgrade_pendiente && (
                                                <Tooltip label="Aprobar Upgrade de Plan (Cliente lo solicitó)">
                                                    <ActionIcon variant="light" color="teal" onClick={() => handleApproveUpgrade(c)}>
                                                        <IconCrown size={16} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            )}

                                            <Tooltip label="Ver detalles del comercio">
                                                <ActionIcon variant="light" color="blue" onClick={() => openDetailsModal(c)}>
                                                    <IconInfoCircle size={16} />
                                                </ActionIcon>
                                            </Tooltip>

                                            {c.estado === 'pendiente_pago' ? (
                                                <>
                                                    {c.comprobante_url && (
                                                        <Tooltip label="Ver Comprobante de Pago">
                                                            <ActionIcon 
                                                                variant="light" 
                                                                color="blue" 
                                                                onClick={() => window.open(c.comprobante_url!, '_blank')}
                                                            >
                                                                <IconFileText size={16} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip label="Aprobar Pago">
                                                        <ActionIcon variant="light" color="teal" onClick={() => handleApproveClick(c)}>
                                                            <IconCheck size={16} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                    <Tooltip label="Rechazar">
                                                        <ActionIcon variant="light" color="red" onClick={() => handleReject(c)}>
                                                            <IconX size={16} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </>
                                            ) : (
                                                <>
                                                    {c.estado === 'suspendida' ? (
                                                        <Tooltip label="Reactivar Suscripción">
                                                            <ActionIcon variant="light" color="teal" onClick={() => handleReactivate(c)}>
                                                                <IconPlayerPlay size={16} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    ) : (
                                                        <Tooltip label="Suspender Suscripción">
                                                            <ActionIcon variant="light" color="orange" onClick={() => handleSuspend(c)}>
                                                                <IconPlayerPause size={16} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    )}
                                                </>
                                            )}

                                            <Tooltip label="Eliminar definitivamente">
                                                <ActionIcon variant="light" color="red" onClick={() => handleDeleteComercio(c)}>
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            );
                        })
                    )}
                </Table.Tbody>
            </Table>

            {totalPages > 1 && (
                <Group justify="center" mt="md" pb="xl">
                    <Pagination total={totalPages} value={currentPage} onChange={setCurrentPage} radius="xl" size="sm" />
                </Group>
            )}
        </Stack>
    );
}
