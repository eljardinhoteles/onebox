import { Group, Stack, Title, Text, ActionIcon, Button } from '@mantine/core';
import { IconInfoCircle, IconLogout } from '@tabler/icons-react';

interface AjustesHeaderProps {
    perfil: any;
    user: any;
    onAbout: () => void;
    onLogout: () => void;
}

export function AjustesHeader({ perfil, user, onAbout, onLogout }: AjustesHeaderProps) {
    return (
        <Group justify="space-between" align="center">
            <Stack gap={4}>
                <Title order={2} fw={700}>Ajustes</Title>
                <Text size="sm" c="dimmed">
                    {perfil?.nombre ? `${perfil.nombre} ${perfil.apellido || ''}` : 'Usuario'}: {user?.email}
                </Text>
            </Stack>

            <Group gap="xs">
                <ActionIcon variant="light" color="blue" size="lg" radius="md" onClick={onAbout} title="Acerca del sistema">
                    <IconInfoCircle size={20} />
                </ActionIcon>
                <Button variant="light" color="red" leftSection={<IconLogout size={16} />} onClick={onLogout} radius="md" size="sm">
                    Cerrar Sesión
                </Button>
            </Group>
        </Group>
    );
}
