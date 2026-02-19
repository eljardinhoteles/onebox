import { Card, Group, Text, Stack, Badge, Tooltip, Divider, Avatar, Button, ActionIcon, TextInput, Modal, Paper, Box } from '@mantine/core';
import { IconBuildingStore, IconCalendar, IconLockOpen, IconLock, IconTrash } from '@tabler/icons-react';
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
}

export function CajaCard({ caja, alertThreshold, onSelectCaja, onDelete }: CajaCardProps) {
    const totalDepositos = caja.total_depositos || 0;
    const montoInicialNeto = caja.monto_inicial - totalDepositos;

    // Avoid division by zero
    const percentageRemaining = montoInicialNeto > 0
        ? (caja.saldo_actual / montoInicialNeto) * 100
        : 0;

    const isLowBalance = percentageRemaining <= alertThreshold && caja.estado === 'abierta';


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

        } catch (error: any) {
            notifications.show({
                title: 'Error al eliminar',
                message: error.message || 'No se pudo eliminar la caja.',
                color: 'red'
            });
        } finally {
            setDeleting(false);
            setDeleteConfirmText('');
        }
    };

    return (
        <>
            <Card
                shadow={caja.estado === 'abierta' ? 'sm' : 'none'}
                padding="lg"
                radius="md"
                withBorder
                bg={caja.estado === 'abierta' ? 'white' : 'gray.1'}
                className={`transition-all group ${caja.estado === 'abierta' ? 'hover:shadow-md' : 'opacity-60 grayscale'}`}
                style={isLowBalance ? { border: '1px solid var(--mantine-color-orange-4)', boxShadow: '0 0 0 1px var(--mantine-color-orange-1)' } : {}}
            >
                <Group justify="space-between" align="center" mb="md" wrap="nowrap">
                    <Group align="center" gap="sm">
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
                                className={`transition-all duration-200 ${showDelete ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'text-blue-600 hover:bg-blue-50'}`}
                                color={showDelete ? 'red' : (caja.estado === 'abierta' ? 'blue' : 'gray')}
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
                        <div>
                            <Text size="lg" fw={800} c="dark.9" lineClamp={1} style={{ lineHeight: 1.1 }}>{caja.sucursal}</Text>
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
                            <Text size="xl" fw={800} className="font-mono" c={isLowBalance ? 'orange.8' : 'blue.9'}>
                                ${caja.saldo_actual.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                        </Stack>
                        <Stack gap={0} align="flex-end">
                            <Text size="xs" c="dimmed" fw={600}>${montoInicialNeto.toLocaleString(undefined, { minimumFractionDigits: 2 })} neto</Text>
                            {isLowBalance && (
                                <Badge color="orange" variant="dot" size="xs">Saldo Bajo</Badge>
                            )}
                            {totalDepositos > 0 && (
                                <Text size="xs" c="red.7" fw={600} style={{ fontSize: 11 }}>
                                    (-${totalDepositos.toLocaleString(undefined, { minimumFractionDigits: 2 })} depósitos)
                                </Text>
                            )}
                        </Stack>
                    </Group>

                    <Tooltip
                        label={
                            <Stack gap={0}>
                                <Text size="xs">{percentageRemaining.toFixed(1)}% del efectivo neto disponible</Text>
                                <Text size="xs" c="dimmed">Inicial: ${caja.monto_inicial.toFixed(2)}</Text>
                                <Text size="xs" c="dimmed">Depósitos: -${totalDepositos.toFixed(2)}</Text>
                            </Stack>
                        }
                        withArrow
                        radius="md"
                        multiline
                    >
                        <Paper w="100%" h={6} radius="xl" bg="gray.1" style={{ overflow: 'hidden' }}>
                            <div
                                style={{
                                    width: `${Math.min(100, percentageRemaining)}%`,
                                    height: '100%',
                                    backgroundColor: isLowBalance ? 'var(--mantine-color-orange-6)' : 'var(--mantine-color-blue-6)',
                                    transition: 'width 0.5s ease'
                                }}
                            />
                        </Paper>
                    </Tooltip>
                </Stack>

                <Divider my="sm" />

                <Group justify="space-between" align="center" mb="md">
                    <Group gap="xs">
                        <Avatar size="sm" radius="xl" color="blue" name={caja.responsable} />
                        <Stack gap={0}>
                            <Text size="xs" fw={500}>{caja.responsable}</Text>
                            <Text fz={10} c="dimmed">Responsable</Text>
                        </Stack>
                    </Group>
                </Group>

                <Button
                    variant="light"
                    color={caja.estado === 'abierta' ? 'blue' : 'gray'}
                    fullWidth
                    leftSection={caja.estado === 'abierta' ? undefined : <IconLock size={16} />}
                    onClick={() => {
                        if (caja.estado === 'cerrada') {
                            notifications.show({
                                title: 'Caja Bloqueada',
                                message: 'Accediendo en modo solo lectura. No se pueden realizar cambios.',
                                color: 'gray',
                                icon: <IconLock size={16} />,
                            });
                        }
                        onSelectCaja(caja.id);
                    }}
                >
                    {caja.estado === 'abierta' ? 'Gestionar Caja' : 'Ver Histórico Bloqueado'}
                </Button>
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
