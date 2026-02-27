import { useState } from 'react';
import {
    Stack, Group, Text, Paper, ActionIcon, Badge, Divider,
    SimpleGrid, Button, ThemeIcon
} from '@mantine/core';
import { IconTrash, IconCoin, IconCash, IconMinus } from '@tabler/icons-react';

interface DenominacionItem {
    id: string;
    denominacion: number;
    cantidad: number;
}

export interface ArqueoDesglose {
    items: DenominacionItem[];
    total: number;
}

interface ArqueoDenominacionesProps {
    montoEsperado: number;
    onChange: (desglose: ArqueoDesglose) => void;
}

const DENOMINACIONES = [
    { value: '100', denominacion: 100, label: '$100', tipo: 'billete' },
    { value: '50', denominacion: 50, label: '$50', tipo: 'billete' },
    { value: '20', denominacion: 20, label: '$20', tipo: 'billete' },
    { value: '10', denominacion: 10, label: '$10', tipo: 'billete' },
    { value: '5', denominacion: 5, label: '$5', tipo: 'billete' },
    { value: '1_b', denominacion: 1, label: '$1', tipo: 'billete' },
    { value: '1_m', denominacion: 1, label: '$1', tipo: 'moneda' },
    { value: '0.5', denominacion: 0.5, label: '50¢', tipo: 'moneda' },
    { value: '0.25', denominacion: 0.25, label: '25¢', tipo: 'moneda' },
    { value: '0.1', denominacion: 0.1, label: '10¢', tipo: 'moneda' },
    { value: '0.05', denominacion: 0.05, label: '5¢', tipo: 'moneda' },
    { value: '0.01', denominacion: 0.01, label: '1¢', tipo: 'moneda' },
];

export function ArqueoDenominaciones({ montoEsperado, onChange }: ArqueoDenominacionesProps) {
    const [counts, setCounts] = useState<Record<string, number>>({});

    // Calculate totals
    const items: DenominacionItem[] = DENOMINACIONES
        .filter(d => (counts[d.value] || 0) > 0)
        .map(d => ({ id: d.value, denominacion: d.denominacion, cantidad: counts[d.value] }));

    const total = DENOMINACIONES.reduce((sum, d) => {
        return sum + d.denominacion * (counts[d.value] || 0);
    }, 0);
    const totalRounded = Math.round(total * 100) / 100;
    const diferencia = Math.round((totalRounded - montoEsperado) * 100) / 100;
    const coincide = diferencia === 0 && montoEsperado > 0 && items.length > 0;

    const update = (newCounts: Record<string, number>) => {
        setCounts(newCounts);
        const newItems: DenominacionItem[] = DENOMINACIONES
            .filter(d => (newCounts[d.value] || 0) > 0)
            .map(d => ({ id: d.value, denominacion: d.denominacion, cantidad: newCounts[d.value] }));
        const newTotal = newItems.reduce((s, i) => s + i.denominacion * i.cantidad, 0);
        onChange({ items: newItems, total: Math.round(newTotal * 100) / 100 });
    };

    const increment = (value: string) => {
        update({ ...counts, [value]: (counts[value] || 0) + 1 });
    };

    const decrement = (value: string) => {
        const current = counts[value] || 0;
        if (current <= 0) return;
        const newCounts = { ...counts, [value]: current - 1 };
        update(newCounts);
    };

    const remove = (value: string) => {
        const newCounts = { ...counts };
        delete newCounts[value];
        update(newCounts);
    };

    const billetes = DENOMINACIONES.filter(d => d.tipo === 'billete');
    const monedas = DENOMINACIONES.filter(d => d.tipo === 'moneda');

    return (
        <Stack gap="sm">
            {/* Grid de denominaciones clickeables */}
            <Stack gap="xs">
                <Text size="xs" fw={700} tt="uppercase" c="dimmed">Billetes</Text>
                <SimpleGrid cols={6} spacing={4}>
                    {billetes.map(d => {
                        const qty = counts[d.value] || 0;
                        const active = qty > 0;
                        return (
                            <Button
                                key={d.value}
                                variant={active ? 'filled' : 'light'}
                                color={active ? 'green' : 'gray'}
                                onClick={() => increment(d.value)}
                                styles={{
                                    root: {
                                        height: 'auto',
                                        padding: '4px 2px',
                                        position: 'relative',
                                    }
                                }}
                            >
                                <Stack gap={1} align="center">
                                    <ThemeIcon variant="transparent" color={active ? 'white' : 'green'} size={14}>
                                        <IconCash size={10} />
                                    </ThemeIcon>
                                    <Text size="xs" fw={700}>{d.label}</Text>
                                    {active && (
                                        <Badge size="xs" variant="white" color="green" style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, padding: '0 3px' }}>
                                            {qty}
                                        </Badge>
                                    )}
                                </Stack>
                            </Button>
                        );
                    })}
                </SimpleGrid>
            </Stack>

            <Stack gap="xs">
                <Text size="xs" fw={700} tt="uppercase" c="dimmed">Monedas</Text>
                <SimpleGrid cols={6} spacing={4}>
                    {monedas.map(d => {
                        const qty = counts[d.value] || 0;
                        const active = qty > 0;
                        return (
                            <Button
                                key={d.value}
                                variant={active ? 'filled' : 'light'}
                                color={active ? 'yellow.7' : 'gray'}
                                onClick={() => increment(d.value)}
                                styles={{
                                    root: {
                                        height: 'auto',
                                        padding: '4px 2px',
                                        position: 'relative',
                                    }
                                }}
                            >
                                <Stack gap={1} align="center">
                                    <ThemeIcon variant="transparent" color={active ? 'white' : 'yellow'} size={14}>
                                        <IconCoin size={10} />
                                    </ThemeIcon>
                                    <Text size="xs" fw={700}>{d.label}</Text>
                                    {active && (
                                        <Badge size="xs" variant="white" color="yellow" style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, padding: '0 3px' }}>
                                            {qty}
                                        </Badge>
                                    )}
                                </Stack>
                            </Button>
                        );
                    })}
                </SimpleGrid>
            </Stack>

            {/* Resumen de lo seleccionado */}
            {items.length > 0 && (
                <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
                    <Stack gap={0}>
                        {items.map(item => {
                            const isBillete = item.denominacion >= 1 && DENOMINACIONES.find(d => d.value === item.id)?.tipo === 'billete';
                            return (
                                <Group key={item.id} justify="space-between" px="sm" py={6} style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
                                    <Group gap="xs">
                                        <ThemeIcon variant="light" color={isBillete ? 'green' : 'yellow'} size="sm" radius="xl">
                                            {isBillete ? <IconCash size={12} /> : <IconCoin size={12} />}
                                        </ThemeIcon>
                                        <Text size="sm" fw={600}>${item.denominacion.toFixed(2)}</Text>
                                    </Group>
                                    <Group gap={4}>
                                        <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => decrement(item.id)}>
                                            <IconMinus size={12} />
                                        </ActionIcon>
                                        <Text size="sm" fw={700} w={24} ta="center">{item.cantidad}</Text>
                                        <ActionIcon size="xs" variant="subtle" color="red" onClick={() => remove(item.id)}>
                                            <IconTrash size={12} />
                                        </ActionIcon>
                                    </Group>
                                    <Text size="sm" fw={600} w={70} ta="right">
                                        ${(item.denominacion * item.cantidad).toFixed(2)}
                                    </Text>
                                </Group>
                            );
                        })}
                    </Stack>
                    <Divider />
                    <Group justify="space-between" p="sm" px="md">
                        <Text size="sm" fw={700}>Total Arqueo:</Text>
                        <Text size="lg" fw={700}>${totalRounded.toFixed(2)}</Text>
                    </Group>
                </Paper>
            )}

            {/* Estado de verificación */}
            {montoEsperado > 0 && items.length > 0 && (
                <Paper
                    withBorder
                    p="xs"
                    radius="md"
                    bg={coincide ? 'teal.0' : 'red.0'}
                >
                    <Group justify="space-between">
                        <Group gap="xs">
                            <Badge variant="light" color={coincide ? 'teal' : 'red'} size="lg">
                                {coincide ? '✓ Verificado' : '✗ Diferencia'}
                            </Badge>
                            {!coincide && (
                                <Text size="xs" c="red.7" fw={500}>
                                    {diferencia > 0 ? `Sobran $${diferencia.toFixed(2)}` : `Faltan $${Math.abs(diferencia).toFixed(2)}`}
                                </Text>
                            )}
                        </Group>
                        <Text size="xs" c="dimmed" fw={500}>Esperado: ${montoEsperado.toFixed(2)}</Text>
                    </Group>
                </Paper>
            )}

            {items.length === 0 && (
                <Paper p="md" radius="md" bg="gray.0" ta="center">
                    <Text size="sm" c="dimmed">Toca cada denominación para añadirla al conteo</Text>
                </Paper>
            )}
        </Stack>
    );
}
