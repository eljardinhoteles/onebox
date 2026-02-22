
import { Group, Autocomplete, NumberInput, Checkbox, ActionIcon, Text, Stack } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';

interface TransactionItemListProps {
    form: any;
    readOnly: boolean;
    itemSuggestions: string[];
}

export function TransactionItemList({ form, readOnly, itemSuggestions }: TransactionItemListProps) {
    const fields = form.values.items.map((_item: any, index: number) => (
        <Group key={form.values.items[index].key} align="center" gap="xs">
            <Autocomplete
                placeholder="Nombre del producto/servicio"
                style={{ flex: 1 }}
                data={itemSuggestions}
                {...form.getInputProps(`items.${index}.nombre`)}
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
                w={80}
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
                w={100}
                {...form.getInputProps(`items.${index}.valor`)}
                readOnly={readOnly}
                variant={readOnly ? "filled" : "default"}
                styles={readOnly ? { input: { color: 'black', opacity: 1, backgroundColor: '#f8f9fa' } } : {}}
            />
            <Group h={36} align="center" px={4} w={60} justify="center">
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
    ));

    return (
        <Stack gap="xs">
            {form.values.items.length > 0 && (
                <Group align="center" gap="xs" px={4} mb={-4}>
                    <Text size="sm" fw={500} style={{ flex: 1 }}>Producto</Text>
                    <Text size="sm" fw={500} w={80}>Cantidad</Text>
                    <Text size="sm" fw={500} w={100}>Valor</Text>
                    <Text size="sm" fw={500} w={60} ta="center">IVA 15%</Text>
                    {!readOnly && <div style={{ width: 28 }} />}
                </Group>
            )}
            {fields}
        </Stack>
    );
}
