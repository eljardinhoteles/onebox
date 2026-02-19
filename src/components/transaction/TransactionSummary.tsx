
import { Paper, Stack, Group, Text, Divider } from '@mantine/core';

interface TransactionSummaryProps {
    totals: { subtotal: number; iva: number; total: number };
    availableBalance: number;
    originalTotal: number;
    transactionId?: number;
}

export function TransactionSummary({ totals, availableBalance, originalTotal, transactionId }: TransactionSummaryProps) {
    return (
        <Paper withBorder p="md" radius="md" bg="gray.0">
            <Stack gap="xs">
                {!transactionId && (
                    <>
                        <Group justify="space-between">
                            <Text size="sm" c="dimmed">Efectivo Disponible en Caja:</Text>
                            <Text size="sm" fw={600}>${(availableBalance + originalTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                        </Group>
                        <Divider variant="dotted" />
                    </>
                )}
                <Group justify="space-between">
                    <Text size="sm">Subtotal:</Text>
                    <Text size="sm" fw={500}>${totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </Group>
                <Group justify="space-between">
                    <Text size="sm">IVA (15%):</Text>
                    <Text size="sm" fw={500}>${totals.iva.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </Group>
                <Divider />
                <Group justify="space-between">
                    <Text size="md" fw={700}>Total Gasto:</Text>
                    <Text size="lg" fw={700} color="blue">
                        ${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                </Group>
            </Stack>
        </Paper>
    );
}
