import { Box, Container, Group, Avatar, Title, Text, Button } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconBuildingBank } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import IconSvg from '../../../assets/Icon.svg';

export function FinalCtaAndFooter() {
    const navigate = useNavigate();

    return (
        <>
            <Box py={100} bg="blue.9" ta="center" pos="relative" style={{ overflow: 'hidden' }}>
                {/* Opcional: elementos decorativos sutiles para el modo oscuro */}
                <Box
                    pos="absolute"
                    top="-50%"
                    left="-10%"
                    w={500}
                    h={500}
                    style={{
                        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(0,0,0,0) 70%)',
                        borderRadius: '50%',
                        zIndex: 0
                    }}
                />

                <Container size="sm" pos="relative" style={{ zIndex: 1 }}>
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    >
                        {/* Avatar stack — social proof */}
                        <Group justify="center" mb="xl" gap={0}>
                            <Avatar.Group>
                                {['AB', 'CM', 'LR', 'PQ'].map((initials, index) => (
                                    <Avatar
                                        key={initials}
                                        name={initials}
                                        color={['blue', 'teal', 'orange', 'violet'][index]}
                                        variant="filled"
                                        size="md"
                                        radius="xl"
                                        style={{ border: '2px solid var(--mantine-color-blue-9)' }}
                                    />
                                ))}
                            </Avatar.Group>
                            <Text size="sm" c="blue.1" fw={600} ml="md">
                                +120 empresas ya gestionan su caja chica con nosotros
                            </Text>
                        </Group>

                        <Title order={2} fw={800} c="white" mb="md">
                            Deja de perder tiempo cuadrando la caja chica
                        </Title>
                        <Text c="blue.1" size="lg" mb={40} maw={500} mx="auto" lh={1.6}>
                            14 días gratis, sin tarjeta ni compromisos. Configura tu primer fondo
                            en minutos y siente la diferencia desde el primer cierre.
                        </Text>

                        <Group justify="center" gap="md">
                            <Button
                                size="lg"
                                radius="md"
                                variant="white"
                                color="blue.9"
                                fw={700}
                                rightSection={<IconBuildingBank size={20} />}
                                className="hero-cta-button"
                                onClick={() => navigate('/cajas')}
                            >
                                Crear cuenta gratis ahora
                            </Button>
                        </Group>
                    </Box>
                </Container>
            </Box>

            <Box component="footer" py="xl" bg="gray.0" ta="center" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                <Container size="xl">
                    <Group justify="space-between" align="center" gap="md">
                        <Group gap="xs">
                            <img src={IconSvg} alt="Mi Caja Chica" style={{ width: 24, height: 24 }} />
                            <Text fw={700} size="sm" c="blue.9">Mi Caja Chica</Text>
                        </Group>
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
        </>
    );
}
