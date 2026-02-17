import { Table, Group, Avatar, Stack, Text, Badge, ActionIcon, Tooltip } from '@mantine/core';
import { IconUser, IconEdit, IconUserMinus, IconUserCheck } from '@tabler/icons-react';
import dayjs from 'dayjs';

interface Member {
    id: string;
    user_id: string;
    role: string;
    activo: boolean;
    created_at: string;
    perfiles?: {
        nombre?: string;
        apellido?: string;
        email?: string;
        telefono?: string;
    };
}

interface MembersTableProps {
    members: Member[];
    currentUserId?: string;
    currentUserRole?: string;
    onEditProfile: (member: Member) => void;
    onToggleStatus?: (memberId: string, currentStatus: boolean) => void;
}

export function MembersTable({ members, currentUserId, currentUserRole, onEditProfile, onToggleStatus }: MembersTableProps) {
    const isPrivileged = currentUserRole === 'owner' || currentUserRole === 'admin';

    return (
        <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
                <Table.Tr>
                    <Table.Th>Usuario</Table.Th>
                    <Table.Th>Rol</Table.Th>
                    <Table.Th>Estado</Table.Th>
                    <Table.Th>Desde</Table.Th>
                    <Table.Th w={100}></Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {members.map((m) => (
                    <Table.Tr key={m.id}>
                        <Table.Td>
                            <Group gap="sm">
                                <Avatar size="sm" color={m.activo ? 'blue' : 'gray'} radius="xl" variant="light">
                                    {m.perfiles?.nombre?.charAt(0).toUpperCase() || <IconUser size={14} />}
                                </Avatar>
                                <Stack gap={0}>
                                    <Text size="sm" fw={500} opacity={m.activo ? 1 : 0.6}>
                                        {m.perfiles?.nombre ? `${m.perfiles.nombre} ${m.perfiles.apellido || ''}` : 'Usuario sin nombre'}
                                        {m.user_id === currentUserId && <Text span c="blue" size="xs" ml={5}>(Tú)</Text>}
                                    </Text>
                                    <Text size="xs" c="dimmed" opacity={m.activo ? 1 : 0.6}>
                                        {m.perfiles?.email || 'Sin correo'}
                                        {m.perfiles?.telefono ? ` • ${m.perfiles.telefono}` : ''}
                                    </Text>
                                </Stack>
                            </Group>
                        </Table.Td>
                        <Table.Td>
                            <Badge
                                color={m.role === 'owner' ? 'indigo' : m.role === 'admin' ? 'blue' : 'gray'}
                                variant="light" size="sm"
                                opacity={m.activo ? 1 : 0.6}
                            >
                                {m.role === 'owner' ? 'Propietario' : m.role === 'admin' ? 'Admin' : 'Operador'}
                            </Badge>
                        </Table.Td>
                        <Table.Td>
                            <Badge color={m.activo ? 'teal' : 'red'} variant="dot" size="sm">
                                {m.activo ? 'Activo' : 'Inactivo'}
                            </Badge>
                        </Table.Td>
                        <Table.Td>
                            <Text size="xs" c="dimmed">{dayjs(m.created_at).format('DD/MM/YYYY')}</Text>
                        </Table.Td>
                        <Table.Td>
                            <Group gap="xs" justify="flex-end">
                                {m.user_id === currentUserId && (
                                    <Tooltip label="Editar mi perfil">
                                        <ActionIcon
                                            variant="subtle"
                                            color="blue"
                                            size="sm"
                                            onClick={() => onEditProfile(m)}
                                        >
                                            <IconEdit size={16} />
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                                {isPrivileged && m.user_id !== currentUserId && m.role === 'operador' && (
                                    <Tooltip label={m.activo ? 'Desactivar acceso' : 'Activar acceso'}>
                                        <ActionIcon
                                            variant="subtle"
                                            color={m.activo ? 'red' : 'teal'}
                                            size="sm"
                                            onClick={() => onToggleStatus?.(m.id, m.activo)}
                                        >
                                            {m.activo ? <IconUserMinus size={16} /> : <IconUserCheck size={16} />}
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </Group>
                        </Table.Td>
                    </Table.Tr>
                ))}
            </Table.Tbody>
        </Table>
    );
}
