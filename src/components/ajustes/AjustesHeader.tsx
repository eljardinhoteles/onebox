import { Group, Avatar, Title, Text, Paper, ActionIcon, Tooltip } from '@mantine/core';
import { IconLogout } from '@tabler/icons-react';
import { supabase } from '../../lib/supabaseClient';

interface AjustesHeaderProps {
    user: any;
    empresa: any;
}

export function AjustesHeader({ user, empresa }: AjustesHeaderProps) {
    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    return (
        <Paper withBorder p="md" radius="lg" bg="white">
            <Group justify="space-between" wrap="nowrap">
                <Group wrap="nowrap">
                    <Avatar size="md" radius="xl" color="blue" variant="light">
                        {empresa?.nombre?.[0] || 'E'}
                    </Avatar>
                    <div style={{ overflow: 'hidden' }}>
                        <Title order={3} size="h4" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {empresa?.nombre || 'Mi Empresa'}
                        </Title>
                        <Text c="dimmed" size="xs">{user?.email}</Text>
                    </div>
                </Group>

                <Tooltip label="Cerrar Sesión" position="left">
                    <ActionIcon
                        variant="light"
                        color="red"
                        size="lg"
                        radius="md"
                        onClick={handleLogout}
                    >
                        <IconLogout size={20} />
                    </ActionIcon>
                </Tooltip>
            </Group>
        </Paper>
    );
}
