import { Stack, Card, Group, Avatar, Text, ActionIcon, TextInput, Button, Badge, CopyButton, Tooltip, Alert, Grid, Divider, Table } from '@mantine/core';
import { IconBuilding, IconEdit, IconDeviceFloppy, IconUserPlus, IconCheck, IconCopy, IconInfoCircle, IconX, IconMail, IconLink } from '@tabler/icons-react';
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
    sucursales?: string[];
    perfiles?: {
        nombre?: string;
        apellido?: string;
        email?: string;
        telefono?: string;
    };
}

interface Invitation {
    id: string;
    email: string;
    role: string;
    created_at: string;
}

interface EmpresaSectionProps {
    empresa: Empresa;
    role: string;
    miembros: Member[];
    currentUserId?: string;
    onInviteClick: () => void;
    onEditProfile: (member: Member) => void;
    onToggleMemberStatus: (memberId: string, currentStatus: boolean) => void;
    invitaciones: Invitation[];
    onCancelInvitation: (id: string) => void;
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
    invitaciones,
    onCancelInvitation,
    onRefresh,
    inviteLink
}: EmpresaSectionProps) {
    const [editingEmpresa, setEditingEmpresa] = useState(false);
    const [empresaNombre, setEmpresaNombre] = useState(empresa.nombre);
    const [empresaRuc, setEmpresaRuc] = useState(empresa.ruc || '');
    const [empresaDireccion, setEmpresaDireccion] = useState(empresa.direccion || '');
    const [empresaEmail, setEmpresaEmail] = useState(empresa.email || '');
    const [empresaContacto, setEmpresaContacto] = useState(empresa.contacto_nombre || '');
    const [empresaCiudad, setEmpresaCiudad] = useState(empresa.ciudad || '');
    const [savingEmpresa, setSavingEmpresa] = useState(false);

    const handleSaveEmpresa = async () => {
        setSavingEmpresa(true);
        const { error } = await supabase.from('empresas').update({
            nombre: empresaNombre,
            ruc: empresaRuc || null,
            direccion: empresaDireccion || null,
            email: empresaEmail || null,
            contacto_nombre: empresaContacto || null,
            ciudad: empresaCiudad || null,
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
                                <Alert icon={<IconInfoCircle size={16}/>} title="Aviso Importante" color="blue" variant="light" radius="md">
                                    <Text size="sm">Si requiere <b>Factura Electrónica</b> por su suscripción, llene estos datos de acuerdo con su información legal. La factura será emitida con estos detalles.</Text>
                                </Alert>
                                <Grid>
                                    <Grid.Col span={{ base: 12, sm: 6 }}>
                                        <TextInput label="Razón Social / Nombre" value={empresaNombre} onChange={(e) => setEmpresaNombre(e.currentTarget.value)} radius="md" />
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, sm: 6 }}>
                                        <TextInput label="RUC / Identificación" value={empresaRuc} onChange={(e) => setEmpresaRuc(e.currentTarget.value)} radius="md" />
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, sm: 6 }}>
                                        <TextInput label="Correo Electrónico de Facturación" type="email" value={empresaEmail} onChange={(e) => setEmpresaEmail(e.currentTarget.value)} radius="md" />
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, sm: 6 }}>
                                        <TextInput label="Número de Contacto" placeholder="Ej: +593 ... o 098..." value={empresaContacto} onChange={(e) => setEmpresaContacto(e.currentTarget.value)} radius="md" />
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, sm: 6 }}>
                                        <TextInput label="Dirección Legal" value={empresaDireccion} onChange={(e) => setEmpresaDireccion(e.currentTarget.value)} radius="md" />
                                    </Grid.Col>
                                    <Grid.Col span={{ base: 12, sm: 6 }}>
                                        <TextInput label="Ciudad" value={empresaCiudad} onChange={(e) => setEmpresaCiudad(e.currentTarget.value)} radius="md" />
                                    </Grid.Col>
                                </Grid>
                                <Group justify="flex-end" mt="md">
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

                    <Group gap="xl" mt="xs" align="flex-start" wrap="wrap">
                        <Stack gap={2}>
                            <Text size="xs" c="dimmed" fw={600}>RUC / Identificación</Text>
                            <Text size="sm" fw={500}>{empresa.ruc || 'No registrado'}</Text>
                        </Stack>
                        <Stack gap={2}>
                            <Text size="xs" c="dimmed" fw={600}>Email de Facturación</Text>
                            <Text size="sm" fw={500}>{empresa.email || 'No registrado'}</Text>
                        </Stack>
                        <Stack gap={2}>
                            <Text size="xs" c="dimmed" fw={600}>Ciudad</Text>
                            <Text size="sm" fw={500}>{empresa.ciudad || 'No registrado'}</Text>
                        </Stack>
                        <Stack gap={2}>
                            <Text size="xs" c="dimmed" fw={600}>Dirección</Text>
                            <Text size="sm" fw={500}>{empresa.direccion || 'No registrado'}</Text>
                        </Stack>
                        <Stack gap={2}>
                            <Text size="xs" c="dimmed" fw={600}>Contacto</Text>
                            <Text size="sm" fw={500}>{empresa.contacto_nombre || 'No registrado'}</Text>
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

                    {invitaciones.length > 0 && (
                        <>
                            <Divider my="sm" label="Invitaciones Pendientes" labelPosition="center" />
                            <Table verticalSpacing="sm">
                                <Table.Tbody>
                                    {invitaciones.map((inv) => (
                                        <Table.Tr key={inv.id}>
                                            <Table.Td>
                                                <Group gap="sm">
                                                    <Avatar size="sm" radius="xl" color="orange" variant="light">
                                                        <IconMail size={16} />
                                                    </Avatar>
                                                    <Stack gap={0}>
                                                        <Text size="sm" fw={500}>{inv.email}</Text>
                                                        <Text size="xs" c="dimmed">Enviada {dayjs(inv.created_at).format('DD/MM/YYYY')}</Text>
                                                    </Stack>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge color="gray" variant="light" size="sm">
                                                    {inv.role === 'owner' ? 'Propietario' : inv.role === 'admin' ? 'Admin' : 'Operador'}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge color="orange" variant="outline" size="sm">Pendiente</Badge>
                                            </Table.Td>
                                            <Table.Td w={150}>
                                                <Group justify="flex-end" gap="xs">
                                                    <CopyButton value={`${window.location.origin}?invite=${inv.id}`}>
                                                        {({ copied, copy }) => (
                                                            <Tooltip label={copied ? 'Copiado' : 'Copiar enlace personal'}>
                                                                <ActionIcon 
                                                                    variant="light" 
                                                                    color={copied ? 'teal' : 'blue'} 
                                                                    onClick={copy}
                                                                >
                                                                    {copied ? <IconCheck size={16} /> : <IconLink size={16} />}
                                                                </ActionIcon>
                                                            </Tooltip>
                                                        )}
                                                    </CopyButton>
                                                    {(role === 'owner' || role === 'admin') && (
                                                        <Tooltip label="Cancelar invitación">
                                                            <ActionIcon 
                                                                variant="subtle" 
                                                                color="red" 
                                                                onClick={() => onCancelInvitation(inv.id)}
                                                            >
                                                                <IconX size={16} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    )}
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </>
                    )}
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
