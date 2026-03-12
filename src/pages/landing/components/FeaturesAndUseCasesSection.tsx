import { Box, Container, Text, Title, SimpleGrid, Card, Group, ThemeIcon, Stack } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconCircleX, IconCircleCheck, IconClock, IconShieldLock, IconFileReport, IconBuildingStore, IconTruckDelivery, IconUsers } from '@tabler/icons-react';

export function FeaturesAndUseCasesSection() {
    const cases = [
        {
            industry: 'Retail y Restaurantes',
            industryIcon: IconBuildingStore,
            color: 'blue' as const,
            painPoint: 'El cajero compra suministros de emergencia y al final del turno los recibos no coinciden con el efectivo.',
            featureIcon: IconShieldLock,
            solutionTitle: 'Bitácora y Control en Tiempo Real',
            solutionText: 'El cajero registra el gasto en el momento, adjunta el recibo y el saldo disponible para el siguiente turno se actualiza al instante sin errores.',
        },
        {
            industry: 'Logística y Distribución',
            industryIcon: IconTruckDelivery,
            color: 'teal' as const,
            painPoint: 'Los choferes viajan días enteros y rendir cuentas de viáticos y peajes al volver a la oficina es un caos.',
            featureIcon: IconGlobeEdge, // we'll use a standard icon instead if IconGlobeEdge is not available
            solutionTitle: 'Rendición Descentralizada',
            solutionText: 'Cada chofer abre el sistema desde su celular en cada parada y carga el gasto. El administrador ve en vivo cómo se consume el fondo remoto.',
        },
        {
            industry: 'Empresas Corporativas',
            industryIcon: IconClock,
            color: 'indigo' as const,
            painPoint: 'Al fin de mes, el contador o administrador pierde horas persiguiendo las hojas de cálculo rotas de cada departamento.',
            featureIcon: IconFileReport,
            solutionTitle: 'Reportes de Arqueo a un clic',
            solutionText: 'Generación automática de reportes de cierre diarios o mensuales, con retenciones separadas y listos para importar al software contable.',
        },
        {
            industry: 'Múltiples Sucursales o Franquicias',
            industryIcon: IconUsers,
            color: 'orange' as const,
            painPoint: 'El gerente no tiene idea de cuánto efectivo real hay disperso en las 5 sucursales hasta el fin de semana.',
            featureIcon: IconDeviceAnalytics,
            solutionTitle: 'Vista Centralizada Multi-Fondo',
            solutionText: 'Un panel único central donde el gerente monitorea el saldo en vivo de todas las sedes. Además, recibe alertas cuando un fondo está por agotarse.',
        }
    ];

    return (
        <Box py={80} bg="gray.0">
            <Container size="xl">
                <Box ta="center" maw={640} mx="auto" mb={64}>
                    <Text
                        size="xs"
                        tt="uppercase"
                        fw={700}
                        c="dimmed"
                        mb="sm"
                        style={{ letterSpacing: '0.08em' }}
                    >
                        De la fricción a la solución
                    </Text>
                    <Title order={2} fw={800} c="dark.9" mb="md">
                        Cada funcionalidad está pensada para resolver un dolor real
                    </Title>
                    <Text c="dimmed" size="md">
                        No creamos "features" de relleno. Convertimos los cuellos de botella del manejo de efectivo en flujos de trabajo resueltos.
                    </Text>
                </Box>

                <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
                    {cases.map((item, i) => (
                        <motion.div
                            key={item.industry}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                        >
                            <Card withBorder radius="md" p={0} shadow="sm" h="100%" className="solution-card">
                                {/* Zona de Problema / Contexto */}
                                <Box p="xl" bg="white" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
                                    <Group mb="md">
                                        <ThemeIcon size={36} radius="md" color={item.color} variant="light">
                                            <item.industryIcon size={20} />
                                        </ThemeIcon>
                                        <Text fw={700} size="sm" tt="uppercase" c={`${item.color}.9`} style={{ letterSpacing: '0.05em' }}>
                                            {item.industry}
                                        </Text>
                                    </Group>
                                    <Group gap="sm" align="flex-start" wrap="nowrap">
                                        <IconCircleX size={20} color="var(--mantine-color-red-6)" style={{ flexShrink: 0, marginTop: 2 }} />
                                        <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
                                            "{item.painPoint}"
                                        </Text>
                                    </Group>
                                </Box>

                                {/* Zona de Solución / Feature */}
                                <Box p="xl" bg={`${item.color}.0`} style={{ flexGrow: 1 }}>
                                    <Stack gap="sm">
                                        <Group gap="sm" wrap="nowrap" align="center">
                                            <IconCircleCheck size={20} color="var(--mantine-color-teal-7)" style={{ flexShrink: 0 }} />
                                            <Text fw={800} c="dark.9" size="md">
                                                Nuestra solución: {item.solutionTitle}
                                            </Text>
                                        </Group>
                                        <Text size="sm" c="dark.7" lh={1.6} pl={32}>
                                            {item.solutionText}
                                        </Text>
                                    </Stack>
                                </Box>
                            </Card>
                        </motion.div>
                    ))}
                </SimpleGrid>
            </Container>
        </Box>
    );
}

// Reemplazando los iconos perdidos en el import arriba por estándares
import { IconDeviceDesktopAnalytics as IconDeviceAnalytics, IconDeviceMobile as IconGlobeEdge } from '@tabler/icons-react';
