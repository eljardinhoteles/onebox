import { Box, Container, Text, Title, Stack, Paper, SimpleGrid, ThemeIcon, rem, Group, Badge } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconWallet, IconReceipt2, IconPhoto, IconListCheck, IconReceiptTax } from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
import { FeatureCheck, ImgPlaceholder } from './LandingUtils';

export function ProblemSection() {
    const isMobile = useMediaQuery('(max-width: 768px)');

    return (
        <Box py={80} bg="white">
            <Container size="xl">
                {/* Título de sección */}
                <Box ta="center" maw={600} mx="auto" mb={64}>
                    <Text
                        size="xs"
                        tt="uppercase"
                        fw={700}
                        c="dimmed"
                        mb="sm"
                        style={{ letterSpacing: '0.08em' }}
                    >
                        El problema
                    </Text>
                    <Title order={2} fw={800} c="dark.9" mb="md">
                        ¿Sigues controlando la caja chica en Excel?
                    </Title>
                    <Text c="dimmed" size="md" lh={1.7}>
                        Un Excel roto, recibos extraviados, columnas que no cuadran y horas de trabajo
                        para descubrir un faltante de $5. Existe una forma mejor.
                    </Text>
                </Box>

                <Stack gap={80}>
                    {/* Panel 1 — imagen derecha escritorio, abajo móvil */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <Paper
                            withBorder
                            radius="xl"
                            p={{ base: 'xl', md: 64 }}
                            shadow="md"
                            className="feature-panel"
                        >
                            <SimpleGrid cols={{ base: 1, md: 2 }} spacing={64} style={{ alignItems: 'center' }}>
                                <Stack gap="lg">
                                    <ThemeIcon size={52} radius="md" variant="light" color="blue">
                                        <IconWallet size={28} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb={4} style={{ letterSpacing: '0.08em' }}>Core</Text>
                                        <Title order={3} fw={800} c="dark.9" mb="sm" size={rem(32)}>
                                            Panel centralizado para todos tus fondos
                                        </Title>
                                        <Text c="dimmed" size="md" lh={1.7}>
                                            Administra múltiples cajas chicas desde un único panel.
                                            Cada fondo tiene su responsable, su sucursal y su umbral de alerta.
                                            El gerente ve todo — el cajero solo ve lo suyo.
                                        </Text>
                                    </div>
                                    <Stack gap="xs">
                                        <FeatureCheck>Vista consolidada de todos los fondos activos</FeatureCheck>
                                        <FeatureCheck>Apertura formal con saldo base registrado</FeatureCheck>
                                        <FeatureCheck>Cierre guiado paso a paso, bloqueado contra ediciones</FeatureCheck>
                                        <FeatureCheck>Filtros por sucursal para equipos multisede</FeatureCheck>
                                    </Stack>
                                </Stack>
                                <ImgPlaceholder label="Panel de fondos de caja chica" icon={IconPhoto} />
                            </SimpleGrid>
                        </Paper>
                    </motion.div>

                    {/* Panel 2 — imagen izquierda escritorio, abajo móvil */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <Paper
                            withBorder
                            radius="xl"
                            p={{ base: 'xl', md: 64 }}
                            shadow="md"
                            className="feature-panel"
                        >
                            <SimpleGrid cols={{ base: 1, md: 2 }} spacing={64} style={{ alignItems: 'center' }}>
                                <Stack gap="lg" style={{ order: 1 }}>
                                    <ThemeIcon size={52} radius="md" variant="light" color="teal">
                                        <IconReceipt2 size={28} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb={4} style={{ letterSpacing: '0.08em' }}>Registro de Gastos</Text>
                                        <Title order={3} fw={800} c="dark.9" mb="sm" size={rem(32)}>
                                            Registra gastos y rinde cuentas en segundos
                                        </Title>
                                        <Text c="dimmed" size="md" lh={1.7}>
                                            Ingresa egresos con un flujo rápido: concepto, monto, IVA, retención.
                                            El sistema autocompleta proveedores frecuentes y calcula el saldo
                                            disponible al instante. Sin fórmulas. Sin errores.
                                        </Text>
                                    </div>
                                    <Stack gap="xs">
                                        <FeatureCheck>Autocompletado inteligente de conceptos y proveedores</FeatureCheck>
                                        <FeatureCheck>Saldo disponible actualizado en tiempo real</FeatureCheck>
                                        <FeatureCheck>Soporte para IVA, retenciones y tipos de comprobante</FeatureCheck>
                                        <FeatureCheck>Reportes de arqueo listos para imprimir y entregar</FeatureCheck>
                                    </Stack>
                                </Stack>
                                <Box style={{ order: isMobile ? 2 : -1 }}>
                                    <ImgPlaceholder label="Formulario de registro de gastos" icon={IconListCheck} />
                                </Box>
                            </SimpleGrid>
                        </Paper>
                    </motion.div>

                    {/* Panel 3 — imagen derecha escritorio, abajo móvil */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <Paper
                            withBorder
                            radius="xl"
                            p={{ base: 'xl', md: 64 }}
                            shadow="md"
                            className="feature-panel"
                        >
                            <SimpleGrid cols={{ base: 1, md: 2 }} spacing={64} style={{ alignItems: 'center' }}>
                                <Stack gap="lg">
                                    <ThemeIcon size={52} radius="md" variant="light" color="orange">
                                        <IconReceiptTax size={28} />
                                    </ThemeIcon>
                                    <div>
                                        <Group gap="xs" mb={4}>
                                            <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: '0.08em' }}>Efectivo y Recaudación</Text>
                                            <Badge color="orange" variant="light" size="xs" radius="sm" tt="uppercase" fw={700}>SRI · Ecuador</Badge>
                                        </Group>
                                        <Title order={3} fw={800} c="dark.9" mb="sm" size={rem(32)}>
                                            Control de retenciones y recaudación en efectivo
                                        </Title>
                                        <Text c="dimmed" size="md" lh={1.7}>
                                            En el flujo diario, el dinero de las retenciones se queda físicamente en tu caja.
                                            Sin un control claro, esto genera "faltantes" falsos al cerrar el día.
                                            Mi Caja Chica separa el saldo real de la empresa del dinero recaudado para el SRI,
                                            permitiéndote registrar y formalizar cada recaudación para un arqueo perfecto.
                                        </Text>
                                    </div>
                                    <Stack gap="xs">
                                        <FeatureCheck>Identifica dinero real vs. recaudación de terceros</FeatureCheck>
                                        <FeatureCheck>Evita confusiones y "faltantes" al final del día</FeatureCheck>
                                        <FeatureCheck>Control de retenciones <strong>recaudadas</strong> vs. <strong>pendientes</strong></FeatureCheck>
                                        <FeatureCheck>Visualiza cuánto efectivo recaudado tienes físicamente en caja</FeatureCheck>
                                        <FeatureCheck>Reporte de liquidación listo para entregar al departamento contable</FeatureCheck>
                                    </Stack>
                                </Stack>
                                <ImgPlaceholder label="Control de Recaudación" icon={IconPhoto} />
                            </SimpleGrid>
                        </Paper>
                    </motion.div>
                </Stack>
            </Container>
        </Box>
    );
}
