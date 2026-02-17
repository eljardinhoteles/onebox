import { useState, useEffect } from 'react';
import { Paper, Stack, Button, Text, Group, Table, ActionIcon, TextInput, Title, Badge, LoadingOverlay, NumberInput, Avatar, Card, ScrollArea, Tooltip, rem, Code, SimpleGrid, UnstyledButton, CopyButton, Select } from '@mantine/core';
import { IconLogout, IconPlus, IconEdit, IconTrash, IconBuildingStore, IconBuildingBank, IconDeviceFloppy, IconListDetails, IconSettings, IconUser, IconHistory, IconChevronLeft, IconBell, IconBuilding, IconUserPlus, IconCopy, IconCheck, IconMail } from '@tabler/icons-react';
import { supabase } from '../lib/supabaseClient';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useAppConfig } from '../hooks/useAppConfig';
import { AppModal } from '../components/ui/AppModal';
import { AppActionButtons } from '../components/ui/AppActionButtons';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import { CierreHistory } from '../components/CierreHistory';
import { useNotifications } from '../context/NotificationContext';
import { useEmpresa } from '../context/EmpresaContext';

export function AjustesPage() {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [activeTab, setActiveTab] = useState<string | null>(null);

    // PERSISTENCIA: Cargar pestaña desde URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab) setActiveTab(tab);
    }, []);

    // PERSISTENCIA: Sincronizar pestaña con URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (activeTab) {
            params.set('tab', activeTab);
        } else {
            params.delete('tab');
        }
        window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    }, [activeTab]);
    const { configs, updateConfig, loading: configLoading } = useAppConfig();
    const { openNotifications } = useNotifications();
    const { empresa, role, perfil, refresh: refreshEmpresa } = useEmpresa();
    const [alertPercentage, setAlertPercentage] = useState<number>(15);
    const [user, setUser] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);

    // Data states
    const [sucursales, setSucursales] = useState<any[]>([]);
    const [bancos, setBancos] = useState<any[]>([]);
    const [regimenes, setRegimenes] = useState<any[]>([]);
    const [miembros, setMiembros] = useState<any[]>([]);
    const [invitaciones, setInvitaciones] = useState<any[]>([]);

    // Empresa edit states
    const [editingEmpresa, setEditingEmpresa] = useState(false);
    const [empresaNombre, setEmpresaNombre] = useState('');
    const [empresaRuc, setEmpresaRuc] = useState('');
    const [savingEmpresa, setSavingEmpresa] = useState(false);

    // Invite modal
    const [inviteOpened, { open: openInvite, close: closeInvite }] = useDisclosure(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<string>('operador');
    const [inviting, setInviting] = useState(false);

    // Profile edit states
    const [perfilNombre, setPerfilNombre] = useState('');
    const [perfilApellido, setPerfilApellido] = useState('');
    const [savingPerfil, setSavingPerfil] = useState(false);
    const [editProfileOpened, { open: openEditProfile, close: closeEditProfile }] = useDisclosure(false);

    // Stats states
    const [counts, setCounts] = useState({ sucursales: 0, bancos: 0, regimenes: 0 });
    const [isOnline, setIsOnline] = useState(true);

    // Modal & Form states
    const [opened, { open, close }] = useDisclosure(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const form = useForm({
        initialValues: {
            nombre: '',
            direccion: '',
        },
        validate: {
            nombre: (value) => (value.length < 2 ? 'Escribe al menos 2 caracteres' : null),
        }
    });

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    useEffect(() => {
        if (configs.porcentaje_alerta_caja) {
            setAlertPercentage(parseInt(configs.porcentaje_alerta_caja));
        }
    }, [configs.porcentaje_alerta_caja]);

    const fetchStats = async () => {
        try {
            const [s, b, r] = await Promise.all([
                supabase.from('sucursales').select('*', { count: 'exact', head: true }),
                supabase.from('bancos').select('*', { count: 'exact', head: true }),
                supabase.from('regimenes').select('*', { count: 'exact', head: true })
            ]);
            setCounts({
                sucursales: s.count || 0,
                bancos: b.count || 0,
                regimenes: r.count || 0
            });
            setIsOnline(true);
        } catch (e) {
            setIsOnline(false);
        }
    };

    const fetchData = async () => {
        setFetching(true);
        try {
            if (activeTab === 'sucursales') {
                const { data } = await supabase.from('sucursales').select('*').order('nombre');
                setSucursales(data || []);
            } else if (activeTab === 'bancos') {
                const { data } = await supabase.from('bancos').select('*').order('nombre');
                setBancos(data || []);
            } else if (activeTab === 'regimenes') {
                const { data } = await supabase.from('regimenes').select('*').order('nombre');
                setRegimenes(data || []);
            } else if (activeTab === 'bitacora') {
                const { data } = await supabase
                    .from('bitacora')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50);
                setLogs(data || []);
            } else if (activeTab === 'empresa') {
                if (perfil) {
                    setPerfilNombre(perfil.nombre || '');
                    setPerfilApellido(perfil.apellido || '');
                }
                // Cargar miembros de la empresa (Estrategia Client-Side Join robusta)
                if (empresa) {
                    // 1. Obtener la relación usuario-empresa (siempre existe)
                    const { data: usersData } = await supabase
                        .from('empresa_usuarios')
                        .select('*')
                        .eq('empresa_id', empresa.id);

                    if (usersData && usersData.length > 0) {
                        // 2. Obtener los perfiles de esos usuarios
                        const userIds = usersData.map(u => u.user_id);
                        const { data: profilesData } = await supabase
                            .from('perfiles')
                            .select('id, nombre, apellido, email, telefono')
                            .in('id', userIds);

                        // 3. Unir manualmente en el cliente
                        const membersWithProfiles = usersData.map(user => {
                            const profile = profilesData?.find(p => p.id === user.user_id);
                            return {
                                ...user,
                                perfiles: profile // Adjuntamos el perfil encontrado (o undefined)
                            };
                        });
                        setMiembros(membersWithProfiles);
                    } else {
                        setMiembros([]);
                    }
                    setEmpresaNombre(empresa.nombre);
                    setEmpresaRuc(empresa.ruc || '');

                    // Cargar invitaciones pendientes
                    const { data: invData, error: invError } = await supabase
                        .from('invitaciones')
                        .select('*')
                        .eq('empresa_id', empresa.id)
                        .eq('status', 'pendiente');

                    if (invError) console.error('Error cargando invitaciones:', invError);
                    setInvitaciones(invData || []);
                }
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        if (activeTab === null) {
            fetchStats();
        } else {
            fetchData();
        }
    }, [activeTab, empresa]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleOpenCreate = () => {
        setEditingId(null);
        form.reset();
        open();
    };

    const handleOpenEdit = (item: any) => {
        setEditingId(item.id);
        form.setValues({
            nombre: item.nombre,
            direccion: item.direccion || '',
        });
        open();
    };

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            const table = activeTab as string;
            const payload: any = { nombre: values.nombre };
            if (activeTab === 'sucursales') {
                payload.direccion = values.direccion;
            }

            let error;
            if (editingId) {
                const { error: err } = await supabase.from(table).update(payload).eq('id', editingId);
                error = err;
            } else {
                const { error: err } = await supabase.from(table).insert([payload]);
                error = err;
            }

            if (error) throw error;

            // Log de bitácora
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('bitacora').insert({
                accion: editingId ? `EDITAR_${table.toUpperCase().slice(0, -1)}` : `CREAR_${table.toUpperCase().slice(0, -1)}`,
                detalle: { nombre: values.nombre, table },
                user_id: user?.id,
                user_email: user?.email
            });

            notifications.show({ title: editingId ? 'Registro actualizado' : 'Registro creado', message: 'Éxito.', color: 'teal' });
            close();
            fetchData();
        } catch (error: any) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const table = activeTab as string;
        if (!confirm('¿Seguro?')) return;
        try {
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;

            // Log de bitácora
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('bitacora').insert({
                accion: `ELIMINAR_${table.toUpperCase().slice(0, -1)}`,
                detalle: { id, table },
                user_id: user?.id,
                user_email: user?.email
            });

            notifications.show({ title: 'Eliminado', message: 'El registro ha sido removido.', color: 'orange' });
            fetchData();
        } catch (error: any) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        }
    };

    const renderTable = (data: any[], type: string) => (
        <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
                <Table.Tr>
                    <Table.Th>Nombre</Table.Th>
                    {type === 'sucursal' && <Table.Th>Dirección</Table.Th>}
                    <Table.Th ta="right">Acciones</Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {data.map((item) => (
                    <Table.Tr key={item.id}>
                        <Table.Td>
                            <Group gap="sm">
                                <Avatar size="sm" color="blue" radius="md" variant="light">
                                    {item.nombre.charAt(0).toUpperCase()}
                                </Avatar>
                                <Text fw={600} size="sm">{item.nombre}</Text>
                            </Group>
                        </Table.Td>
                        {type === 'sucursal' && (
                            <Table.Td>
                                <Text size="xs" c="dimmed" lineClamp={1}>{item.direccion || 'No especificada'}</Text>
                            </Table.Td>
                        )}
                        <Table.Td>
                            <Group gap={4} justify="flex-end">
                                <Tooltip label="Editar">
                                    <ActionIcon variant="subtle" color="blue" onClick={() => handleOpenEdit(item)} radius="md">
                                        <IconEdit size={18} stroke={1.5} />
                                    </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Eliminar">
                                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(item.id)} radius="md">
                                        <IconTrash size={18} stroke={1.5} />
                                    </ActionIcon>
                                </Tooltip>
                            </Group>
                        </Table.Td>
                    </Table.Tr>
                ))}
                {!fetching && data.length === 0 && (
                    <Table.Tr><Table.Td colSpan={5} ta="center" py="xl" c="dimmed">No hay registros.</Table.Td></Table.Tr>
                )}
            </Table.Tbody>
        </Table>
    );

    return (
        <Stack gap="xl" p="xl" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
            {/* Header with Title and User Info */}
            <Stack gap="sm">
                <Title order={1} size="h2" fw={900} style={{ letterSpacing: '-1px', color: '#1a1a1a' }}>
                    Ajustes
                </Title>
                <Group justify="space-between" align="center">
                    <Group gap="md">
                        <Avatar size={40} radius="xl" color="blue" variant="light">
                            {(perfil?.nombre || user?.email)?.charAt(0).toUpperCase()}
                        </Avatar>
                        <Stack gap={0}>
                            <Text fw={700} size="sm">
                                {perfil?.nombre ? `${perfil.nombre} ${perfil.apellido || ''}` : 'Usuario'}
                            </Text>
                            <Text size="xs" c="dimmed">{user?.email}</Text>
                        </Stack>
                    </Group>

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
            </Stack>

            <AnimatePresence mode="wait">
                {activeTab === null ? (
                    <motion.div
                        key="dashboard"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Stack gap="xl">
                            {/* Health / Stats Bar - Minimalist Status Bar */}
                            <Paper withBorder radius="md" px="md" py="xs" bg="gray.0" shadow="none">
                                <Group justify="space-between">
                                    <Group gap="xl">
                                        <Group gap="xs">
                                            <Badge color={isOnline ? 'teal' : 'red'} variant="filled" size="xs" circle />
                                            <Text size="xs" fw={700} c="dimmed">DB: <Text span c={isOnline ? 'teal.8' : 'red.8'}>{isOnline ? 'CONECTADO' : 'ERROR'}</Text></Text>
                                        </Group>

                                        <Group gap="md">
                                            <Text size="xs" fw={600} c="dimmed">SUCURSALES: <Text span c="blue.8">{counts.sucursales}</Text></Text>
                                            <Text size="xs" fw={600} c="dimmed">BANCOS: <Text span c="violet.8">{counts.bancos}</Text></Text>
                                            <Text size="xs" fw={600} c="dimmed">REGÍMENES: <Text span c="teal.8">{counts.regimenes}</Text></Text>
                                        </Group>
                                    </Group>
                                    <Badge variant="dot" color="gray" size="xs">V 1.0.4</Badge>
                                </Group>
                            </Paper>

                            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg">
                                <MenuCard icon={<IconBuilding size={32} color="var(--mantine-color-indigo-6)" />} title="Equipo & Empresa" description={empresa?.nombre || 'Perfil y gestión de equipo.'} onClick={() => setActiveTab('empresa')} />
                                <MenuCard icon={<IconBuildingStore size={32} color="var(--mantine-color-blue-6)" />} title="Sucursales" description="Ubicaciones físicas." onClick={() => setActiveTab('sucursales')} />
                                <MenuCard icon={<IconBuildingBank size={32} color="var(--mantine-color-violet-6)" />} title="Bancos" description="Depósitos bancarios." onClick={() => setActiveTab('bancos')} />
                                <MenuCard icon={<IconListDetails size={32} color="var(--mantine-color-cyan-6)" />} title="Regímenes" description="Gestión tributaria." onClick={() => setActiveTab('regimenes')} />
                                <MenuCard icon={<IconSettings size={32} color="var(--mantine-color-orange-6)" />} title="Configuración" description="Alertas y parámetros." onClick={() => setActiveTab('config')} />
                                <MenuCard icon={<IconBell size={32} color="var(--mantine-color-blue-6)" />} title="Notificaciones" description="Centro de avisos." onClick={openNotifications} />
                                <MenuCard icon={<IconHistory size={32} color="var(--mantine-color-gray-6)" />} title="Bitácora" description="Historial de auditoría." onClick={() => setActiveTab('bitacora')} />
                                <MenuCard icon={<IconBuildingBank size={32} color="var(--mantine-color-grape-6)" />} title="Historial Cierres" description="Reposiciones y cajas cerradas." onClick={() => setActiveTab('history')} />
                            </SimpleGrid>
                        </Stack>
                    </motion.div>
                ) : (
                    <motion.div
                        key="tab-content"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        style={{ position: 'relative' }}
                    >
                        <Button
                            variant="subtle"
                            color="gray"
                            size="xs"
                            p={0}
                            mb="xl"
                            leftSection={<IconChevronLeft size={16} />}
                            onClick={() => setActiveTab(null)}
                        >
                            Volver al Panel
                        </Button>

                        <LoadingOverlay visible={fetching} overlayProps={{ blur: 1, radius: 'md' }} />

                        {activeTab === 'sucursales' && (
                            <Stack gap="md">
                                <SettingsHeader title="Sucursales" subtitle="Gestiona ubicaciones." onAdd={handleOpenCreate} addLabel="Añadir" />
                                {renderTable(sucursales, 'sucursal')}
                            </Stack>
                        )}

                        {activeTab === 'bancos' && (
                            <Stack gap="md">
                                <SettingsHeader title="Bancos" subtitle="Entidades financieras." onAdd={handleOpenCreate} addLabel="Añadir" />
                                {renderTable(bancos, 'banco')}
                            </Stack>
                        )}

                        {activeTab === 'regimenes' && (
                            <Stack gap="md">
                                <SettingsHeader title="Regímenes" subtitle="Configura tipos tributarios." onAdd={handleOpenCreate} addLabel="Añadir" />
                                {renderTable(regimenes, 'regimen')}
                            </Stack>
                        )}

                        {activeTab === 'config' && (
                            <Stack gap="xl">
                                <Title order={3} size="h4" fw={700}>Configuración</Title>
                                <Card withBorder radius="md" p="md" bg="blue.0" maw={500} shadow="xs">
                                    <Stack gap="md">
                                        <Text fw={700} size="sm">Alertas de Balance</Text>
                                        <NumberInput label="Porcentaje de alerta" value={alertPercentage} onChange={(val) => setAlertPercentage(Number(val))} min={0} max={100} suffix="%" radius="md" />
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
                                <Group justify="space-between" mb="xs">
                                    <Title order={3} size="h4" fw={700}>Bitácora</Title>
                                    <Badge variant="light" color="gray">{logs.length} eventos</Badge>
                                </Group>
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
                                <CierreHistory />
                            </Stack>
                        )}

                        {activeTab === 'perfil' && user && (
                            <Stack gap="xl">
                                <Title order={3} size="h4" fw={700}>Mi Perfil</Title>
                                <Card withBorder radius="md" p="lg" shadow="xs" maw={500}>
                                    <Stack gap="md">
                                        <Group gap="md">
                                            <Avatar size={60} radius="xl" color="teal" variant="light">
                                                {(perfil?.nombre || user.email).charAt(0).toUpperCase()}
                                            </Avatar>
                                            <Stack gap={0}>
                                                <Text fw={700} size="lg">
                                                    {perfil?.nombre ? `${perfil.nombre} ${perfil.apellido || ''}` : 'Sin nombre'}
                                                </Text>
                                                <Text size="sm" c="dimmed">{user.email}</Text>
                                            </Stack>
                                        </Group>

                                        <SimpleGrid cols={2}>
                                            <TextInput
                                                label="Nombre"
                                                placeholder="Juan"
                                                radius="md"
                                                value={perfilNombre}
                                                onChange={(e) => setPerfilNombre(e.currentTarget.value)}
                                            />
                                            <TextInput
                                                label="Apellido"
                                                placeholder="Pérez"
                                                radius="md"
                                                value={perfilApellido}
                                                onChange={(e) => setPerfilApellido(e.currentTarget.value)}
                                            />
                                        </SimpleGrid>

                                        <Button
                                            loading={savingPerfil}
                                            onClick={async () => {
                                                setSavingPerfil(true);
                                                const { error } = await supabase.from('perfiles').upsert({
                                                    id: user.id,
                                                    nombre: perfilNombre,
                                                    apellido: perfilApellido,
                                                    updated_at: new Date().toISOString(),
                                                });
                                                setSavingPerfil(false);
                                                if (error) {
                                                    notifications.show({ title: 'Error', message: error.message, color: 'red' });
                                                } else {
                                                    notifications.show({ title: 'Perfil actualizado', message: 'Tus datos se han guardado.', color: 'teal' });
                                                    refreshEmpresa(); // Esto refresca el perfil también
                                                }
                                            }}
                                            leftSection={<IconDeviceFloppy size={16} />}
                                        >
                                            Guardar Cambios
                                        </Button>
                                    </Stack>
                                </Card>
                            </Stack>
                        )}

                        {activeTab === 'empresa' && empresa && (
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
                                                            onClick={async () => {
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
                                                                    refreshEmpresa();
                                                                }
                                                            }}
                                                        >Guardar</Button>
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
                                                <Button size="xs" variant="light" leftSection={<IconUserPlus size={14} />} onClick={openInvite} radius="md">
                                                    Invitar
                                                </Button>
                                            )}
                                        </Group>

                                        <Table verticalSpacing="sm" highlightOnHover>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>Usuario</Table.Th>
                                                    <Table.Th>Rol</Table.Th>
                                                    <Table.Th>Desde</Table.Th>
                                                    <Table.Th></Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {miembros.map((m: any) => (
                                                    <Table.Tr key={m.id}>
                                                        <Table.Td>
                                                            <Group gap="sm">
                                                                <Avatar size="sm" color="blue" radius="xl" variant="light">
                                                                    {m.perfiles?.nombre?.charAt(0).toUpperCase() || <IconUser size={14} />}
                                                                </Avatar>
                                                                <Stack gap={0}>
                                                                    <Text size="sm" fw={500}>
                                                                        {m.perfiles?.nombre ? `${m.perfiles.nombre} ${m.perfiles.apellido || ''}` : 'Usuario sin nombre'}
                                                                        {m.user_id === user?.id && <Text span c="blue" size="xs" ml={5}>(Tú)</Text>}
                                                                    </Text>
                                                                    <Text size="xs" c="dimmed">
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
                                                            >
                                                                {m.role === 'owner' ? 'Propietario' : m.role === 'admin' ? 'Admin' : 'Operador'}
                                                            </Badge>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="xs" c="dimmed">{dayjs(m.created_at).format('DD/MM/YYYY')}</Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            {m.user_id === user?.id && (
                                                                <Tooltip label="Editar mi perfil">
                                                                    <ActionIcon
                                                                        variant="subtle"
                                                                        color="blue"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setPerfilNombre(m.perfiles?.nombre || '');
                                                                            setPerfilApellido(m.perfiles?.apellido || '');
                                                                            openEditProfile();
                                                                        }}
                                                                    >
                                                                        <IconEdit size={16} />
                                                                    </ActionIcon>
                                                                </Tooltip>
                                                            )}
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    </Stack>
                                </Card>

                                {/* Pending Invitations */}
                                {invitaciones.length > 0 && (
                                    <Card withBorder radius="md" p="lg" shadow="xs">
                                        <Stack gap="md">
                                            <Text fw={700} size="md">Invitaciones pendientes</Text>
                                            <Table verticalSpacing="sm" highlightOnHover>
                                                <Table.Thead>
                                                    <Table.Tr>
                                                        <Table.Th>Email</Table.Th>
                                                        <Table.Th>Rol</Table.Th>
                                                        <Table.Th>Fecha</Table.Th>
                                                        <Table.Th ta="right">Acciones</Table.Th>
                                                    </Table.Tr>
                                                </Table.Thead>
                                                <Table.Tbody>
                                                    {invitaciones.map((inv: any) => (
                                                        <Table.Tr key={inv.id}>
                                                            <Table.Td>
                                                                <Group gap="xs">
                                                                    <IconMail size={14} color="var(--mantine-color-dimmed)" />
                                                                    <Text size="sm">{inv.email}</Text>
                                                                </Group>
                                                            </Table.Td>
                                                            <Table.Td>
                                                                <Badge color="orange" variant="light" size="sm">
                                                                    {inv.role === 'admin' ? 'Admin' : 'Operador'}
                                                                </Badge>
                                                            </Table.Td>
                                                            <Table.Td>
                                                                <Text size="xs" c="dimmed">{dayjs(inv.created_at).format('DD/MM/YYYY')}</Text>
                                                            </Table.Td>
                                                            <Table.Td>
                                                                <Group justify="flex-end" gap={4}>
                                                                    <CopyButton value={`${window.location.origin}/register?invite=${inv.id}`}>
                                                                        {({ copied, copy }) => (
                                                                            <Tooltip label={copied ? 'Copiado' : 'Copiar link de registro'}>
                                                                                <ActionIcon variant="subtle" color={copied ? 'teal' : 'blue'} onClick={copy} size="sm" radius="md">
                                                                                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                                                                </ActionIcon>
                                                                            </Tooltip>
                                                                        )}
                                                                    </CopyButton>
                                                                    <Tooltip label="Cancelar invitación">
                                                                        <ActionIcon
                                                                            variant="subtle" color="red" size="sm" radius="md"
                                                                            onClick={async () => {
                                                                                const { error } = await supabase.from('invitaciones').delete().eq('id', inv.id);
                                                                                if (!error) {
                                                                                    notifications.show({ title: 'Invitación cancelada', message: inv.email, color: 'orange' });
                                                                                    fetchData();
                                                                                }
                                                                            }}
                                                                        >
                                                                            <IconTrash size={14} />
                                                                        </ActionIcon>
                                                                    </Tooltip>
                                                                </Group>
                                                            </Table.Td>
                                                        </Table.Tr>
                                                    ))}
                                                </Table.Tbody>
                                            </Table>
                                        </Stack>
                                    </Card>
                                )}

                                {/* Empresa ID for support */}
                                <Card withBorder radius="md" p="sm" bg="gray.0">
                                    <Group justify="space-between">
                                        <Group gap="xs">
                                            <Text size="xs" c="dimmed">ID Empresa:</Text>
                                            <Code>{empresa.id}</Code>
                                        </Group>
                                        <CopyButton value={empresa.id}>
                                            {({ copied, copy }) => (
                                                <ActionIcon variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy} size="sm">
                                                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                                </ActionIcon>
                                            )}
                                        </CopyButton>
                                    </Group>
                                </Card>
                            </Stack>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <AppModal opened={opened} onClose={close} title={editingId ? `Editar ${getSingularName(activeTab)}` : `Nuevo ${getSingularName(activeTab)}`} loading={loading}>
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="md">
                        <TextInput label="Nombre" placeholder="Nombre" required radius="md" {...form.getInputProps('nombre')} />
                        {activeTab === 'sucursales' && <TextInput label="Dirección" placeholder="Dirección" radius="md" {...form.getInputProps('direccion')} />}
                        <AppActionButtons onCancel={close} loading={loading} submitLabel={editingId ? 'Actualizar' : 'Crear'} />
                    </Stack>
                </form>
            </AppModal>

            {/* Invite User Modal */}
            <AppModal opened={inviteOpened} onClose={() => { closeInvite(); setInviteEmail(''); setInviteRole('operador'); }} title="Invitar Usuario" loading={inviting}>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!inviteEmail || !empresa) return;
                    setInviting(true);
                    try {
                        const { error } = await supabase.from('invitaciones').insert({
                            empresa_id: empresa.id,
                            email: inviteEmail.toLowerCase().trim(),
                            role: inviteRole,
                            invited_by: user?.id,
                        });
                        if (error) throw error;
                        notifications.show({ title: 'Invitación enviada', message: `Se envió invitación a ${inviteEmail}`, color: 'teal' });
                        closeInvite();
                        setInviteEmail('');
                        setInviteRole('operador');
                        fetchData();
                    } catch (error: any) {
                        notifications.show({ title: 'Error', message: error.message, color: 'red' });
                    } finally {
                        setInviting(false);
                    }
                }}>
                    <Stack gap="md">
                        <TextInput
                            label="Email del usuario"
                            placeholder="usuario@empresa.com"
                            required
                            radius="md"
                            leftSection={<IconMail size={16} />}
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.currentTarget.value)}
                        />
                        <Select
                            label="Rol"
                            data={[
                                { value: 'operador', label: 'Operador — Solo registra transacciones' },
                                { value: 'admin', label: 'Admin — Gestión completa' },
                            ]}
                            value={inviteRole}
                            onChange={(val) => setInviteRole(val || 'operador')}
                            radius="md"
                        />
                        <AppActionButtons onCancel={() => { closeInvite(); setInviteEmail(''); }} loading={inviting} submitLabel="Enviar Invitación" />
                    </Stack>
                </form>
            </AppModal>

            {/* Edit Profile Modal */}
            <AppModal opened={editProfileOpened} onClose={closeEditProfile} title="Editar Mi Perfil" loading={savingPerfil}>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    setSavingPerfil(true);
                    const { error } = await supabase.from('perfiles').upsert({
                        id: user.id,
                        nombre: perfilNombre,
                        apellido: perfilApellido,
                        updated_at: new Date().toISOString(),
                    });
                    setSavingPerfil(false);
                    if (error) {
                        notifications.show({ title: 'Error', message: error.message, color: 'red' });
                    } else {
                        notifications.show({ title: 'Perfil actualizado', message: 'Tus datos se han guardado.', color: 'teal' });
                        refreshEmpresa();
                        closeEditProfile();
                        fetchData(); // Refresh member list
                    }
                }}>
                    <Stack gap="md">
                        <TextInput
                            label="Nombre"
                            placeholder="Juan"
                            radius="md"
                            value={perfilNombre}
                            onChange={(e) => setPerfilNombre(e.currentTarget.value)}
                        />
                        <TextInput
                            label="Apellido"
                            placeholder="Pérez"
                            radius="md"
                            value={perfilApellido}
                            onChange={(e) => setPerfilApellido(e.currentTarget.value)}
                        />
                        <AppActionButtons
                            onCancel={closeEditProfile}
                            loading={savingPerfil}
                            submitLabel="Guardar"
                        />
                    </Stack>
                </form>
            </AppModal>
        </Stack>
    );
}

// Internal Helper Components
function MenuCard({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
    return (
        <UnstyledButton onClick={onClick} className="w-full h-full">
            <Card
                withBorder
                radius="lg"
                p="lg"
                className="transition-all hover:shadow-md hover:border-blue-400 group cursor-pointer h-full relative"
            >
                <Stack gap="md">
                    <div className="transition-transform group-hover:-translate-y-1 will-change-transform">
                        {icon}
                    </div>
                    <div>
                        <Text fw={700} size="lg" className="group-hover:text-blue-600 transition-colors">{title}</Text>
                        <Text size="xs" c="dimmed" lh={1.4}>{description}</Text>
                    </div>
                </Stack>
            </Card>
        </UnstyledButton>
    );
}

function SettingsHeader({ title, onAdd, addLabel }: { title: string; subtitle?: string; onAdd: () => void; addLabel: string }) {
    return (
        <Group justify="space-between" mb="xl">
            <Title order={3} size="h3" fw={800} style={{ letterSpacing: '-0.5px' }}>{title}</Title>
            <Tooltip label={addLabel} withArrow position="left">
                <ActionIcon
                    variant="filled"
                    color="blue"
                    size="xl"
                    onClick={onAdd}
                    radius="md"
                    style={{ boxShadow: 'var(--mantine-shadow-sm)' }}
                >
                    <IconPlus size={22} />
                </ActionIcon>
            </Tooltip>
        </Group>
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
