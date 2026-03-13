import { Box, Container, Text, Title, Group, Badge, Paper, Stack, Button, SimpleGrid, Card, Divider, rem } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconArrowRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { FeatureCheck } from './LandingUtils';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';

export function PricingSection() {
    const navigate = useNavigate();
    const { precios } = usePlatformConfig();
    
    // Calcular el precio mensual del plan anual (ej: 204 / 12 = 17)
    const precioMensualAnual = Math.floor(precios.anual / 12);
    const ahorroAnual = (precios.mensual * 12) - precios.anual;

    return (
        <Box py={80} className="pricing-section" id="pricing">
            <Container size="xl">
                <Box ta="center" maw={480} mx="auto" mb={52}>
                    <Text
                        size="xs"
                        tt="uppercase"
                        fw={700}
                        c="dimmed"
                        mb="sm"
                        style={{ letterSpacing: '0.08em' }}
                    >
                        Precios
                    </Text>
                    <Title order={2} fw={800} c="dark.9" mb="sm">
                        Un precio justo. Sin sorpresas.
                    </Title>
                    <Group justify="center" gap="xs" mb="sm">
                        <Badge color="gray" variant="outline" size="sm">Precios en USD</Badge>
                        <Badge color="blue" variant="light" size="sm">Optimizado para Ecuador</Badge>
                    </Group>
                    <Text c="dimmed" size="sm">
                        20 usuarios · 20 sucursales · Cajas y transacciones ilimitadas.
                    </Text>
                </Box>

                {/* ── Banner: Trial 14 días ── */}
                <Box
                    component={motion.div}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                    mb={40}
                >
                    <Paper
                        radius="md"
                        withBorder
                        maw={800}
                        mx="auto"
                        p="xl"
                        className="trial-banner"
                    >
                        <Group justify="space-between" align="center" wrap="wrap" gap="lg">
                            <Stack gap={6} style={{ flex: 1, minWidth: 260 }}>
                                <Group gap="xs">
                                    <Badge color="blue" variant="filled" size="sm" radius="sm" tt="uppercase" fw={700}>
                                        14 días gratis
                                    </Badge>
                                    <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                                        Sin tarjeta de crédito
                                    </Text>
                                </Group>
                                <Text fw={700} size="lg" c="dark.9">
                                    Prueba el sistema completo antes de comprar
                                </Text>
                                <Text size="sm" c="dimmed" lh={1.6}>
                                    Acceso total a todas las funciones durante 14 días: abre fondos, registra gastos,
                                    cierra cajas y genera reportes. Sin restricciones — para que valides si el flujo
                                    encaja con tu empresa antes de comprometerte.
                                </Text>
                            </Stack>
                            <Button
                                variant="filled"
                                color="blue"
                                radius="md"
                                fw={600}
                                size="md"
                                rightSection={<IconArrowRight size={16} />}
                                className="trial-button"
                                onClick={() => navigate('/cajas')}
                            >
                                Comenzar prueba gratuita
                            </Button>
                        </Group>
                    </Paper>
                </Box>

                {/* ── Cards de planes ── */}
                <Box
                    component={motion.div}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                >
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" maw={800} mx="auto">

                        {/* ── Plan Mensual ── */}
                        <Card withBorder radius="md" padding="xl" shadow="sm" bg="white">
                            <Stack gap={4} mb="md">
                                <Text fw={700} size="lg" c="dark.9">Plan Mensual</Text>
                                <Text c="dimmed" size="sm">Paga mes a mes, cancela cuando quieras.</Text>
                            </Stack>

                            <Group align="baseline" gap={4} mb="md">
                                <Text fw={900} c="blue.9" style={{ fontSize: rem(48), lineHeight: 1 }}>
                                    ${precios.mensual}
                                </Text>
                                <Text fw={700} c="blue.9" size="sm">USD</Text>
                                <Text c="dimmed" size="sm">/mes</Text>
                            </Group>

                            <Divider mb="xl" color="gray.1" />

                            <Stack gap="md" mb={40}>
                                <FeatureCheck>Todas las funcionalidades</FeatureCheck>
                                <FeatureCheck>Soporte por correo</FeatureCheck>
                                <FeatureCheck>Actualizaciones incluidas</FeatureCheck>
                            </Stack>

                            <Button fullWidth variant="light" color="blue" radius="md" onClick={() => navigate('/cajas')}>
                                Elegir Plan Mensual
                            </Button>
                        </Card>

                        {/* ── Plan Anual ── */}
                        <Card withBorder radius="md" padding="xl" shadow="md" className="pricing-card-annual">
                            <div className="pricing-bubble" />

                            <Stack gap={4} mb="md" pos="relative">
                                <Group justify="space-between">
                                    <Text fw={700} size="lg" c="white">Plan Anual</Text>
                                    {ahorroAnual > 0 && <Badge variant="filled" color="teal">Ahorra ${ahorroAnual} / año</Badge>}
                                </Group>
                                <Text className="text-dimmed-white" size="sm">Un solo pago anual, máxima tranquilidad.</Text>
                            </Stack>

                            <Group align="baseline" gap={4} mb={4} pos="relative">
                                <Text fw={900} c="white" style={{ fontSize: rem(48), lineHeight: 1 }}>
                                    ${precioMensualAnual}
                                </Text>
                                <Text fw={700} c="white" size="sm">USD</Text>
                                <Text className="text-dimmed-white" size="sm">/mes</Text>
                            </Group>

                            <Text className="text-dimmed-white" size="sm" mb="md" pos="relative">
                                Total anual: ${precios.anual} USD
                            </Text>

                            <Divider mb="xl" opacity={0.15} color="white" />

                            <Stack gap="md" mb={40} pos="relative">
                                <FeatureCheck white>Todas las funcionalidades</FeatureCheck>
                                <FeatureCheck white>Soporte prioritario 24/7</FeatureCheck>
                                <FeatureCheck white>Capacitación para tu equipo</FeatureCheck>
                                <FeatureCheck white>Backup mensual de auditoría</FeatureCheck>
                            </Stack>

                            <Button
                                fullWidth
                                variant="white"
                                color="blue"
                                radius="md"
                                fw={700}
                                style={{ position: 'relative' }}
                                onClick={() => navigate('/cajas')}
                            >
                                Elegir Plan Anual
                            </Button>
                            <Text ta="center" size="xs" mt="sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                Prueba 14 días gratis · Sin tarjeta
                            </Text>
                        </Card>
                    </SimpleGrid>
                </Box>
            </Container>
        </Box>
    );
}
