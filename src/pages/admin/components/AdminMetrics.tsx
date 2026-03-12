import { SimpleGrid, Paper, Group, Text, ThemeIcon } from '@mantine/core';
import { IconWallet, IconChartBar, IconMoneybag } from '@tabler/icons-react';

interface AdminMetricsProps {
    financialTotals: {
        cobrado: number;
        pendiente: number;
        perdido: number;
    };
}

export function AdminMetrics({ financialTotals }: AdminMetricsProps) {
    return (
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Paper withBorder radius="md" p="lg" bg="teal.0">
                <Group justify="space-between" mb={4}>
                    <Text size="xs" c="teal.7" fw={700} tt="uppercase" lts={0.5}>Total Cobrado</Text>
                    <ThemeIcon variant="light" color="teal" size="md" radius="md">
                        <IconWallet size={16} />
                    </ThemeIcon>
                </Group>
                <Group align="baseline" gap="xs">
                    <Text size="xxl" fw={800} lh={1} c="teal.8">${financialTotals.cobrado.toLocaleString()}</Text>
                    <Text size="xs" c="teal.6" fw={700}>USD</Text>
                </Group>
                <Text size="xs" c="teal.6" mt={4}>Histórico de pagos aprobados</Text>
            </Paper>

            <Paper withBorder radius="md" p="lg" bg="orange.0">
                <Group justify="space-between" mb={4}>
                    <Text size="xs" c="orange.7" fw={700} tt="uppercase" lts={0.5}>Por Cobrar</Text>
                    <ThemeIcon variant="light" color="orange" size="md" radius="md">
                        <IconChartBar size={16} />
                    </ThemeIcon>
                </Group>
                <Group align="baseline" gap="xs">
                    <Text size="xxl" fw={800} lh={1} c="orange.8">${financialTotals.pendiente.toLocaleString()}</Text>
                    <Text size="xs" c="orange.6" fw={700}>USD</Text>
                </Group>
                <Text size="xs" c="orange.6" mt={4}>Pagos en revisión pendientes</Text>
            </Paper>

            <Paper withBorder radius="md" p="lg" bg="red.0">
                <Group justify="space-between" mb={4}>
                    <Text size="xs" c="red.7" fw={700} tt="uppercase" lts={0.5}>Potencial Perdido</Text>
                    <ThemeIcon variant="light" color="red" size="md" radius="md">
                        <IconMoneybag size={16} />
                    </ThemeIcon>
                </Group>
                <Group align="baseline" gap="xs">
                    <Text size="xxl" fw={800} lh={1} c="red.8">${financialTotals.perdido.toLocaleString()}</Text>
                    <Text size="xs" c="red.6" fw={700}>USD</Text>
                </Group>
                <Text size="xs" c="red.6" mt={4}>Estimado cuentas vencidas</Text>
            </Paper>
        </SimpleGrid>
    );
}
