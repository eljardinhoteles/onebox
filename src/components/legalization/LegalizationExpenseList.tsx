import { ScrollArea, Group, Text, Table, Checkbox } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

interface Transaction {
    id: number;
    fecha_factura: string;
    total_factura: number;
    proveedor: { nombre: string } | null;
    items?: { nombre: string }[];
}

interface LegalizationExpenseListProps {
    expenses: Transaction[];
    selectedIds: number[];
    onToggle: (id: number) => void;
}

export function LegalizationExpenseList({ expenses, selectedIds, onToggle }: LegalizationExpenseListProps) {
    return (
        <ScrollArea h={300}>
            {expenses.length === 0 ? (
                <Group justify="center" py="xl" c="dimmed">
                    <IconAlertCircle size={20} />
                    <Text size="sm">No hay gastos sin factura pendientes</Text>
                </Group>
            ) : (
                <Table verticalSpacing="xs">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th w={40}></Table.Th>
                            <Table.Th>Detalle</Table.Th>
                            <Table.Th ta="right">Monto</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {expenses.map(exp => (
                            <Table.Tr key={exp.id} onClick={() => onToggle(exp.id)} style={{ cursor: 'pointer' }}>
                                <Table.Td>
                                    <Checkbox
                                        checked={selectedIds.includes(exp.id)}
                                        onChange={() => { }} // Handled by row click
                                        tabIndex={-1}
                                    />
                                </Table.Td>
                                <Table.Td>
                                    <Text size="sm" fw={500}>
                                        {exp.proveedor?.nombre || (exp.items && exp.items[0]?.nombre) || 'Sin detalle'}
                                    </Text>
                                    <Text size="xs" c="dimmed">{exp.fecha_factura}</Text>
                                </Table.Td>
                                <Table.Td ta="right">
                                    <Text size="sm" fw={700}>${exp.total_factura.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            )}
        </ScrollArea>
    );
}
