import { Box, Container, Text, Title, Stack, Paper, SimpleGrid, ThemeIcon, rem, Group, Badge, Image } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconReceipt2, IconReceiptTax } from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
import { FeatureCheck } from './LandingUtils';
import registroGastosImg from '../../../assets/3x/Registro_de_gastos.png';
import controlRetencionesImg from '../../../assets/3x/Control_de_retenciones.png';

export function ProblemSection() {
    const isMobile = useMediaQuery('(max-width: 768px)');

    return (
        <Box py={80} bg="white">
            <Container size={1340}>


                <Box pos="relative" pb={{ base: 40, md: 80 }}>

                    {/* Panel 1 — Registro de gastos */}
                    <Box style={{ position: 'sticky', top: 'calc(50vh - 250px)', zIndex: 1 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: false, margin: "-15% 0px -15% 0px" }}
                            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                        >
                            <Paper
                            withBorder
                            radius="xl"
                            p={{ base: 'xl', md: 64 }}
                            shadow="md"
                            className="feature-panel"
                            mih={{ base: 'auto', md: 620 }}
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
                                    <Image 
                                        src={registroGastosImg} 
                                        radius="xl" 
                                        style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.05)', width: '100%', height: 'auto', scale: 1.05 }} 
                                    />
                                </Box>
                            </SimpleGrid>
                        </Paper>
                        </motion.div>
                    </Box>

                    {/* Espaciador para generar scroll antes de que llegue el siguiente panel */}
                    <Box h={{ base: '40vh', md: '55vh' }} />

                    {/* Panel 2 — Control de retenciones */}
                    <Box style={{ position: 'sticky', top: 'calc(50vh - 250px)', zIndex: 2 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: false, margin: "-15% 0px -15% 0px" }}
                            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                        >
                            <Paper
                            withBorder
                            radius="xl"
                            p={{ base: 'xl', md: 64 }}
                            shadow="md"
                            className="feature-panel"
                            mih={{ base: 'auto', md: 620 }}
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
                                <Box>
                                    <Image 
                                        src={controlRetencionesImg} 
                                        radius="xl" 
                                        style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.05)', width: '100%', height: 'auto', scale: 1.05 }} 
                                    />
                                </Box>
                            </SimpleGrid>
                        </Paper>
                        </motion.div>
                    </Box>

                    {/* Espacio extra al final para que la segunda tarjeta también tenga tiempo "pegada" */}
                    <Box h={{ base: '20vh', md: '30vh' }} />
                </Box>
            </Container>
        </Box>
    );
}
