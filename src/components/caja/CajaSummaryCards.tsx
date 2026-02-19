import { useState } from 'react';
import { Paper, Group, Text, Grid, ThemeIcon, Stack, Collapse, Divider, Tooltip } from '@mantine/core';
import { IconCalculator, IconReceipt2, IconFileInvoice, IconChevronDown, IconChevronUp, IconBuildingBank } from '@tabler/icons-react';

interface CajaSummaryCardsProps {
    caja: any;
    totals: {
        facturado: number;
        totalRet: number;
        fuente: number;
        iva: number;
        neto: number;
        efectivo: number;
        totalDepositos?: number;
    };
    onOpenRetencionesControl?: () => void;
    onOpenArqueoControl?: () => void;
    onOpenDepositoControl?: () => void;
}

export function CajaSummaryCards({ caja, totals, onOpenRetencionesControl, onOpenArqueoControl, onOpenDepositoControl }: CajaSummaryCardsProps) {
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [showNeto, setShowNeto] = useState(false);

    return (
        <Grid gutter={{ base: 'xs', sm: 'md' }}>
            {/* Monto Inicial */}
            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Tooltip label="Toca para ver el desglose del monto inicial" position="bottom" withArrow radius="md" openDelay={800}>
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
                                    ${((caja?.monto_inicial || 0) - (totals.totalDepositos || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </Text>
                            </Stack>
                            <Group gap={4}>
                                {onOpenDepositoControl && (
                                    <Tooltip label="Registrar Depósito a Banco" withArrow>
                                        <ThemeIcon
                                            variant="light"
                                            size="lg"
                                            radius="md"
                                            color="green"
                                            style={{ cursor: 'pointer' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenDepositoControl();
                                            }}
                                        >
                                            <IconBuildingBank size={18} stroke={1.5} />
                                        </ThemeIcon>
                                    </Tooltip>
                                )}
                            </Group>
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
                                <Group justify="space-between">
                                    <Text size="xs" c="dimmed">Depósitos:</Text>
                                    <Text size="xs" fw={600} c="red.6">-${(totals.totalDepositos || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                </Group>
                            </Stack>
                        </Collapse>

                        {!showBreakdown && (
                            <Text size="xs" c="dimmed" mt="xs">Fondo de apertura registrado</Text>
                        )}
                    </Paper>
                </Tooltip>
            </Grid.Col>

            {/* Total Facturado / Neto Toggle */}
            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Tooltip label={showNeto ? "Toca para ver el total facturado" : "Toca para ver el gasto neto (después de retenciones)"} position="bottom" withArrow radius="md" openDelay={800}>
                    <Paper
                        withBorder
                        p={{ base: 'xs', sm: 'md' }}
                        radius="md"
                        shadow="xs"
                        onClick={() => setShowNeto(!showNeto)}
                        style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            borderColor: showNeto ? 'var(--mantine-color-blue-3)' : undefined
                        }}
                        bg={showNeto ? 'blue.0' : undefined}
                    >
                        <Group justify="space-between" align="start">
                            <Stack gap={0}>
                                <Text size="xs" c={showNeto ? 'blue.9' : 'dimmed'} fw={700} tt="uppercase">
                                    {showNeto ? 'Gasto Neto' : 'Total Facturado'}
                                </Text>
                                <Text size="xl" fw={700} c={showNeto ? 'blue.9' : 'red.6'}>
                                    {showNeto ? '' : '-'}${totals[showNeto ? 'neto' : 'facturado'].toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </Text>
                            </Stack>
                            <ThemeIcon variant="light" size="lg" radius="md" color={showNeto ? 'blue' : 'red'}>
                                <IconCalculator size={20} stroke={1.5} />
                            </ThemeIcon>
                        </Group>
                        <Text size="xs" c="dimmed" mt="xs">
                            {showNeto ? 'Gasto real descontando retenciones' : 'Suma de gastos facturados'}
                        </Text>
                    </Paper>
                </Tooltip>
            </Grid.Col>

            {/* Retenciones */}
            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Tooltip label="Toca para ver el control de retenciones" position="bottom" withArrow radius="md" openDelay={800}>
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
                </Tooltip>
            </Grid.Col>

            {/* Efectivo Final */}
            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Tooltip label="Toca para iniciar el arqueo de control" position="bottom" withArrow radius="md" openDelay={800}>
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
                </Tooltip>
            </Grid.Col>
        </Grid >
    );
}
