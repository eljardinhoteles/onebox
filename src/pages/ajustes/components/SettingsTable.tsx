import { Table, Group, ActionIcon, Tooltip, Text, Card, Stack } from '@mantine/core';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';

interface SettingsTableProps {
    title: string;
    items: any[];
    activeTab: string;
    onEdit: (item: any) => void;
    onDelete: (id: string, nombre: string) => void;
    onAdd: () => void;
    fetching: boolean;
}

export function SettingsTable({ title, items, activeTab, onEdit, onDelete, onAdd, fetching }: SettingsTableProps) {
    return (
        <Card withBorder radius="md" p="lg" shadow="xs">
            <Stack gap="md">
                <Group justify="space-between">
                    <Text fw={700} size="lg">{title}</Text>
                    <Tooltip label={`Agregar ${title}`}>
                        <ActionIcon variant="filled" color="blue" size="xl" onClick={onAdd} radius="md">
                            <IconPlus size={22} />
                        </ActionIcon>
                    </Tooltip>
                </Group>

                <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Nombre</Table.Th>
                            {activeTab === 'sucursales' && <Table.Th>Dirección</Table.Th>}
                            {activeTab === 'sucursales' && <Table.Th>Intervalo Actual</Table.Th>}
                            <Table.Th w={100}>Acciones</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {items.map((item) => (
                            <Table.Tr key={item.id}>
                                <Table.Td>{item.nombre}</Table.Td>
                                {activeTab === 'sucursales' && <Table.Td>{item.direccion || '-'}</Table.Td>}
                                {activeTab === 'sucursales' && (
                                    <Table.Td>
                                        <Text fw={700} size="sm">#{item.ultimo_numero || 0}</Text>
                                    </Table.Td>
                                )}
                                <Table.Td>
                                    <Group gap="xs">
                                        <Tooltip label="Editar">
                                            <ActionIcon variant="subtle" color="blue" onClick={() => onEdit(item)}>
                                                <IconEdit size={16} />
                                            </ActionIcon>
                                        </Tooltip>
                                        <Tooltip label="Eliminar">
                                            <ActionIcon variant="subtle" color="red" onClick={() => onDelete(item.id, item.nombre)}>
                                                <IconTrash size={16} />
                                            </ActionIcon>
                                        </Tooltip>
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                        {!fetching && items.length === 0 && (
                            <Table.Tr>
                                <Table.Td colSpan={activeTab === 'sucursales' ? 4 : 2} ta="center" py="xl" c="dimmed">
                                    No hay registros disponibles
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Stack>
        </Card>
    );
}
