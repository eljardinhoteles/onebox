import { useState, useEffect } from 'react';
import { Drawer, ActionIcon, Indicator, Paper, Text, ScrollArea, Group, Stack, Button, ThemeIcon, Badge, Title } from '@mantine/core';
import { IconBell, IconCheck, IconTrash, IconInfoCircle, IconAlertTriangle, IconExclamationCircle, IconBellOff } from '@tabler/icons-react';
import { supabase } from '../lib/supabaseClient';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';

dayjs.extend(relativeTime);
dayjs.locale('es');

export function NotificationCenter() {
    const [opened, setOpened] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        let query = supabase
            .from('notificaciones')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        const { data } = await query;
        if (data) {
            setNotifications(data);
            setUnreadCount(data.filter((n: any) => !n.leido).length);
        }
    };

    useEffect(() => {
        fetchNotifications();

        const subscription = supabase
            .channel('public:notificaciones_center')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, () => {
                fetchNotifications();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notificaciones' }, () => {
                fetchNotifications();
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notificaciones' }, () => {
                fetchNotifications();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const markAsRead = async (id: number) => {
        await supabase.from('notificaciones').update({ leido: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.leido).map(n => n.id);
        if (unreadIds.length === 0) return;

        await supabase.from('notificaciones').update({ leido: true }).in('id', unreadIds);
        setNotifications(prev => prev.map(n => ({ ...n, leido: true })));
        setUnreadCount(0);
    };

    const clearAll = async () => {
        const ids = notifications.map(n => n.id);
        if (ids.length === 0) return;

        await supabase.from('notificaciones').delete().in('id', ids);
        setNotifications([]);
        setUnreadCount(0);
    };

    const getIcon = (tipo: string) => {
        switch (tipo) {
            case 'warning': return <IconAlertTriangle size={18} />;
            case 'error': return <IconExclamationCircle size={18} />;
            case 'success': return <IconCheck size={18} />;
            default: return <IconInfoCircle size={18} />;
        }
    };

    const getColor = (tipo: string) => {
        switch (tipo) {
            case 'warning': return 'orange';
            case 'error': return 'red';
            case 'success': return 'teal';
            default: return 'blue';
        }
    };

    return (
        <>
            <Indicator inline label={unreadCount} size={16} disabled={unreadCount === 0} color="red" offset={4}>
                <ActionIcon
                    variant="light"
                    color="blue"
                    radius="xl"
                    size="lg"
                    className="shadow-sm"
                    onClick={() => setOpened(true)}
                >
                    <IconBell size={20} stroke={1.5} />
                </ActionIcon>
            </Indicator>

            <Drawer
                opened={opened}
                onClose={() => setOpened(false)}
                position="right"
                title={
                    <Group gap="sm">
                        <ThemeIcon color="blue" variant="light" radius="md">
                            <IconBell size={18} stroke={1.5} />
                        </ThemeIcon>
                        <Title order={4}>Centro de Notificaciones</Title>
                    </Group>
                }
                size="md"
                padding="md"
                styles={{
                    header: { borderBottom: '1px solid var(--mantine-color-gray-2)', paddingBottom: 'var(--mantine-spacing-md)', marginBottom: 0 },
                    body: { padding: 0, height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }
                }}
            >
                {/* Header Acciones */}
                <Paper p="md" bg="gray.0" style={{ borderBottom: '1px solid var(--mantine-color-gray-1)' }}>
                    <Group justify="space-between">
                        <Stack gap={0}>
                            <Text size="xs" c="dimmed" fw={600} tt="uppercase">Resumen</Text>
                            <Text size="sm" fw={700}>
                                {unreadCount > 0 ? `${unreadCount} pendientes` : 'Todo al día'}
                            </Text>
                        </Stack>
                        <Group gap="xs">
                            {unreadCount > 0 && (
                                <Button variant="light" color="blue" size="xs" leftSection={<IconCheck size={14} />} onClick={markAllAsRead}>
                                    Leer todo
                                </Button>
                            )}
                            {notifications.length > 0 && (
                                <ActionIcon variant="subtle" color="red" onClick={clearAll} title="Limpiar historial">
                                    <IconTrash size={16} />
                                </ActionIcon>
                            )}
                        </Group>
                    </Group>
                </Paper>

                <ScrollArea.Autosize mah="100%" style={{ flex: 1 }} viewportProps={{ style: { padding: 'var(--mantine-spacing-md)' } }}>
                    {notifications.length === 0 ? (
                        <Stack align="center" justify="center" h={400} gap="md" c="dimmed">
                            <ThemeIcon size={64} radius="xl" color="gray" variant="light">
                                <IconBellOff size={32} stroke={1.5} />
                            </ThemeIcon>
                            <Stack gap={4} align="center">
                                <Text fw={700}>No hay notificaciones</Text>
                                <Text size="sm" ta="center">Te avisaremos cuando pase algo importante en tu caja.</Text>
                            </Stack>
                        </Stack>
                    ) : (
                        <Stack gap="md">
                            {notifications.map((n) => (
                                <Paper
                                    key={n.id}
                                    p="sm"
                                    radius="md"
                                    withBorder
                                    className={`transition-all cursor-pointer ${!n.leido ? 'border-l-4 border-l-blue-500 shadow-sm bg-blue-50/20' : 'bg-white'}`}
                                    onClick={() => !n.leido && markAsRead(n.id)}
                                    style={{ position: 'relative' }}
                                >
                                    <Group wrap="nowrap" align="flex-start" gap="md">
                                        <ThemeIcon size="lg" radius="md" color={getColor(n.tipo)} variant="light" mt={2}>
                                            {getIcon(n.tipo)}
                                        </ThemeIcon>
                                        <div style={{ flex: 1 }}>
                                            <Group justify="space-between" align="center" mb={4}>
                                                <Text size="sm" fw={n.leido ? 600 : 800} c={n.leido ? 'dark' : 'blue.9'}>
                                                    {n.titulo}
                                                </Text>
                                                {!n.leido && <Badge size="xs" variant="filled" color="blue">Nuevo</Badge>}
                                            </Group>
                                            <Text size="sm" c="gray.7" mb={8} style={{ lineHeight: 1.4 }}>
                                                {n.mensaje}
                                            </Text>
                                            <Group justify="space-between" align="center">
                                                <Text size="xs" c="dimmed" fs="italic">
                                                    {dayjs(n.created_at).fromNow()}
                                                </Text>
                                                {n.leido && (
                                                    <Text size="xs" c="dimmed" fw={500}>Visto</Text>
                                                )}
                                            </Group>
                                        </div>
                                    </Group>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </ScrollArea.Autosize>
            </Drawer>
        </>
    );
}
