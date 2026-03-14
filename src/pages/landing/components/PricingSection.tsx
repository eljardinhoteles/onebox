import { Box, Container, Text, Title, Group, Badge, Paper, Stack, Button, SimpleGrid, Card, Divider, rem, Avatar } from '@mantine/core';
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
                        Seleccione el plan adecuado para su empresa
                    </Text>
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
                        <Card withBorder radius="md" padding="xl" shadow="sm" bg="white" style={{ display: 'flex', flexDirection: 'column' }}>
                            <Stack gap={4} mb="md">
                                <Text fw={700} size="lg" c="dark.9">Plan Mensual</Text>
                                <Text c="dimmed" size="sm">Control total pagando mes a mes.</Text>
                            </Stack>

                            <Group align="baseline" gap={4} mb="md">
                                <Text fw={900} c="blue.9" style={{ fontSize: rem(48), lineHeight: 1 }}>
                                    ${precios.mensual}
                                </Text>
                                <Text fw={700} c="blue.9" size="sm">USD</Text>
                                <Text c="dimmed" size="sm">/mes</Text>
                            </Group>

                            <Divider mb="xl" color="gray.1" />

                            <Stack gap="xs" mb={40} style={{ flex: 1 }}>
                                <FeatureCheck>Hasta <strong>20 Usuarios</strong></FeatureCheck>
                                <FeatureCheck><strong>20 Sucursales</strong> integradas</FeatureCheck>
                                <FeatureCheck>Cajas y transacciones ilimitadas</FeatureCheck>
                                <FeatureCheck>Reportes ilimitados (Excel/PDF)</FeatureCheck>
                                <FeatureCheck>Gestión de proveedores ilimitada</FeatureCheck>
                                <FeatureCheck>Actualizaciones del sistema</FeatureCheck>
                                <FeatureCheck>Cajas históricas limitadas</FeatureCheck>
                                <FeatureCheck>Soporte técnico estándar</FeatureCheck>
                            </Stack>

                            <Button fullWidth variant="light" color="blue" radius="md" size="md" onClick={() => navigate('/cajas?mode=register')}>
                                Elegir Plan Mensual
                            </Button>
                        </Card>

                        {/* ── Plan Anual ── */}
                        <Card withBorder radius="md" padding="xl" shadow="md" className="pricing-card-annual" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div className="pricing-bubble" />

                            <Stack gap={4} mb="md" pos="relative">
                                <Group justify="space-between">
                                    <Text fw={700} size="lg" c="white">Plan Anual</Text>
                                    {ahorroAnual > 0 && <Badge variant="filled" color="teal">Ahorra ${ahorroAnual} / año</Badge>}
                                </Group>
                                <Text className="text-dimmed-white" size="sm">La opción preferida por empresas sólidas.</Text>
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

                            <Stack gap="xs" mb={40} pos="relative" style={{ flex: 1 }}>
                                <FeatureCheck white><strong>Todo lo del Plan Mensual</strong></FeatureCheck>
                                <FeatureCheck white><strong>Cajas históricas ilimitadas</strong></FeatureCheck>
                                <FeatureCheck white>Bitácora de control de movimientos</FeatureCheck>
                                <FeatureCheck white>Personalización de reportes</FeatureCheck>
                                <FeatureCheck white>Acceso a características nuevas</FeatureCheck>
                                <FeatureCheck white>Asesoría en implementación</FeatureCheck>
                                <FeatureCheck white>Soporte prioritario 24/7</FeatureCheck>
                            </Stack>

                            <Button
                                fullWidth
                                variant="white"
                                color="blue"
                                radius="md"
                                size="md"
                                fw={700}
                                style={{ position: 'relative' }}
                                onClick={() => navigate('/cajas?mode=register')}
                            >
                                Elegir Plan Anual
                            </Button>
                            <Text ta="center" size="xs" mt="sm" style={{ color: 'rgba(255,255,255,0.45)', position: 'relative' }}>
                                Prueba 14 días gratis · Sin tarjeta
                            </Text>
                        </Card>
                    </SimpleGrid>
                </Box>

                {/* ── Social Proof & Final CTA ── */}
                <Stack mt={80} align="center" gap="xl">
                    <Group justify="center" gap={0}>
                        <Avatar.Group>
                            {['AB', 'CM', 'LR', 'PQ'].map((initials, index) => (
                                <Avatar
                                    key={initials}
                                    name={initials}
                                    color={['blue', 'teal', 'orange', 'violet'][index]}
                                    variant="filled"
                                    size="md"
                                    radius="xl"
                                    style={{ border: '2px solid var(--mantine-color-gray-0)' }}
                                />
                            ))}
                        </Avatar.Group>
                        <Text size="sm" c="blue.9" fw={600} ml="md">
                            +120 empresas ya gestionan su caja chica con nosotros
                        </Text>
                    </Group>

                    {/* ── Banner: Trial 14 días (FINAL CTA) ── */}
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                        style={{ width: '100%' }}
                    >
                        <Paper
                            radius="md"
                            withBorder
                            maw={800}
                            mx="auto"
                            p="xl"
                            className="trial-banner"
                            shadow="sm"
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
                                    fw={700}
                                    size="md"
                                    rightSection={<IconArrowRight size={16} />}
                                    className="trial-button"
                                    onClick={() => navigate('/cajas?mode=register')}
                                >
                                    Comenzar prueba gratuita
                                </Button>
                            </Group>
                        </Paper>
                    </Box>
                </Stack>
            </Container>
        </Box>
    );
}
