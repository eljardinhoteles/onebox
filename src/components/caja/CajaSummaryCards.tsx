import { Paper, Group, Text, Grid, ThemeIcon, Stack } from '@mantine/core';
import { IconWallet, IconCalculator, IconReceipt2, IconFileInvoice } from '@tabler/icons-react';

interface CajaSummaryCardsProps {
    caja: any;
    totals: {
        facturado: number;
        totalRet: number;
        fuente: number;
        iva: number;
        neto: number;
        efectivo: number;
    };
}

export function CajaSummaryCards({ caja, totals }: CajaSummaryCardsProps) {
    return (
        <Grid gutter="md">
            {/* Monto Inicial */}
            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Paper withBorder p="md" radius="md" shadow="xs">
                    <Group justify="space-between" align="start">
                        <Stack gap={0}>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Monto Inicial</Text>
                            <Text size="xl" fw={700}>
                                ${caja?.monto_inicial.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                        </Stack>
                        <ThemeIcon variant="light" size="lg" radius="md" color="blue">
                            <IconWallet size={20} stroke={1.5} />
                        </ThemeIcon>
                    </Group>
                    <Text size="xs" c="dimmed" mt="xs">Fondo de apertura registrado</Text>
                </Paper>
            </Grid.Col>

            {/* Total Facturado */}
            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Paper withBorder p="md" radius="md" shadow="xs">
                    <Group justify="space-between" align="start">
                        <Stack gap={0}>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Total Facturado</Text>
                            <Text size="xl" fw={700} c="red.6">
                                -${totals.facturado.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                        </Stack>
                        <ThemeIcon variant="light" size="lg" radius="md" color="red">
                            <IconCalculator size={20} stroke={1.5} />
                        </ThemeIcon>
                    </Group>
                    <Text size="xs" c="dimmed" mt="xs">Suma de gastos realizados</Text>
                </Paper>
            </Grid.Col>

            {/* Retenciones */}
            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Paper withBorder p="md" radius="md" shadow="xs">
                    <Group justify="space-between" align="start">
                        <Stack gap={0}>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Retenciones</Text>
                            <Text size="xl" fw={700} c="orange.6">
                                +${totals.totalRet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                        </Stack>
                        <ThemeIcon variant="light" size="lg" radius="md" color="orange">
                            <IconFileInvoice size={20} stroke={1.5} />
                        </ThemeIcon>
                    </Group>
                    <Group gap="xs" mt="xs">
                        <Text size="xs" c="orange.8" fw={600}>F: ${totals.fuente.toFixed(2)}</Text>
                        <Text size="xs" c="orange.8" fw={600}>I: ${totals.iva.toFixed(2)}</Text>
                    </Group>
                </Paper>
            </Grid.Col>

            {/* Efectivo Final */}
            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Paper withBorder p="md" radius="md" shadow="xs" bg="teal.0">
                    <Group justify="space-between" align="start">
                        <Stack gap={0}>
                            <Text size="xs" c="teal.9" fw={700} tt="uppercase">Efectivo en Caja</Text>
                            <Text size="xl" fw={700} c="teal.9">
                                ${totals.efectivo.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                        </Stack>
                        <ThemeIcon variant="filled" size="lg" radius="md" color="teal">
                            <IconReceipt2 size={20} stroke={1.5} />
                        </ThemeIcon>
                    </Group>
                    <Text size="xs" c="teal.8" mt="xs">Saldo físico disponible hoy</Text>
                </Paper>
            </Grid.Col>
        </Grid>
    );
}
