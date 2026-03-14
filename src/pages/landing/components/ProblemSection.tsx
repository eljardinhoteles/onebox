import { Box, Container, Text, Title, Stack, Paper, SimpleGrid, ThemeIcon, rem, Group, Badge, Image } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconReceipt2, IconReceiptTax } from '@tabler/icons-react';

import { FeatureCheck } from './LandingUtils';
import registroGastosImg from '../../../assets/3x/Registro_de_gastos.png';
import controlRetencionesImg from '../../../assets/3x/Control_de_retenciones.png';

export function ProblemSection() {


    return (
        <Box py={80} bg="white">
            <Container size={1340}>




                <Stack gap={80} pb={{ base: 40, md: 80 }}>
                    {/* Panel 1 — Registro de gastos */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <Paper
                            withBorder
                            radius="xl"
                            p={{ base: 'xl', md: 80 }}
                            shadow="xl"
                            className="feature-panel"
                            bg="gray.0"
                        >
                            <Stack gap={60}>
                                <Stack gap="md" ta="center" maw={800} mx="auto">
                                    <ThemeIcon size={64} radius="md" variant="light" color="teal" mx="auto">
                                        <IconReceipt2 size={32} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="sm" tt="uppercase" fw={700} c="teal.6" mb={8} style={{ letterSpacing: '0.1em' }}>Eficiencia Operativa</Text>
                                        <Title order={2} fw={900} c="dark.9" mb="md" size={rem(48)} style={{ lineHeight: 1.1 }}>
                                            Deja de adivinar en qué se gasta el dinero de tu empresa
                                        </Title>
                                        <Text c="dimmed" size="lg" lh={1.8} fz={20}>
                                            Olvídese de las fórmulas rotas en Excel. Mi Caja Chica automatiza los 
                                            cálculos y el registro de cada egreso, permitiendo que su equipo mantenga 
                                            el flujo de caja al día sin esfuerzo manual exagerado.
                                        </Text>
                                    </div>
                                </Stack>

                                <Box ta="center">
                                    <Image
                                        src={registroGastosImg}
                                        radius="md"
                                        style={{
                                            boxShadow: '0 32px 64px rgba(0,0,0,0.15)',
                                            border: '1px solid rgba(0,0,0,0.06)',
                                            width: '100%',
                                            maxWidth: 1100,
                                            height: 'auto',
                                            margin: '0 auto',
                                            display: 'block'
                                        }}
                                    />
                                </Box>

                                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl" mt={20}>
                                    <FeatureCheck>Cálculos automáticos</FeatureCheck>
                                    <FeatureCheck>Sin fórmulas de Excel</FeatureCheck>
                                    <FeatureCheck>Registro simplificado</FeatureCheck>
                                    <FeatureCheck>Ahorro de tiempo</FeatureCheck>
                                </SimpleGrid>
                            </Stack>
                        </Paper>
                    </motion.div>

                    {/* Panel 2 — Control de retenciones */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <Paper
                            withBorder
                            radius="xl"
                            p={{ base: 'xl', md: 80 }}
                            shadow="xl"
                            className="feature-panel"
                            bg="gray.0"
                        >
                            <SimpleGrid cols={{ base: 1, md: 2 }} spacing={80} style={{ alignItems: 'center' }}>
                                <Stack gap="xl">
                                    <ThemeIcon size={64} radius="md" variant="light" color="orange">
                                        <IconReceiptTax size={32} />
                                    </ThemeIcon>
                                    <div>
                                        <Group gap="xs" mb={8}>
                                            <Text size="sm" tt="uppercase" fw={700} c="orange.6" style={{ letterSpacing: '0.1em' }}>Paz Contable</Text>
                                            <Badge color="orange" variant="light" size="xs" radius="sm" tt="uppercase" fw={700}>SRI · Ecuador</Badge>
                                        </Group>
                                        <Title order={2} fw={900} c="dark.9" mb="md" size={rem(42)} style={{ lineHeight: 1.1 }}>
                                            Arqueo ordenado y control de retenciones
                                        </Title>
                                        <Text c="dimmed" size="lg" lh={1.8}>
                                            Dígale adiós al caos de fin de mes. Mi Caja Chica le ayuda a registrar 
                                            correctamente cada transacción de retención, asegurando que los valores 
                                            físicos coincidan con los registros para su posterior declaración.
                                        </Text>
                                    </div>
                                    <Stack gap="md">
                                        <FeatureCheck>Control de efectivo real</FeatureCheck>
                                        <FeatureCheck>Orden fiscal SRI</FeatureCheck>
                                        <FeatureCheck>Reporte de egresos</FeatureCheck>
                                        <FeatureCheck>Retenciones bajo control</FeatureCheck>
                                    </Stack>
                                </Stack>

                                <Box>
                                    <Image
                                        src={controlRetencionesImg}
                                        radius="md"
                                        style={{
                                            boxShadow: '0 32px 64px rgba(0,0,0,0.15)',
                                            border: '1px solid rgba(0,0,0,0.06)',
                                            width: '100%',
                                            height: 'auto',
                                            scale: 1.1
                                        }}
                                    />
                                </Box>
                            </SimpleGrid>
                        </Paper>
                    </motion.div>
                </Stack>
            </Container>
        </Box>
    );
}
