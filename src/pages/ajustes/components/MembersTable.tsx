import { Table, Group, Avatar, Stack, Text, Badge, ActionIcon, Tooltip, MultiSelect, Modal, Button, Select } from '@mantine/core';
import { IconUser, IconEdit, IconUserMinus, IconUserCheck, IconDeviceFloppy } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useEmpresa } from '../../../context/EmpresaContext';
import { supabase } from '../../../lib/supabaseClient';
import { notifications } from '@mantine/notifications';
import { useQueryClient, useQuery } from '@tanstack/react-query';

interface Member {
    id: string;
    user_id: string;
    role: string;
    activo: boolean;
    created_at: string;
    sucursales?: string[];
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
    const queryClient = useQueryClient();
    const { empresa } = useEmpresa();

    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [selectedSucursales, setSelectedSucursales] = useState<string[]>([]);
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [saving, setSaving] = useState(false);

    const { data: sucursalesList = [] } = useQuery({
        queryKey: ['sucursales_names', empresa?.id],
        queryFn: async () => {
            if (!empresa) return [];
            const { data } = await supabase.from('sucursales').select('nombre').eq('empresa_id', empresa.id).order('nombre');
            return (data || []).map(s => String(s.nombre));
        },
        enabled: !!empresa && isPrivileged
    });

    const handleSaveMember = async () => {
        if (!editingMember) return;
        setSaving(true);
        const { error } = await supabase
            .from('empresa_usuarios')
            .update({ 
                sucursales: selectedSucursales,
                role: selectedRole
            })
            .eq('id', editingMember.id);
        
        setSaving(false);
        if (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } else {
            notifications.show({ title: 'Guardado', message: 'Datos del miembro actualizados', color: 'teal' });
            setEditingMember(null);
            queryClient.invalidateQueries({ queryKey: ['settings_miembros'] });
        }
    };

    return (
        <>
        <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
                <Table.Tr>
                    <Table.Th>Usuario</Table.Th>
                    <Table.Th>Rol</Table.Th>
                    <Table.Th>Sucursales</Table.Th>
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
                            <Group gap={4}>
                                {m.role === 'owner' || m.role === 'admin' ? (
                                    <Badge size="xs" color="gray" variant="dot">Todas (Admin)</Badge>
                                ) : (
                                    (m.sucursales && m.sucursales.length > 0) ? (
                                        m.sucursales.map(s => <Badge key={s} size="xs" variant="outline" color="blue">{s}</Badge>)
                                    ) : (
                                        <Text size="xs" c="dimmed">Ninguna asignada</Text>
                                    )
                                )}
                            </Group>
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
                                {isPrivileged && m.user_id !== currentUserId && m.role !== 'owner' && (
                                    (currentUserRole === 'owner' || m.role === 'operador') && (
                                        <Tooltip label="Editar rol y sucursales">
                                            <ActionIcon
                                                variant="light"
                                                color="blue"
                                                size="sm"
                                                onClick={() => {
                                                    setEditingMember(m);
                                                    setSelectedSucursales(m.sucursales || []);
                                                    setSelectedRole(m.role);
                                                }}
                                            >
                                                <IconEdit size={16} />
                                            </ActionIcon>
                                        </Tooltip>
                                    )
                                )}
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

        <Modal 
            opened={!!editingMember} 
            onClose={() => setEditingMember(null)} 
            title="Editar Miembro"
            centered
        >
            <Stack gap="md">
                <Text size="sm" c="dimmed">
                    Seleccione las sucursales a las que <b>{editingMember?.perfiles?.nombre}</b> tendrá acceso para facturar y abrir cajas.
                </Text>
                
                <Select
                    label="Rol en la empresa"
                    placeholder="Seleccione rol"
                    data={[
                        { value: 'admin', label: 'Administrador' },
                        { value: 'operador', label: 'Operador' },
                    ]}
                    value={selectedRole}
                    onChange={(v) => setSelectedRole(v || '')}
                    disabled={currentUserRole !== 'owner' && editingMember?.role === 'admin'}
                    mb="xs"
                />

                <MultiSelect
                    label="Sucursales asignadas"
                    placeholder="Seleccione una o más"
                    data={sucursalesList}
                    value={selectedSucursales}
                    onChange={setSelectedSucursales}
                    searchable
                    clearable
                    disabled={selectedRole === 'admin'} // Los admins usualmente tienen acceso global
                    description={selectedRole === 'admin' ? "Los administradores tienen acceso a todas las sucursales" : undefined}
                    nothingFoundMessage="No hay sucursales creadas aún"
                    classNames={{
                        input: 'bg-white'
                    }}
                />

                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={() => setEditingMember(null)}>Cancelar</Button>
                    <Button 
                        loading={saving} 
                        onClick={handleSaveMember}
                        leftSection={<IconDeviceFloppy size={16} />}
                    >
                        Guardar Cambios
                    </Button>
                </Group>
            </Stack>
        </Modal>
        </>
    );
}
