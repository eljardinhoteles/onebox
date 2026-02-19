import { useState, useEffect } from 'react';
import { Container, Title, Text, Stack, Paper, Group, Avatar, Button, LoadingOverlay, Box, Badge, ScrollArea, Table, Switch, ActionIcon, Select } from '@mantine/core';
import { IconCheck, IconPlus, IconCalendar, IconArrowLeft } from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import { AjustesDashboard } from './ajustes/components/AjustesDashboard';
import { useNotifications } from '../context/NotificationContext';
import { supabase } from '../lib/supabaseClient';
import { useEmpresa } from '../context/EmpresaContext';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useAppConfig } from '../hooks/useAppConfig';
import { AppDrawer } from '../components/ui/AppDrawer';

// Extracted Components
import { AjustesHeader } from '../components/ajustes/AjustesHeader';
import { ConfigSection } from '../components/ajustes/ConfigSection';
import { CrudSection } from '../components/ajustes/CrudSection';
import { InviteModal } from './ajustes/components/InviteModal';
import { CierreHistory } from '../components/CierreHistory';
import dayjs from 'dayjs';

const ACTION_LABELS: Record<string, { label: string, color: string }> = {
    'CREAR_TRANSACCION': { label: 'Nueva Transacción', color: 'teal' },
    'ELIMINAR_TRANSACCION': { label: 'Gasto Eliminado', color: 'red' },
    'ABRIR_CAJA': { label: 'Apertura de Caja', color: 'blue' },
    'CERRAR_CAJA': { label: 'Cierre de Caja', color: 'indigo' },
    'REGISTRAR_DEPOSITO': { label: 'Depósito Bancario', color: 'cyan' },
    'INVITAR_USUARIO': { label: 'Invitación Enviada', color: 'orange' },
    'ACTUALIZAR_EMPRESA': { label: 'Ajustes Empresa', color: 'gray' },
    'ACTUALIZAR_PERFIL': { label: 'Cambio de Perfil', color: 'gray' },
    'TOGGLE_MEMBER_STATUS': { label: 'Estado de Miembro', color: 'yellow' },
    'DELETE_ITEM': { label: 'Elemento Eliminado', color: 'red' },
    'SAVE_ITEM': { label: 'Elemento Guardado', color: 'teal' },
};

export function AjustesPage() {
    const { empresa, role, refresh: refreshEmpresa } = useEmpresa();
    const { configs, updateConfig } = useAppConfig();
    const { openNotifications } = useNotifications();

    const [state, setState] = useState({
        user: null as any,
        activeTab: null as string | null,
        perfilForm: { nombre: '', apellido: '' },
        data: {
            items: [] as any[],
            logs: [] as any[],
            miembros: [] as any[],
            fetching: false,
            editingId: null as string | null
        },
        localConfigs: {
            alertPercentage: 15,
            reservePercentage: 15,
            autoFormatFactura: false
        },
        empresaForm: { nombre: '', ruc: '' },
        auditRange: [null, null] as [Date | null, Date | null]
    });

    const { user, activeTab, perfilForm, data: dataState, localConfigs, empresaForm, auditRange } = state;
    const { items, logs, miembros, fetching, editingId } = dataState;

    const setActiveTab = (tab: string | null) => setState(prev => ({ ...prev, activeTab: tab }));

    const [crudOpened, { open: openCrud, close: closeCrud }] = useDisclosure(false);
    const [inviteOpened, { open: openInvite, close: closeInvite }] = useDisclosure(false);

    const form = useForm({
        initialValues: { nombre: '', ruc: '', direccion: '', regimen: '', codigo: '', numero_cuenta: '', tipo_cuenta: '', secuencia_inicial: 0 }
    });

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setState(prev => ({ ...prev, user })));
    }, []);

    useEffect(() => {
        if (user) {
            supabase.from('perfiles').select('*').eq('id', user.id).single().then(({ data }) => {
                if (data) setState(prev => ({ ...prev, perfilForm: { nombre: data.nombre || '', apellido: data.apellido || '' } }));
            });
        }
    }, [user]);

    useEffect(() => {
        if (empresa) {
            setState(prev => ({ ...prev, empresaForm: { nombre: empresa.nombre || '', ruc: empresa.ruc || '' } }));
        }
    }, [empresa]);

    useEffect(() => {
        setState(prev => ({
            ...prev,
            localConfigs: {
                alertPercentage: parseInt(configs.porcentaje_alerta_caja || '15'),
                reservePercentage: parseInt(configs.porcentaje_reserva_caja || '15'),
                autoFormatFactura: configs.formato_factura_automatico === 'true'
            }
        }));
    }, [configs.porcentaje_alerta_caja, configs.porcentaje_reserva_caja, configs.formato_factura_automatico]);

    useEffect(() => {
        if (!activeTab || !empresa) return;

        setState(prev => ({ ...prev, data: { ...prev.data, fetching: true } }));

        const fetchData = async () => {
            try {
                if (activeTab === 'empresa') {
                    const { data } = await supabase.from('empresa_usuarios').select('*, perfiles:user_id(*)').eq('empresa_id', empresa.id);
                    if (data) {
                        const membersWithProfiles = data.map((m: any) => ({
                            ...m,
                            perfiles: Array.isArray(m.perfiles) ? m.perfiles[0] : m.perfiles
                        }));
                        setState(prev => ({ ...prev, data: { ...prev.data, miembros: membersWithProfiles, fetching: false } }));
                    } else {
                        setState(prev => ({ ...prev, data: { ...prev.data, miembros: [], fetching: false } }));
                    }
                } else if (activeTab === 'auditoria') {
                    let query = supabase.from('bitacora').select('*').eq('empresa_id', empresa.id).order('created_at', { ascending: false });

                    if (auditRange[0]) {
                        query = query.gte('created_at', dayjs(auditRange[0]).startOf('day').toISOString());
                    }
                    if (auditRange[1]) {
                        query = query.lte('created_at', dayjs(auditRange[1]).endOf('day').toISOString());
                    }

                    const { data } = await query.limit(200);
                    setState(prev => ({ ...prev, data: { ...prev.data, logs: data || [], fetching: false } }));
                } else if (['sucursales', 'bancos', 'regimenes'].includes(activeTab || '')) {
                    const tableMap: Record<string, string> = { sucursales: 'sucursales', bancos: 'bancos', regimenes: 'regimenes' };
                    const table = tableMap[activeTab];
                    const { data } = await supabase.from(table).select('*').eq('empresa_id', empresa.id).order('nombre');
                    if (activeTab === 'sucursales' && data) {
                        const { data: cajas } = await supabase.from('cajas').select('sucursal, estado').eq('empresa_id', empresa.id);
                        const sucursalesWithInfo = data.map(s => ({
                            ...s,
                            has_active_caja: cajas?.some(c => c.sucursal === s.nombre && c.estado === 'abierta')
                        }));
                        setState(prev => ({ ...prev, data: { ...prev.data, items: sucursalesWithInfo, fetching: false } }));
                    } else {
                        setState(prev => ({ ...prev, data: { ...prev.data, items: data || [], fetching: false } }));
                    }
                } else {
                    setState(prev => ({ ...prev, data: { ...prev.data, fetching: false } }));
                }
            } catch (error) {
                setState(prev => ({ ...prev, data: { ...prev.data, fetching: false } }));
            }
        };

        fetchData();
    }, [activeTab, empresa, auditRange]);

    const handleSaveEmpresa = async () => {
        if (!empresa?.id || role !== 'owner') return;
        setState(prev => ({ ...prev, data: { ...prev.data, fetching: true } }));
        const { error } = await supabase.from('empresas').update(empresaForm).eq('id', empresa.id);
        if (!error) {
            notifications.show({ title: 'Empresa actualizada', message: 'Los datos han sido guardados', color: 'teal' });
            await refreshEmpresa();
        } else {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        }
        setState(prev => ({ ...prev, data: { ...prev.data, fetching: false } }));
    };

    const handleToggleMemberStatus = async (memberId: string, currentStatus: boolean) => {
        if (!empresa?.id || (role !== 'owner' && role !== 'admin')) return;

        setState(prev => ({ ...prev, data: { ...prev.data, fetching: true } }));
        const { error } = await supabase
            .from('empresa_usuarios')
            .update({ activo: !currentStatus })
            .eq('id', memberId);

        if (!error) {
            notifications.show({
                title: 'Estado actualizado',
                message: `Usuario ${!currentStatus ? 'activado' : 'desactivado'} correctamente`,
                color: 'teal'
            });
            // Refrescar datos (pestaña miembros)
            const { data } = await supabase.from('empresa_usuarios').select('*, perfiles:user_id(*)').eq('empresa_id', empresa.id);
            if (data) {
                const membersWithProfiles = data.map((m: any) => ({
                    ...m,
                    perfiles: Array.isArray(m.perfiles) ? m.perfiles[0] : m.perfiles
                }));
                setState(prev => ({ ...prev, data: { ...prev.data, miembros: membersWithProfiles, fetching: false } }));
            } else {
                setState(prev => ({ ...prev, data: { ...prev.data, fetching: false } }));
            }
        } else {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
            setState(prev => ({ ...prev, data: { ...prev.data, fetching: false } }));
        }
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setState(prev => ({ ...prev, data: { ...prev.data, fetching: true } }));
        const { error } = await supabase.from('perfiles').upsert({ id: user.id, ...perfilForm });
        if (!error) notifications.show({ title: 'Perfil actualizado', message: 'Tus datos han sido guardados', color: 'teal' });
        setState(prev => ({ ...prev, data: { ...prev.data, fetching: false } }));
    };

    const handleConfigSave = async (key: string, value: string) => {
        const ok = await updateConfig(key, value);
        if (ok) notifications.show({ title: 'Configuración guardada', message: 'Los cambios se aplicaron correctamente', color: 'teal' });
    };

    const handleCrudSave = async (values: any) => {
        if (!empresa?.id || !activeTab) return;
        setState(prev => ({ ...prev, data: { ...prev.data, fetching: true } }));
        const tableMap: Record<string, string> = { sucursales: 'sucursales', bancos: 'bancos', regimenes: 'regimenes' };
        const table = tableMap[activeTab!];

        // Filtrar valores según la tabla para evitar errores de columnas inexistentes
        const filteredValues: any = { nombre: values.nombre };
        if (activeTab === 'sucursales') {
            filteredValues.direccion = values.direccion;
            filteredValues.secuencia_inicial = values.secuencia_inicial;
        } else if (activeTab === 'bancos') {
            filteredValues.numero_cuenta = values.numero_cuenta;
            filteredValues.tipo_cuenta = values.tipo_cuenta;
        } else if (activeTab === 'regimenes') {
            // regimenes solo usa nombre por ahora
        }

        const { error } = editingId
            ? await supabase.from(table).update(filteredValues).eq('id', editingId)
            : await supabase.from(table).insert([{ ...filteredValues, empresa_id: empresa?.id }]);
        if (!error) {
            notifications.show({ title: 'Guardado', message: 'Elemento guardado correctamente', color: 'teal' });
            closeCrud();
            // Refrescar datos
            setState(prev => ({ ...prev, data: { ...prev.data, fetching: true } }));
            const { data } = await supabase.from(table).select('*').eq('empresa_id', empresa?.id).order('nombre');
            setState(prev => ({ ...prev, data: { ...prev.data, items: data || [], fetching: false } }));
        } else {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
            setState(prev => ({ ...prev, data: { ...prev.data, fetching: false } }));
        }
    };

    const handleDelete = async (id: string) => {
        if (!activeTab) return;
        const tableMap: Record<string, string> = { sucursales: 'sucursales', bancos: 'bancos', regimenes: 'regimenes' };
        const table = tableMap[activeTab!];
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (!error) {
            notifications.show({ title: 'Eliminado', message: 'Elemento eliminado', color: 'teal' });
            // Refrescar datos
            setState(prev => ({ ...prev, data: { ...prev.data, fetching: true } }));
            const { data } = await supabase.from(table).select('*').eq('empresa_id', empresa?.id).order('nombre');
            setState(prev => ({ ...prev, data: { ...prev.data, items: data || [], fetching: false } }));
        } else {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        }
    };

    return (
        <Container size="lg" py="xl">
            <Stack gap="xl">
                {!activeTab && <AjustesHeader user={user} empresa={empresa} />}

                {!activeTab ? (
                    <AjustesDashboard
                        empresaNombre={empresa?.nombre}
                        onNavigate={(tab) => {
                            const map: Record<string, string> = {
                                'config': 'configs',
                                'bitacora': 'auditoria'
                            };
                            setActiveTab(map[tab] || tab);
                        }}
                        onOpenNotifications={openNotifications}
                    />
                ) : (
                    <Stack gap="xl">
                        <Group gap="sm">
                            <ActionIcon variant="light" onClick={() => setActiveTab(null)} size="lg" radius="md">
                                <IconArrowLeft size={20} />
                            </ActionIcon>
                            <Title order={2} size="h3">
                                {activeTab === 'empresa' ? 'Equipo & Empresa' :
                                    activeTab === 'sucursales' ? 'Sucursales' :
                                        activeTab === 'bancos' ? 'Bancos' :
                                            activeTab === 'regimenes' ? 'Regímenes' :
                                                activeTab === 'configs' ? 'Configuración' :
                                                    activeTab === 'history' ? 'Historial de Cierres' :
                                                        activeTab === 'auditoria' ? 'Bitácora de Auditoría' :
                                                            activeTab === 'perfil' ? 'Mi Perfil' : 'Ajustes'}
                            </Title>
                        </Group>

                        <Box style={{ position: 'relative' }}>
                            <LoadingOverlay visible={fetching} overlayProps={{ blur: 1 }} />

                            {activeTab === 'empresa' && (
                                <Stack gap="xl">
                                    <Paper withBorder p="xl" radius="lg">
                                        <Stack gap="md">
                                            <Title order={3}>Datos de la Empresa</Title>
                                            <Text size="sm" c="dimmed">
                                                {role === 'owner'
                                                    ? 'Como propietario, puedes actualizar la información legal de tu organización.'
                                                    : 'Información general de tu organización.'}
                                            </Text>

                                            <Stack gap="sm">
                                                <ConfigSection.Input
                                                    label="Razón Social"
                                                    value={empresaForm.nombre}
                                                    onChange={(v: string) => setState(p => ({ ...p, empresaForm: { ...p.empresaForm, nombre: v } }))}
                                                    readOnly={role !== 'owner'}
                                                />
                                                <ConfigSection.Input
                                                    label="RUC"
                                                    value={empresaForm.ruc}
                                                    onChange={(v: string) => setState(p => ({ ...p, empresaForm: { ...p.empresaForm, ruc: v } }))}
                                                    readOnly={role !== 'owner'}
                                                />
                                            </Stack>

                                            {role === 'owner' && (
                                                <Button
                                                    onClick={handleSaveEmpresa}
                                                    leftSection={<IconCheck size={16} />}
                                                    radius="md"
                                                    mt="md"
                                                    w="fit-content"
                                                >
                                                    Guardar Cambios
                                                </Button>
                                            )}
                                        </Stack>
                                    </Paper>

                                    <Paper withBorder p="xl" radius="lg">
                                        <Stack gap="lg">
                                            <Group justify="space-between">
                                                <Title order={3}>Miembros del Equipo</Title>
                                                {(role === 'owner' || role === 'admin') && (
                                                    <Button
                                                        variant="light"
                                                        leftSection={<IconPlus size={16} />}
                                                        onClick={openInvite}
                                                        radius="md"
                                                    >
                                                        Invitar Miembro
                                                    </Button>
                                                )}
                                            </Group>
                                            {miembros.map((m) => (
                                                <Paper key={m.id} withBorder p="md" radius="md">
                                                    <Group justify="space-between">
                                                        <Group>
                                                            <Avatar color="blue">{m.perfiles?.nombre?.[0]}</Avatar>
                                                            <div>
                                                                <Text fw={600}>{m.perfiles?.nombre} {m.perfiles?.apellido}</Text>
                                                                <Text size="xs" c="dimmed">{m.perfiles?.email}</Text>
                                                            </div>
                                                        </Group>
                                                        <Stack align="flex-end" gap={4}>
                                                            <Group gap="xs">
                                                                <Badge color={m.activo !== false ? 'blue' : 'gray'}>
                                                                    {m.activo !== false ? m.role : 'Desactivado'}
                                                                </Badge>
                                                                {(role === 'owner' || role === 'admin') && m.user_id !== user?.id && (
                                                                    <Switch
                                                                        checked={m.activo !== false}
                                                                        onChange={() => handleToggleMemberStatus(m.id, m.activo !== false)}
                                                                        size="sm"
                                                                        color="teal"
                                                                    />
                                                                )}
                                                            </Group>
                                                        </Stack>
                                                    </Group>
                                                </Paper>
                                            ))}
                                        </Stack>
                                    </Paper>
                                </Stack>
                            )}

                            {activeTab === 'perfil' && (
                                <Paper withBorder p="xl" radius="lg">
                                    <Stack gap="md">
                                        <Group mb="lg">
                                            <Avatar size="xl" radius="xl" color="blue">{perfilForm.nombre[0] || ''}{perfilForm.apellido[0] || ''}</Avatar>
                                            <div>
                                                <Title order={3}>{perfilForm.nombre} {perfilForm.apellido}</Title>
                                                <Text c="dimmed">{user?.email}</Text>
                                            </div>
                                        </Group>
                                        <Group grow>
                                            <ConfigSection.Input label="Nombre" value={perfilForm.nombre} onChange={(v: string) => setState(prev => ({ ...prev, perfilForm: { ...prev.perfilForm, nombre: v } }))} />
                                            <ConfigSection.Input label="Apellido" value={perfilForm.apellido} onChange={(v: string) => setState(prev => ({ ...prev, perfilForm: { ...prev.perfilForm, apellido: v } }))} />
                                        </Group>
                                        <Button onClick={handleSaveProfile} leftSection={<IconCheck size={16} />} radius="md" mt="md" w="fit-content">Guardar Perfil</Button>
                                    </Stack>
                                </Paper>
                            )}

                            {activeTab === 'configs' && (
                                <ConfigSection
                                    localConfigs={localConfigs}
                                    handleConfigSave={handleConfigSave}
                                    setAlertPercentage={(v: number) => setState(p => ({ ...p, localConfigs: { ...p.localConfigs, alertPercentage: v } }))}
                                    setReservePercentage={(v: number) => setState(p => ({ ...p, localConfigs: { ...p.localConfigs, reservePercentage: v } }))}
                                    setAutoFormatFactura={(v: boolean) => setState(p => ({ ...p, localConfigs: { ...p.localConfigs, autoFormatFactura: v } }))}
                                />
                            )}

                            {activeTab === 'sucursales' && (
                                <CrudSection
                                    title="Gestión de Sucursales"
                                    type="sucursales"
                                    items={items}
                                    onEdit={(i: any) => { setState(p => ({ ...p, data: { ...p.data, editingId: i.id } })); form.setValues(i); openCrud(); }}
                                    onDelete={handleDelete}
                                    onAdd={() => { setState(p => ({ ...p, data: { ...p.data, editingId: null } })); form.reset(); openCrud(); }}
                                />
                            )}

                            {activeTab === 'bancos' && (
                                <Stack gap="md">
                                    <Paper withBorder p="md" radius="md" bg="blue.0" mb="xs">
                                        <Text size="xs" fw={500} c="blue.8">
                                            ℹ️ Estas cuentas se utilizarán para registrar los depósitos bancarios de los cierres de caja y para emitir los cheques de reposición.
                                        </Text>
                                    </Paper>
                                    <CrudSection
                                        title="Mis Cuentas Bancarias"
                                        type="bancos"
                                        items={items}
                                        onEdit={(i: any) => { setState(p => ({ ...p, data: { ...p.data, editingId: i.id } })); form.setValues(i); openCrud(); }}
                                        onDelete={handleDelete}
                                        onAdd={() => { setState(p => ({ ...p, data: { ...p.data, editingId: null } })); form.reset(); openCrud(); }}
                                    />
                                </Stack>
                            )}

                            {activeTab === 'regimenes' && (
                                <CrudSection
                                    title="Tipos de Regímenes"
                                    type="regimenes"
                                    items={items}
                                    onEdit={(i: any) => { setState(p => ({ ...p, data: { ...p.data, editingId: i.id } })); form.setValues(i); openCrud(); }}
                                    onDelete={handleDelete}
                                    onAdd={() => { setState(p => ({ ...p, data: { ...p.data, editingId: null } })); form.reset(); openCrud(); }}
                                />
                            )}

                            {activeTab === 'auditoria' && (
                                <Paper withBorder p="xl" radius="lg">
                                    <Stack gap="md">
                                        <Group justify="space-between" align="flex-end">
                                            <div>
                                                <Title order={3}>Registro de Auditoría</Title>
                                                <Text size="sm" c="dimmed">Seguimiento de las acciones realizadas en el sistema.</Text>
                                            </div>
                                            <Group align="flex-end">
                                                <DatePickerInput
                                                    type="range"
                                                    label="Filtrar por fecha"
                                                    placeholder="Desde — Hasta"
                                                    value={auditRange}
                                                    onChange={(val: any) => setState(p => ({ ...p, auditRange: val }))}
                                                    leftSection={<IconCalendar size={18} stroke={1.5} />}
                                                    clearable
                                                    radius="md"
                                                    size="sm"
                                                    w={250}
                                                />
                                            </Group>
                                        </Group>

                                        <ScrollArea h={500} offsetScrollbars>
                                            <Table striped highlightOnHover verticalSpacing="sm" withTableBorder withColumnBorders={false}>
                                                <Table.Thead bg="gray.0">
                                                    <Table.Tr>
                                                        <Table.Th style={{ width: '150px' }}>Fecha</Table.Th>
                                                        <Table.Th style={{ width: '180px' }}>Acción</Table.Th>
                                                        <Table.Th style={{ width: '200px' }}>Usuario</Table.Th>
                                                        <Table.Th>Detalle</Table.Th>
                                                    </Table.Tr>
                                                </Table.Thead>
                                                <Table.Tbody>
                                                    {logs.length === 0 ? (
                                                        <Table.Tr>
                                                            <Table.Td colSpan={4} align="center" py="xl">
                                                                <Text c="dimmed">No hay registros para este criterio.</Text>
                                                            </Table.Td>
                                                        </Table.Tr>
                                                    ) : (
                                                        logs.map((log) => {
                                                            const actionInfo = ACTION_LABELS[log.accion] || { label: log.accion, color: 'gray' };
                                                            return (
                                                                <Table.Tr key={log.id}>
                                                                    <Table.Td>
                                                                        <Text size="xs" fw={500}>{dayjs(log.created_at).format('DD/MM/YY HH:mm')}</Text>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Badge size="xs" color={actionInfo.color} variant="light" radius="sm">
                                                                            {actionInfo.label}
                                                                        </Badge>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Text size="xs" fw={500}>{log.user_email || 'Sistema'}</Text>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Text size="xs" c="dimmed" style={{ whiteSpace: 'pre-wrap', maxWidth: '300px' }}>
                                                                            {typeof log.detalle === 'string' ? log.detalle : JSON.stringify(log.detalle)}
                                                                        </Text>
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                            );
                                                        })
                                                    )}
                                                </Table.Tbody>
                                            </Table>
                                        </ScrollArea>
                                    </Stack>
                                </Paper>
                            )}

                            {activeTab === 'history' && (
                                <CierreHistory empresaId={empresa?.id} />
                            )}
                        </Box>
                    </Stack>
                )}
            </Stack>

            <AppDrawer opened={crudOpened} onClose={closeCrud} title={editingId ? "Editar Item" : "Añadir Item"} size="md">
                <form onSubmit={form.onSubmit(handleCrudSave)}>
                    <Stack gap="md">
                        {activeTab === 'regimenes' ? (
                            <ConfigSection.Input label="Nombre del Régimen" {...form.getInputProps('nombre')} />
                        ) : activeTab === 'bancos' ? (
                            <>
                                <ConfigSection.Input label="Institución Bancaria" {...form.getInputProps('nombre')} />
                                <ConfigSection.Input label="Número de Cuenta" {...form.getInputProps('numero_cuenta')} />
                                <Select
                                    label="Tipo de Cuenta"
                                    placeholder="Seleccione tipo"
                                    data={[
                                        { value: 'Cuenta de Ahorros', label: 'Cuenta de Ahorros' },
                                        { value: 'Cuenta Corriente', label: 'Cuenta Corriente' }
                                    ]}
                                    radius="md"
                                    {...form.getInputProps('tipo_cuenta')}
                                />
                            </>
                        ) : (
                            <>
                                <ConfigSection.Input label="Nombre de Sucursal" {...form.getInputProps('nombre')} />
                                <ConfigSection.Input label="Dirección" {...form.getInputProps('direccion')} />
                                <ConfigSection.Input
                                    label="Secuencia Inicial (Próxima Caja)"
                                    description="Número desde el cual empezarán a contarse las cajas de esta sucursal."
                                    type="number"
                                    {...form.getInputProps('secuencia_inicial')}
                                />
                            </>
                        )}
                        <Button type="submit" mt="md">{editingId ? 'Actualizar' : 'Crear'}</Button>
                    </Stack>
                </form>
            </AppDrawer>

            {empresa && user && (
                <InviteModal
                    opened={inviteOpened}
                    onClose={closeInvite}
                    empresaId={empresa.id}
                    userId={user.id}
                    onSuccess={() => {
                        // Refrescar lista de miembros
                        setActiveTab(null);
                        setTimeout(() => setActiveTab('empresa'), 10);
                    }}
                />
            )}
        </Container>
    );
}
