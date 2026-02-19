import { Paper, Stack, Group, Title, Text, Badge, Divider, SimpleGrid, Button } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

export function AboutSection() {
    return (
        <Stack gap="lg">
            <Paper withBorder p="xl" radius="lg">
                <Stack gap="xl">
                    <Group justify="space-between" align="flex-start">
                        <Stack gap={4}>
                            <Title order={3}>Kajitta</Title>
                            <Text size="sm" c="dimmed">Sistema Integral de Gestión de Cajas</Text>
                        </Stack>
                        <Badge size="lg" variant="light" color="blue">v1.5.40 stable</Badge>
                    </Group>

                    <Divider />

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
                        <Stack gap="xs">
                            <Text fw={700} size="sm" c="dimmed" tt="uppercase">Estado de Suscripción</Text>
                            <Group gap="xs">
                                <Badge size="xl" color="teal" variant="filled">Plan Enterprise</Badge>
                                <Text size="sm" fw={600} c="teal">Activa e Ilimitada</Text>
                            </Group>
                            <Text size="xs" c="dimmed">Tu suscripción no tiene fecha de vencimiento y permite usuarios ilimitados.</Text>
                        </Stack>

                        <Stack gap="xs">
                            <Text fw={700} size="sm" c="dimmed" tt="uppercase">Créditos</Text>
                            <Stack gap={2}>
                                <Text size="sm" fw={600}>Desarrollado por Tere & Matt</Text>
                                <Text size="xs" c="dimmed">© 2026 Todos los derechos reservados.</Text>
                            </Stack>
                        </Stack>
                    </SimpleGrid>

                    <Divider />

                    <Stack gap="xs">
                        <Text fw={700} size="sm" c="dimmed" tt="uppercase">Soporte Técnico</Text>
                        <Group gap="sm">
                            <Button variant="light" size="xs" radius="md">Documentación</Button>
                            <Button variant="light" color="gray" size="xs" radius="md">Reportar Bug</Button>
                        </Group>
                    </Stack>
                </Stack>
            </Paper>

            <Paper withBorder p="md" radius="md" bg="blue.0">
                <Group gap="xs">
                    <IconInfoCircle size={18} color="var(--mantine-color-blue-6)" />
                    <Text size="xs" fw={500} c="blue.8">
                        Este sistema utiliza tecnología de sincronización en tiempo real con Supabase.
                        Asegúrate de tener una conexión estable para garantizar la integridad de los datos.
                    </Text>
                </Group>
            </Paper>
        </Stack>
    );
}
