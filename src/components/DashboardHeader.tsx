import { Group, Title, Paper, ActionIcon, Avatar, Stack, Text, rem, Tooltip, Flex } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    onBack?: () => void;
}

export function DashboardHeader({ title, subtitle, actions, onBack }: HeaderProps) {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    return (
        <Paper
            withBorder
            shadow="sm"
            p="sm"
            radius="md"
            bg="white"
            className="no-print"
        >
            <Flex
                direction={{ base: 'column', sm: 'row' }}
                justify="space-between"
                align={{ base: 'stretch', sm: 'center' }}
                gap="sm"
            >
                <Group gap="sm" justify="space-between" style={{ width: '100%' }}>
                    <Group gap="sm">
                        {onBack && (
                            <ActionIcon variant="subtle" color="gray" onClick={onBack} size="lg" radius="xl">
                                <IconArrowLeft style={{ width: rem(22), height: rem(22) }} stroke={1.5} />
                            </ActionIcon>
                        )}
                        <Stack gap={0}>
                            <Title
                                order={2}
                                fw={700}
                                size="h4"
                                c="dark"
                            >
                                {title}
                            </Title>
                            {subtitle && <Text size="xs" c="dimmed" fw={500} lineClamp={1}>{subtitle}</Text>}
                        </Stack>
                    </Group>
                </Group>

                <Group gap="sm" justify="flex-end" style={{ width: '100%' }}>
                    {actions}
                    <NotificationCenter />
                    <Tooltip label={user?.email || 'Usuario'} withArrow>
                        <Avatar radius="xl" src={null} color="blue" alt={user?.email} size="md" />
                    </Tooltip>
                </Group>
            </Flex>
        </Paper>
    );
}
