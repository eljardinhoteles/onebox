import { Modal, Stack, ThemeIcon, Title, Text, Badge, Divider } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

export function AboutModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
    return (
        <Modal opened={opened} onClose={onClose} title="Información del Sistema" centered radius="md">
            <Stack align="center" gap="md" py="xl">
                <ThemeIcon size={64} radius="xl" variant="light" color="blue">
                    <IconInfoCircle size={32} />
                </ThemeIcon>
                <Stack gap={0} align="center">
                    <Title order={3}>Kajitta</Title>
                    <Text size="sm" c="dimmed">Sistema de Gestión de Cajas Chicas</Text>
                </Stack>
                <Badge variant="dot" size="lg">Versión 1.5.1</Badge>
                <Divider w="100%" />
                <Text size="xs" c="dimmed" fw={500}>
                    Creado en 2026 por Tere & Matt
                </Text>
            </Stack>
        </Modal>
    );
}
