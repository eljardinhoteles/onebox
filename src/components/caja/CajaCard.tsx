import { Card, Group, Text, Stack, Badge, Tooltip, Divider, Avatar, Button, ActionIcon, TextInput, Modal, Paper, Box, ThemeIcon } from '@mantine/core';
import { IconBuildingStore, IconCalendar, IconLockOpen, IconLock, IconTrash, IconArrowRight } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import dayjs from 'dayjs';
import { supabase } from '../../lib/supabaseClient';
import { useState } from 'react';

interface Caja {
    id: number;
    created_at: string;
    saldo_anterior: number;
    reposicion: number;
    monto_inicial: number;
    fecha_apertura: string;
    fecha_cierre: string | null;
    responsable: string;
    sucursal: string;
    estado: 'abierta' | 'cerrada';
    saldo_actual: number;
    total_gastos?: number;
    total_depositos?: number;
    numero?: number;
}

interface CajaCardProps {
    caja: Caja;
    alertThreshold: number;
    onSelectCaja: (id: number) => void;
    onDelete?: () => void;
    isReadOnly?: boolean;
    layout?: 'grid' | 'list';
}

const SUCURSAL_COLORS = [
    'blue',
    'cyan',
    'teal',
    'green',
    'lime',
    'yellow',
    'grape',
    'violet',
    'indigo'
];

const getSucursalColor = (sucursal: string) => {
    if (!sucursal) return 'gray';
    let hash = 0;
    for (let i = 0; i < sucursal.length; i++) {
        hash = hash * 31 + sucursal.charCodeAt(i);
    }
    const index = Math.abs(hash) % SUCURSAL_COLORS.length;
    return SUCURSAL_COLORS[index];
};

export function CajaCard({ caja, alertThreshold, onSelectCaja, onDelete, isReadOnly, layout = 'grid' }: CajaCardProps) {
    const totalDepositos = caja.total_depositos || 0;
    const montoInicial = caja.monto_inicial;

    // El saldo_actual ya incluye el descuento de depósitos — se compara vs el monto inicial original
    const percentageRemaining = montoInicial > 0
        ? (caja.saldo_actual / montoInicial) * 100
        : 0;

    const isLowBalance = percentageRemaining <= alertThreshold && caja.estado === 'abierta';
    const sucursalColor = getSucursalColor(caja.sucursal);

    const [showDelete, setShowDelete] = useState(false);
    const [strictDeleteOpen, setStrictDeleteOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);

    const initiateDelete = () => {
        modals.openConfirmModal({
            title: '¿Eliminar caja permanentemente?',
            centered: true,
            children: (
                <Text size="sm">
                    Estás a punto de eliminar la caja #{caja.id} de {caja.sucursal}.
                    <br /><br />
                    <b>Advertencia:</b> Esta acción eliminará TAMBIÉN todas las transacciones, items y retenciones asociadas. Esta acción no se puede deshacer.
                </Text>
            ),
            labels: { confirm: 'Sí, continuar', cancel: 'Cancelar' },
            confirmProps: { color: 'red' },
            onConfirm: () => setStrictDeleteOpen(true),
        });
    };

    const confirmDelete = async () => {
        if (deleteConfirmText !== 'ELIMINAR') return;

        setDeleting(true);
        try {
            // 1. Log the action
            const { data: { user } } = await supabase.auth.getUser();
            const { error: logError } = await supabase.from('bitacora').insert({
                accion: 'ELIMINAR_CAJA',
                detalle: {
                    caja_id: caja.id,
                    numero_caja: caja.numero || caja.id,
                    sucursal: caja.sucursal,
                    responsable: caja.responsable,
                    fecha_eliminacion: new Date().toISOString()
                },
                user_id: user?.id,
                user_email: user?.email
            });

            if (logError) console.error('Error logging deletion:', logError);

            // 2. Delete the Caja (Cascading deletes should handle related tables if configured in DB, 
            // otherwise we rely on the user's setup or manual deletion if needed. 
            // Assuming Supabase Cascade is ON for foreign keys or this is a simple delete).
            const { error } = await supabase.from('cajas').delete().eq('id', caja.id);

            if (error) throw error;

            notifications.show({
                title: 'Caja Eliminada',
                message: 'La caja y sus registros asociados han sido eliminados.',
                color: 'blue'
            });

            setStrictDeleteOpen(false);
            if (onDelete) onDelete();

        } catch (error: unknown) {
            notifications.show({
                title: 'Error al eliminar',
                message: (error as Error).message || 'No se pudo eliminar la caja.',
                color: 'red'
            });
        } finally {
            setDeleting(false);
            setDeleteConfirmText('');
        }
    };

    if (layout === 'list') {
        return (
            <Card
                shadow="none"
                padding="sm"
                radius="md"
                withBorder
                bg="gray.0"
                className="transition-all hover:bg-gray-50 relative"
            >
                <Group wrap="nowrap" justify="space-between" align="center" gap="lg" pl={6}>
                    {/* Sección Izquierda: Sucursal y Fechas */}
                    <Group gap="md" style={{ flex: '1 1 30%', minWidth: 200 }} wrap="nowrap">
                        <ThemeIcon size={48} radius="xl" color={caja.estado === 'abierta' ? sucursalColor : 'gray'} variant="light">
                            <IconBuildingStore size={24} stroke={1.5} />
                        </ThemeIcon>
                        <Stack gap={2}>
                            <Group gap="xs">
                                <Text size="md" fw={700} c="dark.9" lineClamp={1}>{caja.sucursal}</Text>
                                <Badge size="sm" radius="sm" variant="light" color={caja.estado === 'abierta' ? 'teal' : 'gray'}>
                                    {caja.estado.toUpperCase()}
                                </Badge>
                            </Group>
                            <Group gap={4}>
                                <Text size="xs" c="dimmed" fw={600}>CAJA #{caja.numero ?? caja.id}</Text>
                                <Text size="xs" c="dimmed">•</Text>
                                <IconCalendar size={12} className="text-gray-400" />
                                <Text size="xs" c="dimmed" fw={500}>
                                    {caja.estado === 'cerrada' && caja.fecha_cierre
                                        ? dayjs(caja.fecha_cierre).format('DD MMM YYYY')
                                        : dayjs(caja.fecha_apertura).format('DD MMM YYYY')}
                                </Text>
                            </Group>
                        </Stack>
                    </Group>

                    {/* Sección Central: Barras de progreso y Saldos */}
                    <Stack gap={4} style={{ flex: '1 1 40%', minWidth: 250 }}>
                        <Group justify="space-between" align="flex-end" wrap="nowrap">
                            <Stack gap={0}>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Efectivo Disponible</Text>
                                <Text size="lg" fw={700} className="font-mono" c={isLowBalance ? 'orange.8' : 'blue.9'}>
                                    ${caja.saldo_actual.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </Text>
                            </Stack>
                            <Stack gap={0} align="flex-end">
                                <Text size="xs" c="dimmed" fw={600}>${montoInicial.toLocaleString(undefined, { minimumFractionDigits: 2 })} Inicial</Text>
                                {totalDepositos > 0 && (
                                    <Text size="xs" c="red.7" fw={600}>
                                        (-${totalDepositos.toLocaleString(undefined, { minimumFractionDigits: 2 })} dep)
                                    </Text>
                                )}
                            </Stack>
                        </Group>

                        <Tooltip label={<Text size="xs" fw={700}>{percentageRemaining.toFixed(1)}%</Text>} withArrow radius="md">
                            <Paper w="100%" h={6} radius="xl" bg="gray.2" style={{ overflow: 'hidden' }}>
                                <div
                                    style={{
                                        transform: `scaleX(${Math.min(100, percentageRemaining) / 100})`,
                                        transformOrigin: 'left',
                                        width: '100%',
                                        height: '100%',
                                        backgroundColor: isLowBalance ? 'var(--mantine-color-orange-6)' : 'var(--mantine-color-gray-6)',
                                        transition: 'transform 0.5s ease, background-color 0.5s ease'
                                    }}
                                />
                            </Paper>
                        </Tooltip>
                    </Stack>

                    {/* Sección Derecha: Responsable y Botón */}
                    <Group gap="lg" style={{ flex: '1 1 30%', minWidth: 150 }} justify="flex-end" wrap="nowrap">
                        <Group gap="xs" wrap="nowrap">
                            <Stack gap={0} align="flex-end" className="hidden sm:flex">
                                <Text size="xs" fw={500} lineClamp={1}>{caja.responsable}</Text>
                                <Text fz={10} c="dimmed">Responsable</Text>
                            </Stack>
                            <Avatar size="md" radius="xl" color="blue" name={caja.responsable} />
                        </Group>
                        <Button
                            variant="light"
                            color={isLowBalance ? 'orange' : 'gray'}
                            size="sm"
                            px="sm"
                            rightSection={<IconArrowRight size={14} />}
                            onClick={() => onSelectCaja(caja.id)}
                            style={{ flexShrink: 0 }}
                        >
                            Ver Detalle
                        </Button>
                    </Group>
                </Group>
            </Card>
        );
    }

    return (
        <>
            <Card
                shadow={caja.estado === 'abierta' ? 'sm' : 'none'}
                padding="lg"
                radius="lg"
                withBorder
                bg={caja.estado === 'abierta' ? 'white' : 'gray.1'}
                className={`transition-all group relative ${caja.estado === 'abierta' ? 'hover:shadow-md' : 'opacity-60 grayscale'}`}
                style={isLowBalance ? { border: '1px solid var(--mantine-color-orange-4)', boxShadow: '0 0 0 1px var(--mantine-color-orange-1)' } : {}}
            >
                <Group justify="space-between" align="center" mb="md" wrap="nowrap">
                    <Group align="center" gap="sm">
                        {(!isReadOnly) ? (
                            <Tooltip
                                label={showDelete ? "Click para eliminar permanentemente" : "Opciones de caja"}
                                position="top"
                                withArrow
                                radius="md"
                                openDelay={500}
                            >
                                <ActionIcon
                                    variant="light"
                                    size={42}
                                    radius="xl"
                                    className={`transition-all duration-200 ${showDelete ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'hover:opacity-80'}`}
                                    color={showDelete ? 'red' : (caja.estado === 'abierta' ? sucursalColor : 'gray')}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!showDelete) {
                                            setShowDelete(true);
                                        } else {
                                            initiateDelete();
                                        }
                                    }}
                                    onMouseLeave={() => setShowDelete(false)}
                                >
                                    <Box className={`transition-transform duration-200 ${showDelete ? 'scale-0 absolute' : 'scale-100'}`}>
                                        <IconBuildingStore size={22} stroke={1.5} />
                                    </Box>
                                    <Box className={`transition-transform duration-200 ${showDelete ? 'scale-100' : 'scale-0 absolute'}`}>
                                        <IconTrash size={22} stroke={1.5} />
                                    </Box>
                                </ActionIcon>
                            </Tooltip>
                        ) : (
                            <ThemeIcon size={42} radius="xl" color={caja.estado === 'abierta' ? sucursalColor : 'gray'} variant="light">
                                <IconBuildingStore size={22} stroke={1.5} />
                            </ThemeIcon>
                        )}
                        <div>
                            <Text size="lg" fw={700} c="dark.9" lineClamp={1} style={{ lineHeight: 1.1 }}>{caja.sucursal}</Text>
                            <Text size="xs" c="dimmed" fw={600} mt={2}>CAJA #{caja.numero ?? caja.id}</Text>
                        </div>
                    </Group>

                    <Stack gap={2} align="flex-end">
                        <Badge
                            size="md"
                            radius="sm"
                            variant="light"
                            color={caja.estado === 'abierta' ? 'teal' : 'gray'}
                            leftSection={caja.estado === 'abierta' ? <IconLockOpen size={12} /> : <IconLock size={12} />}
                        >
                            {caja.estado.toUpperCase()}
                        </Badge>
                        <Group gap={4} justify="flex-end" mt={2}>
                            <IconCalendar size={12} className="text-gray-400" />
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1 }}>
                                {caja.estado === 'cerrada' && caja.fecha_cierre
                                    ? dayjs(caja.fecha_cierre).format('DD MMM YYYY')
                                    : dayjs(caja.fecha_apertura).format('DD MMM YYYY')}
                            </Text>
                        </Group>
                    </Stack>
                </Group>

                <Stack gap={4} mt="xs">
                    <Group justify="space-between" align="flex-end">
                        <Stack gap={0}>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Efectivo Disponible</Text>
                            <Text size="xl" fw={700} className="font-mono" c={isLowBalance ? 'orange.8' : 'blue.9'}>
                                ${caja.saldo_actual.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                        </Stack>
                        <Stack gap={0} align="flex-end">
                            <Text size="xs" c="dimmed" fw={600}>${montoInicial.toLocaleString(undefined, { minimumFractionDigits: 2 })} Inicial</Text>
                            {isLowBalance && (
                                <Badge color="orange" variant="dot" size="xs">Saldo Bajo</Badge>
                            )}
                            {totalDepositos > 0 && (
                                <Text size="xs" c="red.7" fw={600}>
                                    (-${totalDepositos.toLocaleString(undefined, { minimumFractionDigits: 2 })} depósitos)
                                </Text>
                            )}
                        </Stack>
                    </Group>

                    <Tooltip
                        label={<Text size="xs" fw={700}>{percentageRemaining.toFixed(1)}%</Text>}
                        withArrow
                        radius="md"
                    >
                        <Paper w="100%" h={6} radius="xl" bg="gray.1" style={{ overflow: 'hidden' }}>
                            <div
                                style={{
                                    transform: `scaleX(${Math.min(100, percentageRemaining) / 100})`,
                                    transformOrigin: 'left',
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: isLowBalance ? 'var(--mantine-color-orange-6)' : 'var(--mantine-color-blue-6)',
                                    transition: 'transform 0.5s ease, background-color 0.5s ease'
                                }}
                            />
                        </Paper>
                    </Tooltip>
                </Stack>

                <Divider my="sm" color="white" />

                <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
                    <Group gap="xs" style={{ flex: '1 1 50%', minWidth: 0 }} wrap="nowrap">
                        <Avatar size="sm" radius="xl" color="blue" name={caja.responsable} />
                        <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                            <Text size="xs" fw={500} lineClamp={1} truncate>{caja.responsable}</Text>
                            <Text fz={10} c="dimmed">Responsable</Text>
                        </Stack>
                    </Group>

                    <Button
                        variant="light"
                        color={isLowBalance && !isReadOnly && caja.estado === 'abierta' ? 'orange' : 'gray'}
                        style={{ flex: '1 1 50%' }}
                        leftSection={caja.estado === 'abierta' && !isReadOnly ? undefined : <IconLock size={16} />}
                        rightSection={caja.estado === 'abierta' && !isReadOnly ? <IconArrowRight size={16} /> : undefined}
                        onClick={() => {
                            if (caja.estado === 'cerrada' || isReadOnly) {
                                notifications.show({
                                    title: 'Caja Bloqueada',
                                    message: 'Accediendo en modo solo lectura debido al estado de la caja o tu suscripción. No se pueden realizar cambios.',
                                    color: 'gray',
                                    icon: <IconLock size={16} />,
                                });
                            }
                            onSelectCaja(caja.id);
                        }}
                    >
                        {caja.estado === 'abierta' && !isReadOnly ? 'Gestionar' : 'Histórico'}
                    </Button>
                </Group>
            </Card >

            <Modal
                opened={strictDeleteOpen}
                onClose={() => setStrictDeleteOpen(false)}
                title="Confirmación Estricta"
                centered
                closeOnClickOutside={false}
            >
                <Stack>
                    <Text size="sm" c="red">
                        Para confirmar la eliminación, escribe <b>ELIMINAR</b> en el campo de abajo.
                    </Text>
                    <TextInput
                        placeholder="Escribe ELIMINAR"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        data-autofocus
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => setStrictDeleteOpen(false)}>Cancelar</Button>
                        <Button
                            color="red"
                            disabled={deleteConfirmText !== 'ELIMINAR'}
                            loading={deleting}
                            onClick={confirmDelete}
                            leftSection={<IconTrash size={16} />}
                        >
                            Confirmar Eliminación
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}
