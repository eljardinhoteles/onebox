import { useState, useEffect } from 'react';
import { Paper, Stack, Button, Text, Group, Divider, Tabs, Table, ActionIcon, Modal, TextInput, Title, Container, Badge, LoadingOverlay, NumberInput } from '@mantine/core';
import { IconLogout, IconPlus, IconEdit, IconTrash, IconBuildingStore, IconBuildingBank, IconDeviceFloppy, IconX, IconListDetails, IconSettings, IconUser, IconUsers, IconDatabase, IconHistory } from '@tabler/icons-react';
import { supabase } from '../lib/supabaseClient';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useAppConfig } from '../hooks/useAppConfig';
import dayjs from 'dayjs';

export function AjustesPage() {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [activeTab, setActiveTab] = useState<string | null>('sucursales');
    const { configs, updateConfig, loading: configLoading } = useAppConfig();
    const [alertPercentage, setAlertPercentage] = useState<number>(15);
    const [user, setUser] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);

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

    // Data states
    const [sucursales, setSucursales] = useState<any[]>([]);
    const [bancos, setBancos] = useState<any[]>([]);
    const [regimenes, setRegimenes] = useState<any[]>([]);

    // Modal & Form states
    const [opened, { open, close }] = useDisclosure(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const form = useForm({
        initialValues: {
            nombre: '',
            direccion: '', // Solo para sucursales
        }
    });

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
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

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

            notifications.show({
                title: editingId ? 'Registro actualizado' : 'Registro creado',
                message: 'Los cambios se han guardado correctamente.',
                color: 'teal',
                icon: <IconDeviceFloppy size={16} />
            });

            close();
            fetchData();
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: error.message || 'No se pudo guardar el registro',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const table = activeTab as string;
        if (!confirm('¿Estás seguro de eliminar este registro?')) return;

        try {
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;
            notifications.show({ title: 'Eliminado', message: 'Registro eliminado con éxito.', color: 'orange' });
            fetchData();
        } catch (error: any) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        }
    };

    return (
        <Container size="xl" py="xl">
            <Stack gap="lg">
                <Paper p="xl" radius="lg" className="bg-white/80 backdrop-blur-md border border-white/40 shadow-sm">
                    <Group mb="md" justify="space-between">
                        <Group gap="xs" c="dimmed">
                            {user && (
                                <>
                                    <IconUser size={18} />
                                    <Text size="sm" fw={500}>{user.email}</Text>
                                </>
                            )}
                        </Group>
                        <Button
                            color="red"
                            variant="subtle"
                            leftSection={<IconLogout size={16} />}
                            onClick={handleLogout}
                        >
                            Salir
                        </Button>
                    </Group>

                    <Divider mb="xl" />

                    <Title order={2} mb="lg">Ajustes del Sistema</Title>

                    <Tabs value={activeTab} onChange={setActiveTab} variant="outline" radius="md">
                        <Tabs.List mb="md">
                            <Tabs.Tab value="sucursales" leftSection={<IconBuildingStore size={16} />}>Sucursales</Tabs.Tab>
                            <Tabs.Tab value="bancos" leftSection={<IconBuildingBank size={16} />}>Bancos</Tabs.Tab>
                            <Tabs.Tab value="regimenes" leftSection={<IconListDetails size={16} />}>Regímenes</Tabs.Tab>
                            <Tabs.Tab value="config" leftSection={<IconSettings size={16} />}>Configuración</Tabs.Tab>
                            <Tabs.Tab value="bitacora" leftSection={<IconHistory size={16} />}>Bitácora (Audit Log)</Tabs.Tab>
                        </Tabs.List>

                        {activeTab !== 'config' && activeTab !== 'bitacora' && (
                            <Paper withBorder p="md" radius="md" pos="relative">
                                <LoadingOverlay visible={fetching} overlayProps={{ blur: 1 }} />

                                <Group justify="space-between" mb="lg">
                                    <Text size="sm" c="dimmed">
                                        Gestiona los {activeTab} registrados en el sistema.
                                    </Text>
                                    <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreate}>
                                        Añadir {activeTab === 'sucursales' ? 'Sucursal' :
                                            activeTab === 'bancos' ? 'Banco' : 'Régimen'}
                                    </Button>
                                </Group>

                                <Table striped highlightOnHover verticalSpacing="sm">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Nombre</Table.Th>
                                            {activeTab === 'sucursales' && <Table.Th>Dirección</Table.Th>}
                                            <Table.Th ta="right">Acciones</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {activeTab === 'sucursales' && sucursales.map((s) => (
                                            <Table.Tr key={s.id}>
                                                <Table.Td fw={600}>{s.nombre}</Table.Td>
                                                <Table.Td>
                                                    <Text size="xs" c="dimmed">{s.direccion || 'Sin dirección'}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Group gap={4} justify="flex-end">
                                                        <ActionIcon variant="subtle" color="blue" onClick={() => handleOpenEdit(s)}><IconEdit size={16} /></ActionIcon>
                                                        <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(s.id)}><IconTrash size={16} /></ActionIcon>
                                                    </Group>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                        {activeTab === 'bancos' && bancos.map((b) => (
                                            <Table.Tr key={b.id}>
                                                <Table.Td fw={600}>{b.nombre}</Table.Td>
                                                <Table.Td>
                                                    <Group gap={4} justify="flex-end">
                                                        <ActionIcon variant="subtle" color="blue" onClick={() => handleOpenEdit(b)}><IconEdit size={16} /></ActionIcon>
                                                        <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(b.id)}><IconTrash size={16} /></ActionIcon>
                                                    </Group>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                        {activeTab === 'regimenes' && regimenes.map((r) => (
                                            <Table.Tr key={r.id}>
                                                <Table.Td fw={600}>{r.nombre}</Table.Td>
                                                <Table.Td>
                                                    <Group gap={4} justify="flex-end">
                                                        <ActionIcon variant="subtle" color="blue" onClick={() => handleOpenEdit(r)}><IconEdit size={16} /></ActionIcon>
                                                        <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(r.id)}><IconTrash size={16} /></ActionIcon>
                                                    </Group>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                        {!fetching && (
                                            (activeTab === 'sucursales' && sucursales.length === 0) ||
                                            (activeTab === 'bancos' && bancos.length === 0) ||
                                            (activeTab === 'regimenes' && regimenes.length === 0)
                                        ) && (
                                                <Table.Tr>
                                                    <Table.Td colSpan={5} ta="center" py="xl" c="dimmed">No hay registros encontrados.</Table.Td>
                                                </Table.Tr>
                                            )}
                                    </Table.Tbody>
                                </Table>
                            </Paper>
                        )}

                        <Tabs.Panel value="config" pt="md">
                            <Paper withBorder p="xl" radius="md">
                                <Stack gap="lg">
                                    <div>
                                        <Text fw={700} size="lg">Alertas de Caja</Text>
                                        <Text size="sm" c="dimmed">Configura los umbrales de alerta para el gasto en cajas.</Text>
                                    </div>

                                    <Group align="flex-end">
                                        <NumberInput
                                            label="Porcentaje de Alerta (%)"
                                            description="Porcentaje de saldo restante para activar la alerta (ej. 15)"
                                            value={alertPercentage}
                                            onChange={(val) => setAlertPercentage(Number(val))}
                                            min={0}
                                            max={100}
                                            suffix="%"
                                            style={{ width: 250 }}
                                        />
                                        <Button
                                            onClick={async () => {
                                                const { success } = await updateConfig('porcentaje_alerta_caja', alertPercentage.toString());
                                                if (success) {
                                                    notifications.show({
                                                        title: 'Configuración guardada',
                                                        message: 'El porcentaje de alerta se ha actualizado correctamente.',
                                                        color: 'teal'
                                                    });
                                                } else {
                                                    notifications.show({
                                                        title: 'Error',
                                                        message: 'No se pudo guardar la configuración.',
                                                        color: 'red'
                                                    });
                                                }
                                            }}
                                            loading={configLoading}
                                            leftSection={<IconDeviceFloppy size={16} />}
                                        >
                                            Guardar Ajuste
                                        </Button>
                                    </Group>

                                    <Paper withBorder p="md" radius="md" bg="blue.0" className="border-blue-100">
                                        <Group gap="sm" wrap="nowrap">
                                            <IconSettings size={20} className="text-blue-600" />
                                            <Text size="xs" c="blue.9">
                                                Este valor se utilizará para mostrar advertencias visuales cuando el saldo disponible de una caja sea inferior al porcentaje configurado.
                                            </Text>
                                        </Group>
                                    </Paper>
                                </Stack>
                            </Paper>
                        </Tabs.Panel>

                        <Tabs.Panel value="bitacora" pt="md">
                            <Paper withBorder p="md" radius="md">
                                <Stack>
                                    <Group justify="space-between">
                                        <Title order={4}>Registro de Actividad</Title>
                                        <Badge variant="light" color="gray">{logs.length} registros recientes</Badge>
                                    </Group>
                                    <Table striped highlightOnHover>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Fecha</Table.Th>
                                                <Table.Th>Usuario</Table.Th>
                                                <Table.Th>Acción</Table.Th>
                                                <Table.Th>Detalle</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {logs.map((log) => (
                                                <Table.Tr key={log.id}>
                                                    <Table.Td style={{ whiteSpace: 'nowrap' }}>
                                                        {dayjs(log.created_at).format('DD/MM/YYYY HH:mm')}
                                                    </Table.Td>
                                                    <Table.Td>{log.user_email || log.user?.email || 'Sistema'}</Table.Td>
                                                    <Table.Td>
                                                        <Badge
                                                            color={log.accion.includes('ELIMINAR') ? 'red' : 'blue'}
                                                            variant="light"
                                                        >
                                                            {log.accion}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>
                                                            {JSON.stringify(log.detalle, null, 2)}
                                                        </Text>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                            {logs.length === 0 && (
                                                <Table.Tr>
                                                    <Table.Td colSpan={4} style={{ textAlign: 'center', color: 'gray' }}>
                                                        No hay registros recientes
                                                    </Table.Td>
                                                </Table.Tr>
                                            )}
                                        </Table.Tbody>
                                    </Table>
                                </Stack>
                            </Paper>
                        </Tabs.Panel>
                    </Tabs>
                </Paper>

                <Modal closeOnClickOutside={false} opened={opened} onClose={close} title={editingId ? 'Editar Registro' : 'Nuevo Registro'} centered>
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        <Stack>
                            <TextInput label="Nombre" placeholder="Nombre descriptivo" required {...form.getInputProps('nombre')} />

                            {activeTab === 'sucursales' && (
                                <TextInput label="Dirección" placeholder="Dirección de la sucursal" {...form.getInputProps('direccion')} />
                            )}

                            <Group justify="flex-end" mt="md">
                                <Button variant="light" color="gray" onClick={close} leftSection={<IconX size={16} />}>Cancelar</Button>
                                <Button type="submit" loading={loading} leftSection={<IconDeviceFloppy size={16} />}>Guardar Cambios</Button>
                            </Group>
                        </Stack>
                    </form>
                </Modal>
            </Stack>
        </Container>
    );
}
