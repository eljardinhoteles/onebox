import { Paper, Stack, Group, Title, Button, ActionIcon, Text, Table, Badge } from '@mantine/core';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';

interface CrudSectionProps {
    title: string;
    type: string;
    items: any[];
    onEdit: (item: any) => void;
    onDelete: (id: string) => void;
    onAdd: () => void;
}

export function CrudSection({ title, items, onEdit, onDelete, onAdd }: CrudSectionProps) {
    return (
        <Paper withBorder p="xl" radius="lg">
            <Stack gap="lg">
                <Group justify="space-between">
                    <div>
                        <Title order={3}>{title}</Title>
                        <Text size="sm" c="dimmed">Añade o edita elementos de esta categoría.</Text>
                    </div>
                    <Button leftSection={<IconPlus size={16} />} onClick={onAdd} variant="light">Añadir</Button>
                </Group>

                <Table verticalSpacing="sm">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Nombre / Detalle</Table.Th>
                            <Table.Th>Información Extra</Table.Th>
                            <Table.Th>Estado / Tipo</Table.Th>
                            <Table.Th style={{ textAlign: 'right' }}>Acciones</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {items.length === 0 ? (
                            <Table.Tr>
                                <Table.Td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>
                                    <Text c="dimmed">No hay elementos registrados.</Text>
                                </Table.Td>
                            </Table.Tr>
                        ) : (
                            items.map((item) => (
                                <Table.Tr key={item.id}>
                                    <Table.Td>
                                        <Text fw={600}>{item.nombre || item.nombre_banco}</Text>
                                        <Text size="xs" c="dimmed">{item.ruc || item.direccion}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap="xs">
                                            {item.numero_cuenta && (
                                                <Text size="sm" fw={500}>{item.numero_cuenta}</Text>
                                            )}
                                            {item.regimen && <Badge variant="light" size="xs">{item.regimen}</Badge>}
                                            {item.secuencia_inicial !== undefined && item.secuencia_inicial > 0 && (
                                                <Badge variant="dot" color="blue" size="xs">Próxima: {item.secuencia_inicial}</Badge>
                                            )}
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap="xs">
                                            {item.tipo_cuenta && <Badge variant="outline" color="orange" size="xs">{item.tipo_cuenta}</Badge>}
                                            {item.has_active_caja && <Badge color="green" size="xs">Caja Abierta</Badge>}
                                            {!item.has_active_caja && item.secuencia_inicial !== undefined && <Badge color="gray" variant="light" size="xs">Cerrada</Badge>}
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap="xs" justify="flex-end">
                                            <ActionIcon variant="subtle" color="blue" onClick={() => onEdit(item)}><IconEdit size={16} /></ActionIcon>
                                            <ActionIcon variant="subtle" color="red" onClick={() => onDelete(item.id)}><IconTrash size={16} /></ActionIcon>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))
                        )}
                    </Table.Tbody>
                </Table>
            </Stack>
        </Paper>
    );
}
