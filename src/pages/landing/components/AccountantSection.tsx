import { Box, Container, Paper, SimpleGrid, Badge, Title, Text, Stack, Group, ThemeIcon, rem, Image } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconCalculator, IconCheck, IconReceiptTax, IconBell } from '@tabler/icons-react';
import cierreImg from '../../../assets/3x/Cierre.png';
import cajaCerradaImg from '../../../assets/3x/Caja_Cerrada.png';

export function AccountantSection() {
    return (
        <Box py={100} bg="blue.0" style={{ borderTop: '1px solid var(--mantine-color-blue-1)', borderBottom: '1px solid var(--mantine-color-blue-1)' }}>
            <Container size="xl">
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={80} style={{ alignItems: 'center' }}>
                    <Stack gap="xl">
                        <div>
                            <Badge color="blue.6" variant="filled" size="lg" radius="sm" mb="md" tt="uppercase" fw={700}>
                                Paz Contable
                            </Badge>
                            <Title order={2} fw={900} c="dark.9" mb="lg" size={rem(42)} style={{ lineHeight: 1.1 }}>
                                Cierres de caja en 5 minutos o menos...
                            </Title>
                            <Text c="blue.9" size="lg" mb="xl" lh={1.7} fw={500}>
                                Diseñado para el régimen contable del Ecuador. Elimine el caos de los
                                registros manuales y entregue datos consolidados, reales y listos
                                para su proceso de auditoría.
                            </Text>
                        </div>

                        <SimpleGrid cols={1} spacing="lg">
                            <Paper p="lg" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-blue-2)' }} bg="white">
                                <Group gap="md" align="flex-start" wrap="nowrap">
                                    <ThemeIcon size={44} radius="md" color="blue" variant="light">
                                        <IconCalculator size={24} />
                                    </ThemeIcon>
                                    <div>
                                        <Text fw={700} c="dark.9" fz="md">Cálculos con precisión matemática</Text>
                                        <Text size="sm" c="dimmed">Cero errores de suma o fórmulas rotas. El sistema valida cada apertura y cierre contra el efectivo real.</Text>
                                    </div>
                                </Group>
                            </Paper>

                            <Paper p="lg" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-blue-2)' }} bg="white">
                                <Group gap="md" align="flex-start" wrap="nowrap">
                                    <ThemeIcon size={44} radius="md" color="teal" variant="light">
                                        <IconCheck size={24} />
                                    </ThemeIcon>
                                    <div>
                                        <Text fw={700} c="dark.9" fz="md">Reportes de arqueo firmados</Text>
                                        <Text size="sm" c="dimmed">Genera documentos PDF estandarizados con firmas de responsabilidad, listos para su archivo contable.</Text>
                                    </div>
                                </Group>
                            </Paper>

                            <Paper p="lg" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-blue-2)' }} bg="white">
                                <Group gap="md" align="flex-start" wrap="nowrap">
                                    <ThemeIcon size={44} radius="md" color="orange" variant="light">
                                        <IconReceiptTax size={24} />
                                    </ThemeIcon>
                                    <div>
                                        <Text fw={700} c="dark.9" fz="md">Control de retenciones recaudadas</Text>
                                        <Text size="sm" c="dimmed">Identifique de inmediato las retenciones que afectan la caja física para su correcta conciliación fiscal.</Text>
                                    </div>
                                </Group>
                            </Paper>

                            <Paper p="lg" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-blue-2)' }} bg="white">
                                <Group gap="md" align="flex-start" wrap="nowrap">
                                    <ThemeIcon size={44} radius="md" color="indigo" variant="light">
                                        <IconBell size={24} />
                                    </ThemeIcon>
                                    <div>
                                        <Text fw={700} c="dark.9" fz="md">Alarmas y Notificaciones automáticas</Text>
                                        <Text size="sm" c="dimmed">El sistema avisa automáticamente cierres de caja y saldos bajos para solicitar reposición, ahorrándote el seguimiento manual.</Text>
                                    </div>
                                </Group>
                            </Paper>
                        </SimpleGrid>
                    </Stack>

                    <Box style={{ position: 'relative', height: 650 }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            whileInView={{ opacity: 1, scale: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                zIndex: 1
                            }}
                        >
                            <Paper
                                radius="lg"
                                p="xs"
                                bg="white"
                                shadow="lg"
                                style={{ border: '1px solid var(--mantine-color-blue-1)' }}
                            >
                                <Image src={cierreImg} radius="md" />
                            </Paper>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 40, scale: 1 }}
                            whileInView={{ opacity: 1, x: 0, scale: 1.15 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            style={{
                                position: 'absolute',
                                bottom: -20,
                                left: -20,
                                width: '50%',
                                zIndex: 2
                            }}
                        >
                            <Paper
                                radius="lg"
                                p="xs"
                                bg="white"
                                shadow="xl"
                                style={{ border: '1px solid var(--mantine-color-blue-2)' }}
                            >
                                <Image src={cajaCerradaImg} radius="md" />
                            </Paper>
                        </motion.div>
                    </Box>
                </SimpleGrid>
            </Container>
        </Box>
    );
}
