import { useState, useEffect } from 'react';
import { Popover, ActionIcon, Indicator, Paper, Text, ScrollArea, Group, Stack, Button, ThemeIcon, Badge } from '@mantine/core';
import { IconBell, IconCheck, IconTrash, IconInfoCircle, IconAlertTriangle, IconExclamationCircle } from '@tabler/icons-react';
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
            .limit(20);

        // Filter by user or specific logic if needed (RLS handles most)

        const { data } = await query;
        if (data) {
            setNotifications(data);
            setUnreadCount(data.filter((n: any) => !n.leido).length);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // Realtime subscription handled in App.tsx or here? 
        // Plan said App.tsx for Toasts, but we need to refresh list here too.
        // Let's add a listener here as well to keep the list fresh.
        const subscription = supabase
            .channel('public:notificaciones')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, (payload) => {
                console.log('New notification received', payload);
                fetchNotifications();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const markAsRead = async (id: number) => {
        await supabase.from('notificaciones').update({ leido: true }).eq('id', id);
        // Optimistic update
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
        // Delete all visible notifications for user
        // Note: Logic might need to be "delete my notifications"
        const ids = notifications.map(n => n.id);
        if (ids.length === 0) return;

        await supabase.from('notificaciones').delete().in('id', ids);
        setNotifications([]);
        setUnreadCount(0);
    };

    const getIcon = (tipo: string) => {
        switch (tipo) {
            case 'warning': return <IconAlertTriangle size={16} />;
            case 'error': return <IconExclamationCircle size={16} />;
            case 'success': return <IconCheck size={16} />;
            default: return <IconInfoCircle size={16} />;
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
        <Popover width={350} position="bottom-end" withArrow shadow="md" opened={opened} onChange={setOpened}>
            <Popover.Target>
                <Indicator inline label={unreadCount} size={16} disabled={unreadCount === 0} color="red" offset={4}>
                    <ActionIcon
                        variant="light"
                        color="blue"
                        radius="xl"
                        size="lg"
                        className="shadow-sm"
                        onClick={() => setOpened((o) => !o)}
                    >
                        <IconBell size={20} stroke={1.5} />
                    </ActionIcon>
                </Indicator>
            </Popover.Target>

            <Popover.Dropdown p={0}>
                <Paper className="flex flex-col h-[400px]">
                    <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <Text size="sm" fw={700}>Notificaciones</Text>
                        <Group gap={5}>
                            {unreadCount > 0 && (
                                <Button variant="subtle" size="xs" onClick={markAllAsRead}>
                                    Marcar leídas
                                </Button>
                            )}
                            {notifications.length > 0 && (
                                <ActionIcon variant="subtle" color="gray" size="sm" onClick={clearAll} title="Limpiar todo">
                                    <IconTrash size={14} />
                                </ActionIcon>
                            )}
                        </Group>
                    </div>

                    <ScrollArea className="flex-1 bg-white">
                        {notifications.length === 0 ? (
                            <Stack align="center" justify="center" h={300} gap="xs" c="dimmed">
                                <IconBell size={32} stroke={1.5} />
                                <Text size="sm">No tienes notificaciones</Text>
                            </Stack>
                        ) : (
                            <Stack gap={0}>
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={`p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!n.leido ? 'bg-blue-50/50' : ''}`}
                                        onClick={() => !n.leido && markAsRead(n.id)}
                                    >
                                        <Group wrap="nowrap" align="flex-start">
                                            <ThemeIcon size="md" radius="xl" color={getColor(n.tipo)} variant="light">
                                                {getIcon(n.tipo)}
                                            </ThemeIcon>
                                            <div className="flex-1">
                                                <Group justify="space-between" mb={2}>
                                                    <Text size="sm" fw={n.leido ? 500 : 700} lineClamp={1}>
                                                        {n.titulo}
                                                    </Text>
                                                    {!n.leido && <Badge size="xs" circle p={4} color="red" variant="filled" />}
                                                </Group>
                                                <Text size="xs" c="dimmed" lineClamp={2} mb={4}>
                                                    {n.mensaje}
                                                </Text>
                                                <Text size="xs" c="dimmed" fs="italic">
                                                    {dayjs(n.created_at).fromNow()}
                                                </Text>
                                            </div>
                                        </Group>
                                    </div>
                                ))}
                            </Stack>
                        )}
                    </ScrollArea>
                </Paper>
            </Popover.Dropdown>
        </Popover>
    );
}
