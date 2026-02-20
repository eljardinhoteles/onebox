import { useState } from 'react';
import {
    Stack, Group, Select, NumberInput, Text, Paper, ActionIcon,
    Badge, Table, ThemeIcon, Divider
} from '@mantine/core';
import { IconPlus, IconTrash, IconCoin, IconCash } from '@tabler/icons-react';

interface DenominacionItem {
    id: string; // El 'value' de DENOMINACIONES
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
    { value: '100', label: '💵 $100.00 — Billete' },
    { value: '50', label: '💵 $50.00 — Billete' },
    { value: '20', label: '💵 $20.00 — Billete' },
    { value: '10', label: '💵 $10.00 — Billete' },
    { value: '5', label: '💵 $5.00 — Billete' },
    { value: '1_b', label: '💵 $1.00 — Billete' },
    { value: '1_m', label: '🪙 $1.00 — Moneda' },
    { value: '0.5', label: '🪙 $0.50 — Moneda' },
    { value: '0.25', label: '🪙 $0.25 — Moneda' },
    { value: '0.1', label: '🪙 $0.10 — Moneda' },
    { value: '0.05', label: '🪙 $0.05 — Moneda' },
    { value: '0.01', label: '🪙 $0.01 — Moneda' },
];

export function ArqueoDenominaciones({ montoEsperado, onChange }: ArqueoDenominacionesProps) {
    const [items, setItems] = useState<DenominacionItem[]>([]);
    const [selectedDenom, setSelectedDenom] = useState<string | null>(null);

    const total = items.reduce((sum, item) => sum + (item.denominacion * item.cantidad), 0);
    // Round to avoid floating point issues
    const totalRounded = Math.round(total * 100) / 100;
    const diferencia = Math.round((totalRounded - montoEsperado) * 100) / 100;
    const coincide = diferencia === 0 && montoEsperado > 0;

    const usedDenomIds = new Set(items.map(i => i.id));
    const availableDenoms = DENOMINACIONES.filter(d => !usedDenomIds.has(d.value));

    const handleAdd = () => {
        if (!selectedDenom) return;
        const denomConfig = DENOMINACIONES.find(d => d.value === selectedDenom);
        if (!denomConfig) return;

        const denomValue = parseFloat(denomConfig.value);
        const newItems = [...items, { id: denomConfig.value, denominacion: denomValue, cantidad: 0 }];
        // Sort by denomination descending
        newItems.sort((a, b) => b.denominacion - a.denominacion);
        setItems(newItems);
        setSelectedDenom(null);

        const newTotal = newItems.reduce((s, i) => s + (i.denominacion * i.cantidad), 0);
        onChange({ items: newItems, total: Math.round(newTotal * 100) / 100 });
    };

    const handleCantidadChange = (index: number, cantidad: number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], cantidad };
        setItems(newItems);

        const newTotal = newItems.reduce((s, i) => s + (i.denominacion * i.cantidad), 0);
        onChange({ items: newItems, total: Math.round(newTotal * 100) / 100 });
    };

    const handleRemove = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);

        const newTotal = newItems.reduce((s, i) => s + (i.denominacion * i.cantidad), 0);
        onChange({ items: newItems, total: Math.round(newTotal * 100) / 100 });
    };

    const isBillete = (denom: number) => denom >= 1;

    return (
        <Stack gap="sm">
            <Group gap="xs" align="flex-end">
                <Select
                    label="Agregar Denominación"
                    placeholder="Seleccione..."
                    data={availableDenoms || []}
                    value={selectedDenom}
                    onChange={setSelectedDenom}
                    searchable
                    style={{ flex: 1 }}
                    nothingFoundMessage="Todas las denominaciones agregadas"
                />
                <ActionIcon
                    variant="filled"
                    color="blue"
                    size="lg"
                    onClick={handleAdd}
                    disabled={!selectedDenom}
                    mb={1}
                >
                    <IconPlus size={18} />
                </ActionIcon>
            </Group>

            {items.length > 0 && (
                <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
                    <Table striped highlightOnHover verticalSpacing="xs" horizontalSpacing="sm">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Denominación</Table.Th>
                                <Table.Th style={{ width: 120 }}>Cantidad</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>Subtotal</Table.Th>
                                <Table.Th style={{ width: 40 }}></Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {items.map((item, idx) => (
                                <Table.Tr key={item.id}>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <ThemeIcon
                                                variant="light"
                                                color={isBillete(item.denominacion) ? 'green' : 'yellow'}
                                                size="sm"
                                                radius="xl"
                                            >
                                                {isBillete(item.denominacion)
                                                    ? <IconCash size={14} />
                                                    : <IconCoin size={14} />}
                                            </ThemeIcon>
                                            <Text size="sm" fw={500}>
                                                ${item.denominacion.toFixed(2)}
                                            </Text>
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        <NumberInput
                                            size="xs"
                                            min={0}
                                            value={item.cantidad}
                                            onChange={(val) => handleCantidadChange(idx, Number(val) || 0)}
                                            hideControls={false}
                                            styles={{ input: { textAlign: 'center', fontWeight: 600 } }}
                                        />
                                    </Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>
                                        <Text size="sm" fw={600} className="font-mono">
                                            ${(item.denominacion * item.cantidad).toFixed(2)}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <ActionIcon
                                            variant="subtle"
                                            color="red"
                                            size="sm"
                                            onClick={() => handleRemove(idx)}
                                        >
                                            <IconTrash size={14} />
                                        </ActionIcon>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>

                    <Divider />

                    <Group justify="space-between" p="sm" px="md">
                        <Text size="sm" fw={700}>Total Arqueo:</Text>
                        <Text size="lg" fw={700} className="font-mono">
                            ${totalRounded.toFixed(2)}
                        </Text>
                    </Group>
                </Paper>
            )}

            {montoEsperado > 0 && items.length > 0 && (
                <Paper
                    withBorder
                    p="xs"
                    radius="md"
                    bg={coincide ? 'teal.0' : 'red.0'}
                    className={coincide ? 'border-teal-200' : 'border-red-200'}
                >
                    <Group justify="space-between">
                        <Group gap="xs">
                            <Badge
                                variant="light"
                                color={coincide ? 'teal' : 'red'}
                                size="lg"
                            >
                                {coincide ? '✓ Verificado' : '✗ Diferencia'}
                            </Badge>
                            {!coincide && (
                                <Text size="xs" c="red.7" fw={500}>
                                    {diferencia > 0 ? `Sobran $${diferencia.toFixed(2)}` : `Faltan $${Math.abs(diferencia).toFixed(2)}`}
                                </Text>
                            )}
                        </Group>
                        <Text size="xs" c="dimmed" fw={500}>
                            Esperado: ${montoEsperado.toFixed(2)}
                        </Text>
                    </Group>
                </Paper>
            )}

            {items.length === 0 && (
                <Paper p="lg" radius="md" bg="gray.0" ta="center">
                    <Text size="sm" c="dimmed">
                        Seleccione las denominaciones que desea contar
                    </Text>
                </Paper>
            )}
        </Stack>
    );
}
