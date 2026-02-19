
import { Group, Autocomplete, NumberInput, Stack, Text, Checkbox, ActionIcon } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';

interface TransactionItemListProps {
    form: any;
    readOnly: boolean;
    itemSuggestions: string[];
}

export function TransactionItemList({ form, readOnly, itemSuggestions }: TransactionItemListProps) {
    const fields = form.values.items.map((_item: any, index: number) => (
        <Group key={form.values.items[index].key} align="flex-end" gap="xs">
            <Autocomplete
                placeholder="Nombre del producto/servicio"
                label={index === 0 ? "Producto" : null}
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
                placeholder="0.00"
                label={index === 0 ? "Monto" : null}
                decimalScale={4}
                fixedDecimalScale
                hideControls
                leftSection="$"
                w={100}
                {...form.getInputProps(`items.${index}.monto`)}
                readOnly={readOnly}
                variant={readOnly ? "filled" : "default"}
                styles={readOnly ? { input: { color: 'black', opacity: 1, backgroundColor: '#f8f9fa' } } : {}}
            />
            <Stack gap={0} mb={5}>
                {index === 0 && <Text size="xs" fw={500} mb={2}>IVA 15%</Text>}
                <Checkbox
                    {...form.getInputProps(`items.${index}.con_iva`, { type: 'checkbox' })}
                    color="blue"
                    disabled={readOnly}
                />
            </Stack>
            {!readOnly && (
                <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => form.removeListItem('items', index)}
                    disabled={form.values.items.length === 1}
                    mb={2}
                >
                    <IconTrash size={16} />
                </ActionIcon>
            )}
        </Group>
    ));

    return <>{fields}</>;
}
