import { Box, Container, Badge, Title, Text, Group, Button, Modal, AspectRatio } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { motion } from 'framer-motion';
import { IconArrowRight, IconPlayerPlay } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export function HeroSection() {
    const navigate = useNavigate();
    const [opened, { open, close }] = useDisclosure(false);

    return (
        <Box className="hero-section">
            <div className="hero-blob-right" />
            <div className="hero-blob-left" />

            {/* Modal para el Video (VSL) */}
            <Modal
                opened={opened}
                onClose={close}
                title="Conoce Mi Caja Chica en Acción"
                size="xl"
                radius="md"
                centered
                styles={{
                    title: { fontWeight: 700 }, // Negrita para el título del modal
                }}
            >
                <AspectRatio ratio={16 / 9}>
                    <iframe
                        src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" // Placeholder: cambiar por el link real
                        title="Demostración Mi Caja Chica"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </AspectRatio>
            </Modal>

            <Container size="md" pos="relative" style={{ zIndex: 1 }}>
                <Box
                    component={motion.div}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                >
                    <Badge
                        color="blue"
                        variant="light"
                        size="md"
                        radius="sm"
                        mb="xl"
                        tt="uppercase"
                        fw={700}
                        leftSection={<span style={{ marginRight: 4 }}>🇪🇨</span>}
                    >
                        Optimizado para Ecuador · Cumplimiento SRI
                    </Badge>

                    <Title order={1} className="hero-title">
                        Tu fondo de caja chica,{' '}
                        <Text
                            component="span"
                            inherit
                            className="hero-title-gradient"
                        >
                            sin hojas de cálculo ni facturas perdidas
                        </Text>
                    </Title>

                    <Text size="lg" c="dimmed" maw={600} mx="auto" mb="xl" lh={1.7}>
                        El único software de caja chica diseñado para el régimen fiscal del Ecuador.
                        Controla tus fondos en USD, registra retenciones alineadas al SRI y rinde cuentas al centavo —
                        desde cualquier sucursal, en tiempo real.
                    </Text>

                    <Group justify="center" gap="md">
                        <Button
                            size="md"
                            radius="md"
                            variant="filled"
                            color="blue"
                            rightSection={<IconArrowRight size={18} />}
                            fw={600}
                            className="hero-cta-button"
                            onClick={() => navigate('/cajas')}
                        >
                            Empezar prueba de 14 días gratis
                        </Button>
                        <Button
                            size="md"
                            radius="md"
                            variant="default"
                            leftSection={<IconPlayerPlay size={18} />}
                            fw={600}
                            onClick={open}
                        >
                            Ver demostración en video
                        </Button>
                    </Group>

                    <Text size="xs" c="dimmed" mt="lg">
                        Sin tarjeta de crédito · Configuración en minutos
                    </Text>
                </Box>
            </Container>
        </Box>
    );
}
