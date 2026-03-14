import { Box, Container, Paper, SimpleGrid, Badge, Title, Text, Stack, Group, ThemeIcon, rem, Image } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconCalculator, IconCheck, IconReceiptTax, IconListCheck } from '@tabler/icons-react';
import arqueoCajaImg from '../../../assets/3x/Arqueo_de_caja.png';

export function AccountantSection() {
    return (
        <Box py={80} className="accountant-section">
            <Container size="xl">
                <Paper
                    radius="xl"
                    p={{ base: 'xl', md: 64 }}
                    className="accountant-paper"
                >
                    <div className="accountant-bg-icon">
                        <IconCalculator size={200} />
                    </div>

                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing={64} style={{ alignItems: 'center' }}>
                        <Box>
                            <Badge color="blue" variant="light" mb="md">Paz mental para Contabilidad</Badge>
                            <Title order={2} fw={800} c="dark.9" mb="lg" size={rem(36)} style={{ lineHeight: 1.2 }}>
                                La herramienta que tu contador hubiera querido hace años
                            </Title>
                            <Text c="dimmed" size="lg" mb="xl" lh={1.7}>
                                Sabemos que el cierre de mes es un caos cuando los números no cuadran.
                                Mi Caja Chica elimina el factor "error humano" del proceso, entregando
                                datos limpios, validados y listos para la declaración fiscal.
                            </Text>

                            <Stack gap="xl">
                                <Group gap="md" align="flex-start">
                                    <ThemeIcon size={40} radius="md" color="teal" variant="light">
                                        <IconCheck size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text fw={700} c="dark.9">Reportes de arqueo firmados</Text>
                                        <Text size="sm" c="dimmed">Genera documentos PDF con firmas digitales, listos para auditorías internas o externas.</Text>
                                    </div>
                                </Group>
                                <Group gap="md" align="flex-start">
                                    <ThemeIcon size={40} radius="md" color="blue" variant="light">
                                        <IconReceiptTax size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text fw={700} c="dark.9">Retenciones bajo control</Text>
                                        <Text size="sm" c="dimmed">Diferenciación exacta entre el IVA pagado y las retenciones recaudadas para el SRI.</Text>
                                    </div>
                                </Group>
                                <Group gap="md" align="flex-start">
                                    <ThemeIcon size={40} radius="md" color="orange" variant="light">
                                        <IconListCheck size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text fw={700} c="dark.9">Exportación contable limpia</Text>
                                        <Text size="sm" c="dimmed">Olvida los archivos de Excel corruptos. Datos estandarizados listos para tu software contable.</Text>
                                    </div>
                                </Group>
                            </Stack>
                        </Box>

                        <Box
                            component={motion.div}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                                <Image
                                    src={arqueoCajaImg}
                                    radius="lg"
                                    style={{
                                        boxShadow: '0 24px 64px -16px rgba(0,0,0,0.15)',
                                        border: '1px solid rgba(0,0,0,0.05)',
                                        display: 'block',
                                        width: '100%',
                                        height: 'auto'
                                    }}
                                />
                        </Box>
                    </SimpleGrid>
                </Paper>
            </Container>
        </Box>
    );
}
