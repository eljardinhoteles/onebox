import { useState } from 'react';
import { Paper, Group, Text, Grid, ThemeIcon, Stack, Collapse, Divider } from '@mantine/core';
import { IconWallet, IconCalculator, IconReceipt2, IconFileInvoice, IconChevronDown, IconChevronUp } from '@tabler/icons-react';

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
    onOpenRetencionesControl?: () => void;
    onOpenArqueoControl?: () => void;
}

export function CajaSummaryCards({ caja, totals, onOpenRetencionesControl, onOpenArqueoControl }: CajaSummaryCardsProps) {
    const [showBreakdown, setShowBreakdown] = useState(false);

    return (
        <Grid gutter={{ base: 'xs', sm: 'md' }}>
            {/* Monto Inicial */}
            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Paper
                    withBorder
                    p={{ base: 'xs', sm: 'md' }}
                    radius="md"
                    shadow="xs"
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    className={showBreakdown ? 'bg-blue-50/30' : ''}
                >
                    <Group justify="space-between" align="start">
                        <Stack gap={0}>
                            <Group gap={4} align="center">
                                <Text size="xs" c="dimmed" fw={700} tt="uppercase">Monto Inicial</Text>
                                {showBreakdown ? <IconChevronUp size={12} stroke={3} className="text-blue-500" /> : <IconChevronDown size={12} stroke={3} className="text-gray-400" />}
                            </Group>
                            <Text size="xl" fw={700}>
                                ${caja?.monto_inicial.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                        </Stack>
                        <ThemeIcon variant="light" size="lg" radius="md" color="blue">
                            <IconWallet size={20} stroke={1.5} />
                        </ThemeIcon>
                    </Group>

                    <Collapse in={showBreakdown}>
                        <Divider my="xs" variant="dotted" />
                        <Stack gap={4}>
                            <Group justify="space-between">
                                <Text size="xs" c="dimmed">Saldo Anterior:</Text>
                                <Text size="xs" fw={600}>${caja?.saldo_anterior?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="xs" c="dimmed">Reposición:</Text>
                                <Text size="xs" fw={600}>${caja?.reposicion?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                            </Group>
                        </Stack>
                    </Collapse>

                    {!showBreakdown && (
                        <Text size="xs" c="dimmed" mt="xs">Fondo de apertura registrado</Text>
                    )}
                </Paper>
            </Grid.Col>

            {/* Total Facturado */}
            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Paper withBorder p={{ base: 'xs', sm: 'md' }} radius="md" shadow="xs">
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
                    <Text size="xs" c="dimmed" mt="xs">Suma de gastos facturados</Text>
                </Paper>
            </Grid.Col>

            {/* Retenciones */}
            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Paper
                    withBorder
                    p={{ base: 'xs', sm: 'md' }}
                    radius="md"
                    shadow="xs"
                    onClick={() => onOpenRetencionesControl?.()}
                    style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    className="hover:bg-orange-50/30"
                >
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
                <Paper
                    withBorder
                    p={{ base: 'xs', sm: 'md' }}
                    radius="md"
                    shadow="xs"
                    bg="teal.0"
                    onClick={() => onOpenArqueoControl?.()}
                    style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    className="hover:shadow-md"
                >
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
                    <Text size="xs" c="teal.8" mt="xs">Toca para hacer un arqueo de control</Text>
                </Paper>
            </Grid.Col>
        </Grid>
    );
}
