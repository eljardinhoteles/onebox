import { Box, Container, Group, Text, Button, Divider, Stack, Anchor } from '@mantine/core';
import { IconBrandWhatsapp, IconMail, IconArrowRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import IconSvg from '../../../assets/Icon.svg';

export function FinalCtaAndFooter() {
    const navigate = useNavigate();

    return (
        <Box component="footer" py={60} bg="gray.0" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
            <Container size="xl">
                <Group justify="space-between" align="flex-start" mb={40} wrap="wrap">
                    <Stack gap="xs" style={{ minWidth: 200 }}>
                        <Group gap="xs">
                            <img src={IconSvg} alt="Mi Caja Chica" style={{ width: 32, height: 32 }} />
                            <Text fw={800} size="lg" c="blue.9">Mi Caja Chica</Text>
                        </Group>
                        <Text size="sm" c="dimmed" maw={300}>
                            El sistema de gestión de efectivo diseñado para el régimen contable del Ecuador.
                        </Text>
                    </Stack>

                    <Group gap={60} wrap="wrap">
                        <Stack gap="xs">
                            <Text fw={700} size="sm" tt="uppercase" c="dark.9" mb={4}>Soporte</Text>
                            <Anchor href="https://wa.me/593988200451" target="_blank" c="dimmed" underline="never">
                                <Group gap="xs">
                                    <IconBrandWhatsapp size={16} />
                                    <Text size="sm">+593 988 200 451</Text>
                                </Group>
                            </Anchor>
                            <Anchor href="mailto:soporte@micajachica.com" c="dimmed" underline="never">
                                <Group gap="xs">
                                    <IconMail size={16} />
                                    <Text size="sm">soporte@micajachica.com</Text>
                                </Group>
                            </Anchor>
                        </Stack>

                        <Stack gap="xs" align="flex-start">
                            <Text fw={700} size="sm" tt="uppercase" c="dark.9" mb={4}>Acceso</Text>
                            <Button
                                variant="light"
                                color="blue"
                                radius="md"
                                size="sm"
                                rightSection={<IconArrowRight size={16} />}
                                onClick={() => navigate('/cajas?mode=login')}
                            >
                                Iniciar sesión
                            </Button>
                        </Stack>
                    </Group>
                </Group>

                <Divider mb="xl" color="gray.2" />

                <Group justify="space-between" align="center" gap="md" wrap="wrap">
                    <Text size="xs" c="dimmed">
                        © {new Date().getFullYear()} Mi Caja Chica · Todos los derechos reservados
                    </Text>
                    <Group gap="xl">
                        <Text size="xs" c="dimmed">USD (Dólar Americano)</Text>
                        <Text size="xs" c="dimmed">ES (Ecuador)</Text>
                    </Group>
                </Group>
            </Container>
        </Box>
    );
}
