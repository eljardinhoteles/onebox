import { Card, Group, ThemeIcon, Text, Stack, Badge, Tooltip, Divider, Avatar, Button, ActionIcon, TextInput, Modal } from '@mantine/core';
import { IconBuildingStore, IconCalendar, IconLockOpen, IconLock, IconAlertTriangle, IconTrash, IconX } from '@tabler/icons-react';
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
    // Add other fields if necessary
}

interface CajaCardProps {
    caja: Caja;
    alertThreshold: number;
    onSelectCaja: (id: number) => void;
    onDelete?: () => void;
}

export function CajaCard({ caja, alertThreshold, onSelectCaja, onDelete }: CajaCardProps) {
    const percentageRemaining = (caja.saldo_actual / caja.monto_inicial) * 100;
    const isLowBalance = percentageRemaining <= alertThreshold && caja.estado === 'abierta';

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
                bg={caja.estado === 'abierta' ? 'white' : 'gray.0'}
                className={`transition-all ${caja.estado === 'abierta' ? 'hover:shadow-md' : 'opacity-75 grayscale-[0.5]'} ${isLowBalance ? 'border-orange-400 ring-1 ring-orange-100' : ''}`}
            >
                <Group justify="space-between" align="flex-start" mb="md">
                    <Group align="flex-start">
                        <ThemeIcon variant="light" color="blue" size="lg" radius="md">
                            <IconBuildingStore size={20} stroke={1.5} />
                        </ThemeIcon>
                        <div>
                            <Text size="sm" fw={500} lineClamp={1}>{caja.sucursal}</Text>
                            <Group gap={6} mt={2}>
                                <IconCalendar size={12} className="text-gray-400" />
                                <Text size="xs" c="dimmed">{dayjs(caja.fecha_apertura).format('DD MMM YYYY')}</Text>
                            </Group>
                        </div>
                    </Group>

                    <Stack gap={4} align="flex-end">
                        <Badge
                            size="lg"
                            variant="light"
                            color={caja.estado === 'abierta' ? 'blue' : 'gray'}
                            leftSection={caja.estado === 'abierta' ? <IconLockOpen size={16} /> : <IconLock size={16} />}
                        >
                            {caja.estado.toUpperCase()}
                        </Badge>
                        <Group gap={4}>
                            <Text size="xs" c="dimmed" fw={500}>#{caja.id}</Text>
                            <ActionIcon
                                variant="subtle"
                                color="red"
                                size="xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    initiateDelete();
                                }}
                                title="Eliminar Caja"
                            >
                                <IconTrash size={12} />
                            </ActionIcon>
                        </Group>
                    </Stack>
                </Group>

                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Monto Inicial</Text>
                <Group justify="space-between" align="flex-end">
                    <Text size="xl" fw={700} className="font-mono">
                        ${caja.monto_inicial.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                    {isLowBalance && (
                        <Tooltip label={`Saldo bajo: ${percentageRemaining.toFixed(1)}% restante`} withArrow position="top-end">
                            <ThemeIcon color="orange" variant="light" size="md">
                                <IconAlertTriangle size={18} />
                            </ThemeIcon>
                        </Tooltip>
                    )}
                </Group>

                <Group justify="space-between" mt="xs">
                    <Text size="xs" c="dimmed" fw={600}>EFECTIVO EN CAJA</Text>
                    <Text size="sm" fw={700} c={isLowBalance ? 'orange.7' : 'blue.7'}>
                        ${caja.saldo_actual.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                </Group>

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
            </Card>

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
