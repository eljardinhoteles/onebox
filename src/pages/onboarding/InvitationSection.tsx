
import { Stack, Text, Card, Group, Avatar, Button } from '@mantine/core';
import { IconBuilding } from '@tabler/icons-react';

interface InvitationSectionProps {
    invitations: any[];
    handleAccept: (inv: any) => void;
}

export function InvitationSection({ invitations, handleAccept }: InvitationSectionProps) {
    if (invitations.length === 0) return null;

    return (
        <Stack gap="md">
            <Text fw={700}>Invitaciones Pendientes</Text>
            {invitations.map(inv => (
                <Card key={inv.id} withBorder p="md" radius="md" bg="gray.0">
                    <Group justify="space-between">
                        <Group gap="md">
                            <Avatar color="blue" radius="xl"><IconBuilding size={20} /></Avatar>
                            <Stack gap={0}>
                                <Text fw={600}>{inv.empresas?.nombre}</Text>
                                <Text size="xs" c="dimmed">Rol: {inv.role}</Text>
                            </Stack>
                        </Group>
                        <Button size="xs" onClick={() => handleAccept(inv)}>Aceptar</Button>
                    </Group>
                </Card>
            ))}
        </Stack>
    );
}
