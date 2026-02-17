import { Stack, Title, Group, Text, Button, Card, TextInput, Tooltip, Loader, NumberInput, Table, Badge, Code, ScrollArea, rem } from '@mantine/core';
import { IconLogout, IconDeviceFloppy } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useEmpresa } from '../context/EmpresaContext';
import type { Empresa, EmpresaRole, Perfil } from '../context/EmpresaContext';
import { useNotifications } from '../context/NotificationContext';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import { useAppConfig } from '../hooks/useAppConfig';
import { CierreHistory } from '../components/CierreHistory';
import { AppModal } from '../components/ui/AppModal';
import { AppActionButtons } from '../components/ui/AppActionButtons';
import { AjustesDashboard } from './ajustes/components/AjustesDashboard';
import { EmpresaSection } from './ajustes/components/EmpresaSection';
import { ProfileEditModal } from './ajustes/components/ProfileEditModal';
import { InviteModal } from './ajustes/components/InviteModal';
import { SettingsTable } from './ajustes/components/SettingsTable';

export function AjustesPage() {
    const { empresa, role, perfil, refresh: refreshEmpresa } = useEmpresa();
    const { configs, updateConfig, loading: configLoading } = useAppConfig();
    const { openNotifications } = useNotifications();

    // User state
    const [user, setUser] = useState<any>(null);

    // Navigation state
    const [activeTab, setActiveTab] = useState<string | null>(null);

    // Modal states
    const [opened, { open, close }] = useDisclosure(false);
    const [editProfileOpened, { open: openEditProfile, close: closeEditProfile }] = useDisclosure(false);
    const [inviteOpened, { open: openInvite, close: closeInvite }] = useDisclosure(false);

    // Profile edit states
    const [perfilNombre, setPerfilNombre] = useState('');
    const [perfilApellido, setPerfilApellido] = useState('');

    // Generic table states
    const [items, setItems] = useState<any[]>([]);
    const [fetching, setFetching] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Empresa-specific states
    const [miembros, setMiembros] = useState<any[]>([]);

    // Restored states
    const [alertPercentage, setAlertPercentage] = useState<number>(15);
    const [logs, setLogs] = useState<any[]>([]);

    const form = useForm({
        initialValues: {
            nombre: '',
            direccion: '',
        },
    });

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    useEffect(() => {
        if (perfil) {
            setPerfilNombre(perfil.nombre || '');
            setPerfilApellido(perfil.apellido || '');
        }
    }, [perfil]);

    useEffect(() => {
        if (configs.porcentaje_alerta_caja) {
            setAlertPercentage(parseInt(configs.porcentaje_alerta_caja));
        }
    }, [configs.porcentaje_alerta_caja]);

    useEffect(() => {
        if (empresa) {
            fetchData();
        }
    }, [empresa, activeTab]);



    const fetchData = async () => {
        if (!empresa || !activeTab) return;
        setFetching(true);

        if (activeTab === 'empresa') {
            // Fetch members using client-side join strategy
            const { data: usersData } = await supabase
                .from('empresa_usuarios')
                .select('*')
                .eq('empresa_id', empresa.id);

            if (usersData && usersData.length > 0) {
                const userIds = usersData.map(u => u.user_id);
                const { data: profilesData } = await supabase
                    .from('perfiles')
                    .select('id, nombre, apellido, email, telefono')
                    .in('id', userIds);

                const membersWithProfiles = usersData.map(user => {
                    const profile = profilesData?.find(p => p.id === user.user_id);
                    return {
                        ...user,
                        perfiles: profile
                    };
                });
                setMiembros(membersWithProfiles);
            } else {
                setMiembros([]);
            }
        } else if (activeTab === 'bitacora') {
            const { data } = await supabase
                .from('bitacora')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            setLogs(data || []);
        } else if (['sucursales', 'bancos', 'regimenes'].includes(activeTab)) {
            const { data } = await supabase.from(activeTab).select('*').eq('empresa_id', empresa.id);
            setItems(data || []);
        }

        setFetching(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleSubmit = async (values: any) => {
        if (!empresa) return;
        setFetching(true);

        const payload = { ...values, empresa_id: empresa.id };

        if (editingId) {
            const { error } = await supabase.from(activeTab!).update(payload).eq('id', editingId);
            if (error) {
                notifications.show({ title: 'Error', message: error.message, color: 'red' });
            } else {
                notifications.show({ title: 'Actualizado', message: 'Registro actualizado.', color: 'teal' });
                close();
                fetchData();
            }
        } else {
            const { error } = await supabase.from(activeTab!).insert(payload);
            if (error) {
                notifications.show({ title: 'Error', message: error.message, color: 'red' });
            } else {
                notifications.show({ title: 'Creado', message: 'Registro creado.', color: 'teal' });
                close();
                fetchData();
            }
        }

        setFetching(false);
    };

    const handleEdit = (item: any) => {
        setEditingId(item.id);
        form.setValues(item);
        open();
    };

    const handleDelete = async (id: string, nombre: string) => {
        modals.openConfirmModal({
            title: 'Confirmar eliminación',
            children: (
                <Text size="sm">
                    ¿Estás seguro de eliminar <Text span fw={600}>"{nombre}"</Text>? Esta acción no se puede deshacer.
                </Text>
            ),
            labels: { confirm: 'Eliminar', cancel: 'Cancelar' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                setFetching(true);
                try {
                    // Verificar si el registro está siendo usado
                    let isInUse = false;
                    let usageMessage = '';

                    if (activeTab === 'sucursales') {
                        // Verificar si hay cajas asociadas
                        const { data: cajas, error: cajasError } = await supabase
                            .from('cajas')
                            .select('id')
                            .eq('sucursal', nombre)
                            .limit(1);

                        if (cajasError) throw cajasError;
                        if (cajas && cajas.length > 0) {
                            isInUse = true;
                            usageMessage = 'Esta sucursal tiene cajas asociadas. No se puede eliminar.';
                        }
                    } else if (activeTab === 'bancos') {
                        // Verificar si hay transacciones asociadas
                        const { data: transacciones, error: transError } = await supabase
                            .from('transacciones')
                            .select('id')
                            .eq('banco', nombre)
                            .limit(1);

                        if (transError) throw transError;
                        if (transacciones && transacciones.length > 0) {
                            isInUse = true;
                            usageMessage = 'Este banco tiene transacciones asociadas. No se puede eliminar.';
                        }
                    } else if (activeTab === 'regimenes') {
                        // Verificar si hay transacciones asociadas
                        const { data: transacciones, error: transError } = await supabase
                            .from('transacciones')
                            .select('id')
                            .eq('regimen', nombre)
                            .limit(1);

                        if (transError) throw transError;
                        if (transacciones && transacciones.length > 0) {
                            isInUse = true;
                            usageMessage = 'Este régimen tiene transacciones asociadas. No se puede eliminar.';
                        }
                    }

                    if (isInUse) {
                        notifications.show({
                            title: 'No se puede eliminar',
                            message: usageMessage,
                            color: 'orange'
                        });
                        setFetching(false);
                        return;
                    }

                    // Si no está en uso, proceder con la eliminación
                    const { error } = await supabase.from(activeTab!).delete().eq('id', id);
                    if (error) throw error;

                    notifications.show({
                        title: 'Eliminado',
                        message: `"${nombre}" ha sido eliminado correctamente.`,
                        color: 'teal'
                    });
                    fetchData();
                } catch (error: any) {
                    notifications.show({
                        title: 'Error',
                        message: error.message || 'Error al eliminar el registro',
                        color: 'red'
                    });
                }
                setFetching(false);
            },
        });
    };



    const handleEditProfileClick = (member: any) => {
        setPerfilNombre(member.perfiles?.nombre || '');
        setPerfilApellido(member.perfiles?.apellido || '');
        openEditProfile();
    };

    if (!empresa) {
        return (
            <Stack align="center" justify="center" mih="100vh">
                <Loader size="lg" />
                <Text c="dimmed">Cargando empresa...</Text>
            </Stack>
        );
    }

    const inviteLink = empresa ? `${window.location.origin}/registro?empresa=${empresa.id}` : '';

    return (
        <Stack gap="lg">
            {/* Header with Title and User Info */}
            <Group justify="space-between" align="center">
                <Stack gap={4}>
                    <Title order={2} fw={700}>
                        Ajustes
                    </Title>
                    <Text size="sm" c="dimmed">
                        {perfil?.nombre ? `${perfil.nombre} ${perfil.apellido || ''}` : 'Usuario'}: {user?.email}
                    </Text>
                </Stack>

                <Button
                    variant="light"
                    color="red"
                    leftSection={<IconLogout size={16} />}
                    onClick={handleLogout}
                    radius="md"
                    size="sm"
                >
                    Cerrar Sesión
                </Button>
            </Group>

            <AnimatePresence mode="wait">
                {activeTab === null ? (
                    <motion.div
                        key="dashboard"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <AjustesDashboard
                            empresaNombre={empresa.nombre}
                            onNavigate={setActiveTab}
                            onOpenNotifications={openNotifications}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Stack gap="lg">
                            <Button variant="subtle" onClick={() => setActiveTab(null)} size="xs" w="fit-content">
                                ← Volver
                            </Button>

                            {activeTab === 'empresa' && (
                                <Stack gap="xs">
                                    <Text size="sm" c="dimmed">Administra la información legal de tu negocio y gestiona el equipo de trabajo.</Text>
                                    <EmpresaSection
                                        empresa={empresa}
                                        role={role || 'operador'}
                                        miembros={miembros}
                                        currentUserId={user?.id}
                                        onInviteClick={openInvite}
                                        onEditProfile={handleEditProfileClick}
                                        onToggleMemberStatus={async (memberId, currentStatus) => {
                                            const { error } = await supabase
                                                .from('empresa_usuarios')
                                                .update({ activo: !currentStatus })
                                                .eq('id', memberId);

                                            if (error) {
                                                notifications.show({ title: 'Error', message: error.message, color: 'red' });
                                            } else {
                                                notifications.show({
                                                    title: !currentStatus ? 'Miembro Activado' : 'Miembro Desactivado',
                                                    message: `El acceso ha sido ${!currentStatus ? 'restablecido' : 'revocado'} correctamente.`,
                                                    color: 'teal'
                                                });
                                                fetchData();
                                            }
                                        }}
                                        onRefresh={() => {
                                            refreshEmpresa();
                                            fetchData();
                                        }}
                                        inviteLink={inviteLink}
                                    />
                                </Stack>
                            )}

                            {activeTab === 'config' && (
                                <Stack gap="lg">
                                    <Stack gap={4}>
                                        <Title order={3} size="h4" fw={700}>Configuración</Title>
                                        <Text size="sm" c="dimmed">Ingresa el porcentaje mínimo para que alerte al usario que debe cerrar su caja.</Text>
                                    </Stack>
                                    <Card withBorder radius="md" p="md" bg="blue.0" maw={500} shadow="xs">
                                        <Stack gap="md">
                                            <Text fw={700} size="sm">Alertas de Saldo:</Text>
                                            <NumberInput
                                                label="Ingresa el porcentaje de reserva de saldo"
                                                value={alertPercentage}
                                                onChange={(val) => setAlertPercentage(Number(val))}
                                                min={0}
                                                max={100}
                                                suffix="%"
                                                radius="md"
                                            />
                                            <Button onClick={async () => {
                                                const { success } = await updateConfig('porcentaje_alerta_caja', alertPercentage.toString());
                                                if (success) notifications.show({ title: 'Guardado', message: 'Ajustes actualizados.', color: 'teal' });
                                            }} loading={configLoading} leftSection={<IconDeviceFloppy size={14} />}>Guardar Cambios</Button>
                                        </Stack>
                                    </Card>
                                </Stack>
                            )}

                            {activeTab === 'bitacora' && (
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
                            )}

                            {activeTab === 'history' && (
                                <Stack gap="md">
                                    <Stack gap={4}>
                                        <Title order={3} size="h4" fw={700}>Historial de Cierres</Title>
                                        <Text size="sm" c="dimmed">Consulta los reportes de arqueo y los balances confirmados en cada cierre de caja.</Text>
                                    </Stack>
                                    <CierreHistory />
                                </Stack>
                            )}

                            {['sucursales', 'bancos', 'regimenes'].includes(activeTab) && (
                                <Stack gap="xs">
                                    <Text size="sm" c="dimmed">
                                        {activeTab === 'sucursales' && 'Configura los diferentes puntos de gasto de tu empresa.'}
                                        {activeTab === 'bancos' && 'Administra las entidades bancarias para el registro de cheques de reposición.'}
                                        {activeTab === 'regimenes' && 'Define los tipos de regímenes fiscales para categorizar adecuadamente a tus proveedores.'}
                                    </Text>
                                    <SettingsTable
                                        title={getSingularName(activeTab)}
                                        items={items}
                                        activeTab={activeTab}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                        onAdd={() => { setEditingId(null); form.reset(); open(); }}
                                        fetching={fetching}
                                    />
                                </Stack>
                            )}
                        </Stack>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Generic CRUD Modal */}
            <AppModal opened={opened} onClose={close} title={editingId ? `Editar ${getSingularName(activeTab)}` : `Nuevo ${getSingularName(activeTab)}`} loading={fetching}>
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="md">
                        <TextInput label="Nombre" placeholder="Nombre" required radius="md" {...form.getInputProps('nombre')} />
                        {activeTab === 'sucursales' && <TextInput label="Dirección" placeholder="Dirección" radius="md" {...form.getInputProps('direccion')} />}
                        <AppActionButtons onCancel={close} loading={fetching} submitLabel={editingId ? 'Actualizar' : 'Crear'} />
                    </Stack>
                </form>
            </AppModal>

            {/* Profile Edit Modal */}
            <ProfileEditModal
                opened={editProfileOpened}
                onClose={closeEditProfile}
                userId={user?.id || ''}
                initialNombre={perfilNombre}
                initialApellido={perfilApellido}
                onSuccess={() => {
                    refreshEmpresa();
                    fetchData();
                }}
            />

            {/* Invite Modal */}
            <InviteModal
                opened={inviteOpened}
                onClose={closeInvite}
                empresaId={empresa.id}
                userId={user?.id || ''}
                onSuccess={fetchData}
            />
        </Stack>
    );
}

function getSingularName(tab: string | null) {
    switch (tab) {
        case 'sucursales': return 'Sucursal';
        case 'bancos': return 'Banco';
        case 'regimenes': return 'Régimen';
        default: return 'Registro';
    }
}
