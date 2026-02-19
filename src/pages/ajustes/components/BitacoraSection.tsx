import { Stack, Group, Title, Badge, Text, ScrollArea, Table, rem, Tooltip, Code } from '@mantine/core';
import dayjs from 'dayjs';

export function BitacoraSection({ logs }: { logs: any[] }) {
    return (
        <Stack gap="md">
            <Stack gap={4}>
                <Group justify="space-between" align="flex-end">
                    <Title order={3} size="h4" fw={700}>Bitácora</Title>
                    <Badge variant="light" color="gray">{logs.length} eventos</Badge>
                </Group>
                <Text size="sm" c="dimmed">Registro histórico de todas las acciones y cambios realizados por los usuarios en el sistema.</Text>
            </Stack>
            <ScrollArea h={rem(500)}>
                <Table striped highlightOnHover style={{ fontSize: rem(13) }}>
                    <Table.Thead bg="gray.0"><Table.Tr><Table.Th>Fecha</Table.Th><Table.Th>Usuario</Table.Th><Table.Th>Acción</Table.Th><Table.Th>Detalles</Table.Th></Table.Tr></Table.Thead>
                    <Table.Tbody>
                        {logs.map((log: any) => (
                            <Table.Tr key={log.id}>
                                <Table.Td style={{ whiteSpace: 'nowrap' }}>{dayjs(log.created_at).format('DD/MM HH:mm')}</Table.Td>
                                <Table.Td>{log.user_email || 'Sistema'}</Table.Td>
                                <Table.Td><Badge color={log.accion.includes('ELIMINAR') ? 'red' : 'teal'} variant="dot" size="xs">{log.accion.split(' ')[0]}</Badge></Table.Td>
                                <Table.Td><Tooltip label={JSON.stringify(log.detalle)} multiline w={250} withArrow><Code color="gray.1" style={{ cursor: 'help' }}>Ver</Code></Tooltip></Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </ScrollArea>
        </Stack>
    );
}
