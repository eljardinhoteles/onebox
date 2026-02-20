import { Paper, Group, Stack, Text } from '@mantine/core';

interface LegalizationSummaryProps {
    selectedCount: number;
    totalAmount: number;
}

export function LegalizationSummary({ selectedCount, totalAmount }: LegalizationSummaryProps) {
    return (
        <Paper withBorder p="xs" radius="md" bg="blue.0">
            <Group justify="space-between">
                <Stack gap={0}>
                    <Text size="xs" fw={700} c="blue.6">SELECCIONADOS</Text>
                    <Text size="lg" fw={700} c="blue.9">{selectedCount} Gastos</Text>
                </Stack>
                <Stack gap={0} align="flex-end">
                    <Text size="xs" fw={700} c="blue.6">TOTAL A JUSTIFICAR</Text>
                    <Text size="lg" fw={700} c="blue.9">
                        ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                </Stack>
            </Group>
        </Paper>
    );
}
