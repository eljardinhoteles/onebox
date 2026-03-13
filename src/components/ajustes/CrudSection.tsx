import { Paper, Stack, Group, Title, Button, ActionIcon, Text, Table, Badge, Divider } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
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
    const isMobile = useMediaQuery('(max-width: 768px)');

    const content = items.length === 0 ? (
        <Paper withBorder p="xl" radius="md">
            <Text ta="center" c="dimmed">No hay elementos registrados.</Text>
        </Paper>
    ) : isMobile ? (
        <Stack gap="sm">
            {items.map((item) => (
                <Paper key={item.id} withBorder p="md" radius="md">
                    <Stack gap="xs">
                        <Group justify="space-between" align="flex-start">
                            <div>
                                <Text fw={600} size="sm">{item.nombre || item.nombre_banco}</Text>
                                <Text size="xs" c="dimmed">{item.ruc || item.direccion}</Text>
                            </div>
                            <Group gap={4}>
                                <ActionIcon variant="light" color="blue" onClick={() => onEdit(item)} size="md">
                                    <IconEdit size={16} />
                                </ActionIcon>
                                <ActionIcon variant="light" color="red" onClick={() => onDelete(item.id)} size="md">
                                    <IconTrash size={16} />
                                </ActionIcon>
                            </Group>
                        </Group>

                        {(item.numero_cuenta || item.valor_unitario !== undefined || item.regimen || item.secuencia_inicial !== undefined) && (
                            <>
                                <Divider variant="dashed" />
                                <Group gap="xs">
                                    {item.numero_cuenta && (
                                        <Text size="xs" fw={500}>Cta: {item.numero_cuenta}</Text>
                                    )}
                                    {item.valor_unitario !== undefined && (
                                        <Text size="xs" fw={500} c="teal.7">${Number(item.valor_unitario).toFixed(2)}</Text>
                                    )}
                                    {item.regimen && <Badge variant="light" size="xs">{item.regimen}</Badge>}
                                    {item.secuencia_inicial !== undefined && item.secuencia_inicial > 0 && (
                                        <Badge variant="dot" color="blue" size="xs">Px: {item.secuencia_inicial}</Badge>
                                    )}
                                </Group>
                            </>
                        )}

                        {(item.tipo_cuenta || item.has_active_caja !== undefined) && (
                            <Group gap="xs">
                                {item.tipo_cuenta && <Badge variant="outline" color="orange" size="xs">{item.tipo_cuenta}</Badge>}
                                {item.has_active_caja && <Badge color="green" size="xs">Caja Abierta</Badge>}
                                {!item.has_active_caja && item.secuencia_inicial !== undefined && <Badge color="gray" variant="light" size="xs">Cerrada</Badge>}
                            </Group>
                        )}
                    </Stack>
                </Paper>
            ))}
        </Stack>
    ) : (
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
                {items.map((item) => (
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
                                {item.valor_unitario !== undefined && (
                                    <Text size="sm" fw={500} c="teal.7">${Number(item.valor_unitario).toFixed(2)}</Text>
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
                ))}
            </Table.Tbody>
        </Table>
    );

    return (
        <Paper withBorder p={isMobile ? "md" : "xl"} radius="lg">
            <Stack gap="lg">
                <Group justify="space-between" align={isMobile ? "flex-start" : "center"}>
                    <div>
                        <Title order={3} size={isMobile ? "h4" : "h3"}>{title}</Title>
                        <Text size="sm" c="dimmed">Añade o edita elementos de esta categoría.</Text>
                    </div>
                    <Button 
                        leftSection={<IconPlus size={16} />} 
                        onClick={onAdd} 
                        variant="light"
                        fullWidth={isMobile}
                    >
                        Añadir
                    </Button>
                </Group>

                {content}
            </Stack>
        </Paper>
    );
}
