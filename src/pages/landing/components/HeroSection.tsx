import { Box, Container, Badge, Title, Text, Group, Button, Modal, AspectRatio, Image, Paper, SimpleGrid, ThemeIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { motion } from 'framer-motion';
import { IconArrowRight, IconPlayerPlay, IconCheck } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import cajaHero1 from '../../../assets/3x/caja_hero_1.png';
import cajaHero2 from '../../../assets/3x/caja_hero_2.png';
import cajaHero3 from '../../../assets/3x/caja_hero_3.png';

// Componente local para "Features" más destacados en el Hero
function HeroFeatureCheck({ children }: { children: React.ReactNode }) {
    return (
        <Group gap="md" wrap="nowrap" align="center">
            <ThemeIcon size={32} radius="xl" color="blue" variant="light" style={{ flexShrink: 0 }}>
                <IconCheck size={20} stroke={2.5} />
            </ThemeIcon>
            <Text size="lg" fw={600} c="dark.8" lh={1.3}>
                {children}
            </Text>
        </Group>
    );
}

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
                        ¿Sigues controlando la caja chica en{' '}
                        <Text
                            component="span"
                            inherit
                            className="hero-title-gradient"
                        >
                            Excel?
                        </Text>
                    </Title>

                    <Text size="lg" c="dimmed" maw={740} mx="auto" mb="sm" lh={1.7}>
                        Un Excel roto, recibos extraviados, columnas que no cuadran y horas de trabajo
                        para descubrir un faltante de $5. ¿Existe una forma mejor? Sí, integra en tu flujo contable:{' '}
                        <Text component="span" fw={600} c="blue.6">Mi Caja Chica</Text>, el único sistema de gestión
                        de efectivo diseñado para el régimen fiscal del Ecuador, desde cualquier sucursal, en tiempo real.
                    </Text>

                    {/* Core Feature Panel (Unificado con el Hero) */}
                    <Box mt={20} pos="relative">
                        <Box
                            pos="absolute"
                            top={-20}
                            left={-20}
                            right={-20}
                            bottom={-20}
                            style={{
                                background: 'radial-gradient(ellipse at center, rgba(34, 139, 230, 0.15) 0%, rgba(255,255,255,0) 70%)',
                                zIndex: -1,
                                borderRadius: '50%'
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        >
                            <Box pt={40} pb={20} mx={{ base: 0, md: '-lg' }}>
                                {/* Vista Desktop: Grid (No solapado) */}
                                <Box display={{ base: 'none', md: 'block' }}>
                                    <SimpleGrid cols={3} spacing="xl" w="100%" mx="auto">
                                        <motion.div
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.8, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                        >
                                            <Image src={cajaHero2} radius="lg" style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.05)', width: '100%', height: 'auto', transform: 'perspective(1000px) rotateY(15deg) scale(1.2)', transformOrigin: 'right center' }} />
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.8, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
                                            style={{ zIndex: 2 }}
                                        >
                                            <Box
                                                style={{
                                                    position: 'relative'
                                                }}
                                                className="hero-main-image-wrapper"
                                            >
                                                <Image
                                                    src={cajaHero1}
                                                    radius="lg"
                                                    style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.05)', width: '100%', height: 'auto', scale: 1.3 }}
                                                />
                                            </Box>
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.8, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
                                        >
                                            <Image src={cajaHero3} radius="lg" style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.05)', width: '100%', height: 'auto', transform: 'perspective(1000px) rotateY(-15deg) scale(1.2)', transformOrigin: 'left center' }} />
                                        </motion.div>
                                    </SimpleGrid>
                                </Box>

                                {/* Vista Móvil: Solapamiento tipo abanico */}
                                <Box display={{ base: 'block', md: 'none' }} pos="relative" h={{ base: 240, xs: 280 }} w="100%" mx="auto">
                                    {/* Izquierda */}
                                    <Box
                                        component={motion.div}
                                        initial={{ opacity: 0, x: '-50%', y: 40 }}
                                        animate={{ opacity: 0.85, x: 'calc(-50% - 32%)', y: 20, rotate: -8, scale: 0.9 }}
                                        transition={{ duration: 0.8, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                        pos="absolute"
                                        left="50%"
                                        w={{ base: '60%', xs: '55%' }}
                                        style={{ zIndex: 1 }}
                                    >
                                        <Image src={cajaHero2} radius="lg" style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }} />
                                    </Box>

                                    {/* Derecha */}
                                    <Box
                                        component={motion.div}
                                        initial={{ opacity: 0, x: '-50%', y: 40 }}
                                        animate={{ opacity: 0.85, x: 'calc(-50% + 32%)', y: 20, rotate: 8, scale: 0.9 }}
                                        transition={{ duration: 0.8, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
                                        pos="absolute"
                                        left="50%"
                                        w={{ base: '60%', xs: '55%' }}
                                        style={{ zIndex: 1 }}
                                    >
                                        <Image src={cajaHero3} radius="lg" style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }} />
                                    </Box>

                                    {/* Centro */}
                                    <Box
                                        component={motion.div}
                                        initial={{ opacity: 0, x: '-50%', y: 40 }}
                                        animate={{ opacity: 1, x: '-50%', y: 0, scale: 1 }}
                                        transition={{ duration: 0.8, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
                                        pos="absolute"
                                        left="50%"
                                        w={{ base: '70%', xs: '65%' }}
                                        style={{ zIndex: 2 }}
                                    >
                                        <Image src={cajaHero1} radius="lg" style={{ boxShadow: '0 32px 64px -16px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.05)' }} />
                                    </Box>
                                </Box>
                            </Box>

                            <Paper
                                p={{ base: 'md', md: 'xl' }}
                                bg="transparent"
                                style={{ textAlign: 'left' }}
                                mt={20} // Hacer que esté más pegado a las imágenes (ahora las imágenes son grandes)
                            >
                                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" mt="xs">
                                    <HeroFeatureCheck>Vista consolidada de todos las cajas activas</HeroFeatureCheck>
                                    <HeroFeatureCheck>Apertura formal con saldo base registrado</HeroFeatureCheck>
                                    <HeroFeatureCheck>Cierre guiado paso a paso, bloqueado contra ediciones</HeroFeatureCheck>
                                    <HeroFeatureCheck>Control de recaudacion de retenciones</HeroFeatureCheck>
                                </SimpleGrid>
                            </Paper>

                            <Group justify="center" gap="md" mt={40}>
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
                        </motion.div>
                    </Box>

                    <Text size="xs" c="dimmed" mt="lg" ta="center">
                        Sin tarjeta de crédito · Configuración en minutos
                    </Text>
                </Box>
            </Container>
        </Box>
    );
}
