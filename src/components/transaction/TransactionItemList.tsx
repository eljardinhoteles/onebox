import { Group, Autocomplete, NumberInput, Checkbox, ActionIcon, Text, Stack, Paper, Divider } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';

interface RecurringProduct {
    nombre: string;
    valor_unitario: number;
}

interface TransactionItemListProps {
    form: any;
    readOnly: boolean;
    itemSuggestions: string[];
    recurringProducts?: RecurringProduct[];
}

export function TransactionItemList({ form, readOnly, itemSuggestions, recurringProducts = [] }: TransactionItemListProps) {
    const isMobile = useMediaQuery('(max-width: 768px)');
    
    // Combinar sugerencias: primero productos recurrentes, luego históricos sin duplicados
    const recurringNames = new Set(recurringProducts.map(p => p.nombre));
    const combinedSuggestions = [
        ...recurringProducts.map(p => p.nombre),
        ...itemSuggestions.filter(s => !recurringNames.has(s))
    ];

    const handleProductSelect = (value: string, index: number) => {
        form.setFieldValue(`items.${index}.nombre`, value);
        // Si es un producto recurrente, auto-rellenar el valor
        const recurring = recurringProducts.find(p => p.nombre === value);
        if (recurring) {
            form.setFieldValue(`items.${index}.valor`, Number(recurring.valor_unitario));
        }
    };

    const fields = form.values.items.map((_item: any, index: number) => {
        const itemLayout = isMobile ? (
            <Paper key={form.values.items[index].key} withBorder p="sm" radius="md" style={{ backgroundColor: '#fff' }}>
                <Stack gap="xs">
                    <Autocomplete
                        label="Producto/Servicio"
                        placeholder="Nombre del producto/servicio"
                        data={combinedSuggestions}
                        {...form.getInputProps(`items.${index}.nombre`)}
                        onChange={(value) => form.setFieldValue(`items.${index}.nombre`, value)}
                        onOptionSubmit={(value) => handleProductSelect(value, index)}
                        comboboxProps={{ shadow: 'md', withinPortal: true }}
                        readOnly={readOnly}
                        variant={readOnly ? "filled" : "default"}
                        styles={readOnly ? { input: { color: 'black', opacity: 1, backgroundColor: '#f8f9fa' } } : {}}
                    />
                    
                    <Group grow gap="xs">
                        <NumberInput
                            label="Cantidad"
                            placeholder="1"
                            allowNegative={false}
                            min={1}
                            {...form.getInputProps(`items.${index}.cantidad`)}
                            readOnly={readOnly}
                            variant={readOnly ? "filled" : "default"}
                        />
                        <NumberInput
                            label="P. Unitario"
                            placeholder="0.00"
                            decimalScale={4}
                            fixedDecimalScale
                            hideControls
                            leftSection="$"
                            {...form.getInputProps(`items.${index}.valor`)}
                            readOnly={readOnly}
                            variant={readOnly ? "filled" : "default"}
                        />
                    </Group>

                    <Divider variant="dashed" />
                    
                    <Group justify="space-between" align="center">
                        <Group gap="xl">
                            <Stack gap={0}>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Subtotal</Text>
                                <Text fw={700} size="md" c="blue.7">
                                    ${((form.values.items[index].cantidad || 0) * (form.values.items[index].valor || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                </Text>
                            </Stack>
                            <Checkbox
                                label="Incluye IVA"
                                {...form.getInputProps(`items.${index}.con_iva`, { type: 'checkbox' })}
                                color="blue"
                                disabled={readOnly}
                            />
                        </Group>

                        {!readOnly && (
                            <ActionIcon
                                color="red"
                                variant="light"
                                size="lg"
                                onClick={() => form.removeListItem('items', index)}
                                disabled={form.values.items.length === 1}
                            >
                                <IconTrash size={18} />
                            </ActionIcon>
                        )}
                    </Group>
                </Stack>
            </Paper>
        ) : (
            <Group key={form.values.items[index].key} align="center" gap="xs">
                <Autocomplete
                    placeholder="Nombre del producto/servicio"
                    style={{ flex: 1 }}
                    data={combinedSuggestions}
                    {...form.getInputProps(`items.${index}.nombre`)}
                    onChange={(value) => form.setFieldValue(`items.${index}.nombre`, value)}
                    onOptionSubmit={(value) => handleProductSelect(value, index)}
                    comboboxProps={{
                        shadow: 'md',
                        withinPortal: true
                    }}
                    readOnly={readOnly}
                    variant={readOnly ? "filled" : "default"}
                    styles={readOnly ? { input: { color: 'black', opacity: 1, backgroundColor: '#f8f9fa' } } : {}}
                />
                <NumberInput
                    placeholder="1"
                    allowNegative={false}
                    min={1}
                    w={70}
                    {...form.getInputProps(`items.${index}.cantidad`)}
                    readOnly={readOnly}
                    variant={readOnly ? "filled" : "default"}
                    styles={readOnly ? { input: { color: 'black', opacity: 1, backgroundColor: '#f8f9fa' } } : {}}
                />
                <NumberInput
                    placeholder="0.00"
                    decimalScale={4}
                    fixedDecimalScale
                    hideControls
                    leftSection="$"
                    w={85}
                    {...form.getInputProps(`items.${index}.valor`)}
                    readOnly={readOnly}
                    variant={readOnly ? "filled" : "default"}
                    styles={readOnly ? { input: { color: 'black', opacity: 1, backgroundColor: '#f8f9fa' } } : {}}
                />

                <Group justify="flex-end" w={85} px={0}>
                    <Text fw={600} size="sm" c="blue.7">
                        ${((form.values.items[index].cantidad || 0) * (form.values.items[index].valor || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </Text>
                </Group>

                <Group h={36} align="center" px={4} w={40} justify="center">
                    <Checkbox
                        {...form.getInputProps(`items.${index}.con_iva`, { type: 'checkbox' })}
                        color="blue"
                        disabled={readOnly}
                    />
                </Group>

                {!readOnly && (
                    <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => form.removeListItem('items', index)}
                        disabled={form.values.items.length === 1}
                    >
                        <IconTrash size={16} />
                    </ActionIcon>
                )}
            </Group>
        );
        return itemLayout;
    });

    return (
        <Stack gap="xs">
            {!isMobile && form.values.items.length > 0 && (
                <Group align="center" gap="xs" px={4} mb={-4} translate="no">
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ flex: 1 }}>Producto</Text>
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed" w={70}>Cant.</Text>
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed" w={85}>P. Unit.</Text>
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed" w={85} ta="right">Subtotal</Text>
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed" w={40} ta="center">IVA</Text>
                    {!readOnly && <div style={{ width: 28 }} />}
                </Group>
            )}
            {fields}
        </Stack>
    );
}
