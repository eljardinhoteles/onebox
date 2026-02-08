import { useState, useEffect } from 'react';
import { Popover, ActionIcon, Indicator, Paper, Text, ScrollArea, Group, Stack, ThemeIcon, Badge, rem, UnstyledButton, Tooltip } from '@mantine/core';
import { IconBell, IconCheck, IconTrash, IconInfoCircle, IconAlertTriangle, IconExclamationCircle, IconBellOff } from '@tabler/icons-react';
import { supabase } from '../lib/supabaseClient';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
import { motion, AnimatePresence } from 'framer-motion';

dayjs.extend(relativeTime);
dayjs.locale('es');

export function NotificationCenter() {
    const [opened, setOpened] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        const { data } = await supabase
            .from('notificaciones')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(15);

        if (data) {
            setNotifications(data);
            setUnreadCount(data.filter((n: any) => !n.leido).length);
        }
    };

    useEffect(() => {
        fetchNotifications();

        const subscription = supabase
            .channel('public:notificaciones')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones' }, () => {
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
            case 'warning': return <IconAlertTriangle size={14} />;
            case 'error': return <IconExclamationCircle size={14} />;
            case 'success': return <IconCheck size={14} />;
            default: return <IconInfoCircle size={14} />;
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
        <Popover
            width={400}
            position="bottom-end"
            withArrow
            shadow="xl"
            opened={opened}
            onChange={setOpened}
            transitionProps={{ transition: 'pop-top-right', duration: 200 }}
            radius="lg"
            offset={12}
        >
            <Popover.Target>
                <Indicator
                    inline
                    label={unreadCount > 9 ? '+9' : unreadCount}
                    size={rem(18)}
                    disabled={unreadCount === 0}
                    color="red.6"
                    offset={4}
                    withBorder
                    processing
                >
                    <ActionIcon
                        variant="gradient"
                        gradient={{ from: 'blue.5', to: 'indigo.7', deg: 45 }}
                        radius="xl"
                        size="lg"
                        onClick={() => setOpened((o) => !o)}
                        style={{ boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                    >
                        <IconBell size={20} stroke={2} color="white" />
                    </ActionIcon>
                </Indicator>
            </Popover.Target>

            <Popover.Dropdown p={0} style={{ overflow: 'hidden', border: '1px solid var(--mantine-color-gray-2)' }}>
                <Paper bg="gray.0" className="flex flex-col max-h-[500px]">
                    <div className="p-4 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                        <Group justify="space-between">
                            <Stack gap={0}>
                                <Text size="md" fw={800} c="blue.9">Notificaciones</Text>
                                <Text size="xs" c="dimmed">{unreadCount} pendientes por leer</Text>
                            </Stack>
                            <Group gap={4}>
                                {unreadCount > 0 && (
                                    <Tooltip label="Marcar todas como leídas" withArrow radius="md">
                                        <ActionIcon variant="light" color="blue" onClick={markAllAsRead} radius="md">
                                            <IconCheck size={16} />
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                                {notifications.length > 0 && (
                                    <Tooltip label="Limpiar todas" withArrow radius="md">
                                        <ActionIcon variant="light" color="red" onClick={clearAll} radius="md">
                                            <IconTrash size={16} />
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </Group>
                        </Group>
                    </div>

                    <ScrollArea.Autosize mah={400} type="hover" scrollbarSize={6}>
                        {notifications.length === 0 ? (
                            <Stack align="center" justify="center" p={40} gap="sm">
                                <ThemeIcon size={64} radius="xl" color="gray.1" variant="light">
                                    <IconBellOff size={32} color="var(--mantine-color-gray-4)" />
                                </ThemeIcon>
                                <Text size="sm" fw={600} c="gray.5">¡Estás al día!</Text>
                                <Text size="xs" c="dimmed" ta="center">No hay nuevas notificaciones por el momento</Text>
                            </Stack>
                        ) : (
                            <div className="p-2">
                                <AnimatePresence initial={false}>
                                    {notifications.map((n) => (
                                        <motion.div
                                            key={n.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <UnstyledButton
                                                w="100%"
                                                p="md"
                                                mb={4}
                                                onClick={() => !n.leido && markAsRead(n.id)}
                                                style={{
                                                    borderRadius: 'var(--mantine-radius-md)',
                                                    backgroundColor: n.leido ? 'transparent' : 'white',
                                                    border: n.leido ? '1px solid transparent' : '1px solid var(--mantine-color-blue-1)',
                                                    boxShadow: n.leido ? 'none' : 'var(--mantine-shadow-xs)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                className="hover:shadow-md hover:bg-white"
                                            >
                                                <Group wrap="nowrap" align="flex-start" gap="md">
                                                    <ThemeIcon size="md" radius="md" color={getColor(n.tipo)} variant="light">
                                                        {getIcon(n.tipo)}
                                                    </ThemeIcon>
                                                    <div style={{ flex: 1 }}>
                                                        <Group justify="space-between" mb={2}>
                                                            <Text size="sm" fw={n.leido ? 600 : 800} c={n.leido ? 'gray.7' : 'blue.9'}>
                                                                {n.titulo}
                                                            </Text>
                                                            {!n.leido && (
                                                                <Badge size="xs" color="blue" variant="filled">Nuevo</Badge>
                                                            )}
                                                        </Group>
                                                        <Text size="xs" c={n.leido ? 'dimmed' : 'gray.8'} lineClamp={3} mb={6}>
                                                            {n.mensaje}
                                                        </Text>
                                                        <Text size="xs" c="dimmed" fw={500}>
                                                            {dayjs(n.created_at).fromNow()}
                                                        </Text>
                                                    </div>
                                                </Group>
                                            </UnstyledButton>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </ScrollArea.Autosize>

                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-gray-100 bg-white">
                            <Text size="xs" c="dimmed" ta="center" fw={500}>
                                Mostrando las últimas 15 notificaciones
                            </Text>
                        </div>
                    )}
                </Paper>
            </Popover.Dropdown>
        </Popover>
    );
}
