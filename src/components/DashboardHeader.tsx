import { Group, Title, Paper, ActionIcon, Avatar, rem, Tooltip, Flex } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { NotificationCenter } from './NotificationCenter';
import { motion } from 'framer-motion';

interface HeaderProps {
    title: string;
    subtitle?: string; // Mantener por compatibilidad pero no renderizar
    actions?: React.ReactNode;
    onBack?: () => void;
}

export function DashboardHeader({ title, actions, onBack }: HeaderProps) {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                width: '100%',
            }}
        >
            <Paper
                shadow="sm"
                px="xl"
                py="md"
                radius={0}
                style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                }}
                className="no-print"
            >
                <Flex
                    direction="row"
                    justify="space-between"
                    align="center"
                    gap="md"
                >
                    <Group gap="md">
                        {onBack && (
                            <ActionIcon variant="subtle" color="gray" onClick={onBack} size="lg" radius="md">
                                <IconArrowLeft style={{ width: rem(20), height: rem(20) }} stroke={2} />
                            </ActionIcon>
                        )}
                        <Title
                            order={1}
                            fw={900}
                            size="h3"
                            c="dark"
                            style={{ letterSpacing: '-1px' }}
                        >
                            {title}
                        </Title>
                    </Group>

                    <Group gap="sm">
                        {actions}
                        <NotificationCenter />
                        <Tooltip label={user?.email || 'Usuario'} withArrow position="bottom">
                            <Avatar
                                radius="md"
                                color="blue"
                                size="md"
                                variant="light"
                                style={{ cursor: 'help' }}
                            >
                                {user?.email?.charAt(0).toUpperCase() || '?'}
                            </Avatar>
                        </Tooltip>
                    </Group>
                </Flex>
            </Paper>
        </motion.div>
    );
}
