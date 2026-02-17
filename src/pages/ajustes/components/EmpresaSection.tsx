import { Stack, Card, Group, Avatar, Text, ActionIcon, TextInput, Button, Badge, CopyButton, Tooltip } from '@mantine/core';
import { IconBuilding, IconEdit, IconDeviceFloppy, IconUserPlus, IconCheck, IconCopy } from '@tabler/icons-react';
import { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import { MembersTable } from './MembersTable';
import type { Empresa } from '../../../context/EmpresaContext';

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

interface EmpresaSectionProps {
    empresa: Empresa;
    role: string;
    miembros: Member[];
    currentUserId?: string;
    onInviteClick: () => void;
    onEditProfile: (member: Member) => void;
    onToggleMemberStatus: (memberId: string, currentStatus: boolean) => void;
    onRefresh: () => void;
    inviteLink?: string;
}

export function EmpresaSection({
    empresa,
    role,
    miembros,
    currentUserId,
    onInviteClick,
    onEditProfile,
    onToggleMemberStatus,
    onRefresh,
    inviteLink
}: EmpresaSectionProps) {
    const [editingEmpresa, setEditingEmpresa] = useState(false);
    const [empresaNombre, setEmpresaNombre] = useState(empresa.nombre);
    const [empresaRuc, setEmpresaRuc] = useState(empresa.ruc || '');
    const [savingEmpresa, setSavingEmpresa] = useState(false);

    const handleSaveEmpresa = async () => {
        setSavingEmpresa(true);
        const { error } = await supabase.from('empresas').update({
            nombre: empresaNombre,
            ruc: empresaRuc || null,
        }).eq('id', empresa.id);

        setSavingEmpresa(false);

        if (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } else {
            notifications.show({ title: 'Empresa actualizada', message: 'Datos guardados.', color: 'teal' });
            setEditingEmpresa(false);
            onRefresh();
        }
    };

    return (
        <Stack gap="xl">
            {/* Company Info Card */}
            <Card withBorder radius="md" p="lg" shadow="xs">
                <Stack gap="md">
                    <Group justify="space-between">
                        <Group gap="md">
                            <Avatar size={48} radius="xl" color="indigo" variant="light">
                                <IconBuilding size={24} />
                            </Avatar>
                            <Stack gap={2}>
                                <Text fw={700} size="lg">{empresa.nombre}</Text>
                                <Text size="xs" c="dimmed">Creada {dayjs(empresa.created_at).format('DD/MM/YYYY')}</Text>
                            </Stack>
                        </Group>
                        {(role === 'owner' || role === 'admin') && (
                            <ActionIcon variant="subtle" color="blue" onClick={() => setEditingEmpresa(!editingEmpresa)} radius="md">
                                <IconEdit size={18} />
                            </ActionIcon>
                        )}
                    </Group>

                    {editingEmpresa && (
                        <Card withBorder radius="md" p="md" bg="gray.0">
                            <Stack gap="sm">
                                <TextInput label="Nombre" value={empresaNombre} onChange={(e) => setEmpresaNombre(e.currentTarget.value)} radius="md" />
                                <TextInput label="RUC" value={empresaRuc} onChange={(e) => setEmpresaRuc(e.currentTarget.value)} radius="md" />
                                <Group justify="flex-end">
                                    <Button variant="subtle" color="gray" onClick={() => setEditingEmpresa(false)}>Cancelar</Button>
                                    <Button
                                        loading={savingEmpresa}
                                        leftSection={<IconDeviceFloppy size={14} />}
                                        onClick={handleSaveEmpresa}
                                    >
                                        Guardar
                                    </Button>
                                </Group>
                            </Stack>
                        </Card>
                    )}

                    <Group gap="xl" mt="xs">
                        <Stack gap={2}>
                            <Text size="xs" c="dimmed" fw={600}>RUC</Text>
                            <Text size="sm" fw={500}>{empresa.ruc || 'No registrado'}</Text>
                        </Stack>
                        <Stack gap={2}>
                            <Text size="xs" c="dimmed" fw={600}>Tu Rol</Text>
                            <Badge color={role === 'owner' ? 'indigo' : role === 'admin' ? 'blue' : 'gray'} variant="light" size="sm">
                                {role === 'owner' ? 'Propietario' : role === 'admin' ? 'Administrador' : 'Operador'}
                            </Badge>
                        </Stack>
                        <Stack gap={2}>
                            <Text size="xs" c="dimmed" fw={600}>Miembros</Text>
                            <Text size="sm" fw={500}>{miembros.length}</Text>
                        </Stack>
                    </Group>
                </Stack>
            </Card>

            {/* Members Table */}
            <Card withBorder radius="md" p="lg" shadow="xs">
                <Stack gap="md">
                    <Group justify="space-between">
                        <Text fw={700} size="md">Miembros del equipo</Text>
                        {(role === 'owner' || role === 'admin') && (
                            <Button size="xs" variant="light" leftSection={<IconUserPlus size={14} />} onClick={onInviteClick} radius="md">
                                Invitar
                            </Button>
                        )}
                    </Group>

                    <MembersTable
                        members={miembros}
                        currentUserId={currentUserId}
                        currentUserRole={role}
                        onEditProfile={onEditProfile}
                        onToggleStatus={onToggleMemberStatus}
                    />
                </Stack>
            </Card>

            {/* Invite Link Card */}
            {
                inviteLink && (
                    <Card withBorder radius="md" p="lg" shadow="xs">
                        <Stack gap="md">
                            <Text fw={700} size="md">Enlace de Invitación rápido</Text>
                            <Text size="sm" c="dimmed">Comparte este enlace para invitar usuarios a tu empresa</Text>
                            <Group gap="xs">
                                <TextInput
                                    value={inviteLink}
                                    readOnly
                                    radius="md"
                                    w="100%"
                                    maw={500}
                                />
                                <CopyButton value={inviteLink}>
                                    {({ copied, copy }) => (
                                        <Tooltip label={copied ? 'Copiado' : 'Copiar'}>
                                            <ActionIcon color={copied ? 'teal' : 'blue'} variant="light" onClick={copy} size="lg">
                                                {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                                            </ActionIcon>
                                        </Tooltip>
                                    )}
                                </CopyButton>
                            </Group>
                        </Stack>
                    </Card>
                )
            }
        </Stack >
    );
}
