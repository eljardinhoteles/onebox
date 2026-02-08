import { useState, useEffect, useRef } from 'react';
import { Paper, Text, Stack, TextInput, Select, Group, Table, ActionIcon, Badge, ScrollArea, Tooltip, Loader, Center } from '@mantine/core';
import { AppModal } from '../components/ui/AppModal';
import { AppDrawer } from '../components/ui/AppDrawer';
import { AppActionButtons } from '../components/ui/AppActionButtons';
import { modals } from '@mantine/modals';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { supabase } from '../lib/supabaseClient';
import { IconCheck, IconX, IconPencil, IconTrash, IconSearch } from '@tabler/icons-react';
import { useDisclosure, useDebouncedValue } from '@mantine/hooks';

interface ProveedoresPageProps {
    opened: boolean;
    close: () => void;
}

interface Proveedor {
    id: number;
    ruc: string;
    nombre: string;
    actividad_economica: string;
    regimen: string;
}

const PAGE_SIZE = 50;

export function ProveedoresPage({ opened, close }: ProveedoresPageProps) {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [fetchingMore, setFetchingMore] = useState(false);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [regimenes, setRegimenes] = useState<{ value: string; label: string }[]>([]);
    const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
    const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);

    // Paginación y Filtros
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebouncedValue(search, 400);
    const [regimenFilter, setRegimenFilter] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    const loaderRef = useRef<HTMLTableRowElement>(null);

    const form = useForm({
        initialValues: {
            ruc: '',
            nombre: '',
            actividad_economica: '',
            regimen: '',
        },
        validate: {
            ruc: (value) => (value.length < 10 ? 'El RUC debe tener al menos 10 dígitos' : null),
            nombre: (value) => (value.length < 2 ? 'El nombre es obligatorio' : null),
            regimen: (value) => (value ? null : 'Debes seleccionar un régimen'),
        },
    });

    const fetchProveedores = async (isNewSearch = false) => {
        if (isNewSearch) {
            setFetching(true);
            setPage(0);
        } else {
            setFetchingMore(true);
        }

        try {
            const currentPage = isNewSearch ? 0 : page;
            const from = currentPage * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            let query = supabase
                .from('proveedores')
                .select('*', { count: 'exact' })
                .order('nombre', { ascending: true })
                .range(from, to);

            if (debouncedSearch) {
                query = query.or(`nombre.ilike.%${debouncedSearch}%,ruc.ilike.%${debouncedSearch}%`);
            }

            if (regimenFilter) {
                query = query.eq('regimen', regimenFilter);
            }

            const { data, error, count } = await query;

            if (error) throw error;

            if (isNewSearch) {
                setProveedores(data || []);
            } else {
                setProveedores(prev => [...prev, ...(data || [])]);
            }

            setTotalCount(count || 0);
            setHasMore((data?.length || 0) === PAGE_SIZE);
            if (!isNewSearch) setPage(prev => prev + 1);

        } catch (error) {
            console.error('Error fetching proveedores:', error);
            notifications.show({
                title: 'Error de carga',
                message: 'No se pudieron cargar los proveedores',
                color: 'red'
            });
        } finally {
            setFetching(false);
            setFetchingMore(false);
        }
    };

    const fetchRegimenes = async () => {
        try {
            const { data } = await supabase.from('regimenes').select('nombre').order('nombre');
            if (data) {
                setRegimenes(data.map(r => ({ value: r.nombre, label: r.nombre })));
            }
        } catch (error) {
            console.error('Error fetching regimenes:', error);
        }
    };

    // Observer para scroll infinito
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !fetching && !fetchingMore) {
                    fetchProveedores(false);
                }
            },
            { threshold: 1.0 }
        );

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, fetching, fetchingMore, page]);

    // Efecto para búsqueda inicial y cambios en filtros
    useEffect(() => {
        fetchProveedores(true);
    }, [debouncedSearch, regimenFilter]);

    useEffect(() => {
        fetchRegimenes();
    }, []);

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        try {
            const { error } = await supabase.from('proveedores').insert([values]);
            if (error) throw error;

            // Log de bitácora
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('bitacora').insert({
                accion: 'CREAR_PROVEEDOR',
                detalle: { nombre: values.nombre, ruc: values.ruc, regimen: values.regimen },
                user_id: user?.id,
                user_email: user?.email
            });

            notifications.show({
                title: 'Proveedor creado',
                message: 'El proveedor se ha registrado correctamente.',
                color: 'teal',
                icon: <IconCheck size={16} />,
            });

            form.reset();
            close();
            fetchProveedores(true);
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: error.message || 'No se pudo crear el proveedor',
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEditSubmit = async (values: typeof form.values) => {
        if (!editingProveedor) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('proveedores')
                .update(values)
                .eq('id', editingProveedor.id);

            if (error) throw error;

            // Log de bitácora
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('bitacora').insert({
                accion: 'EDITAR_PROVEEDOR',
                detalle: { id: editingProveedor.id, nombre: values.nombre, ruc: values.ruc },
                user_id: user?.id,
                user_email: user?.email
            });

            closeDrawer();
            fetchProveedores(true);
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: error.message || 'No se pudo actualizar',
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setLoading(false);
        }
    };

    const openEditDrawer = (proveedor: Proveedor) => {
        setEditingProveedor(proveedor);
        form.setValues({
            ruc: proveedor.ruc,
            nombre: proveedor.nombre,
            actividad_economica: proveedor.actividad_economica || '',
            regimen: proveedor.regimen || '',
        });
        openDrawer();
    };

    const handleDelete = (id: number) => {
        modals.openConfirmModal({
            title: 'Confirmar eliminación',
            centered: true,
            children: (
                <Text size="sm">
                    ¿Estás seguro de que deseas eliminar este proveedor? Esta acción no se puede deshacer.
                </Text>
            ),
            labels: { confirm: 'Eliminar proveedor', cancel: 'Cancelar' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('proveedores')
                        .delete()
                        .eq('id', id);

                    if (error) throw error;

                    // Log de bitácora
                    const { data: { user } } = await supabase.auth.getUser();
                    await supabase.from('bitacora').insert({
                        accion: 'ELIMINAR_PROVEEDOR',
                        detalle: { id },
                        user_id: user?.id,
                        user_email: user?.email
                    });

                    notifications.show({
                        title: 'Eliminado',
                        message: 'El proveedor ha sido eliminado.',
                        color: 'teal',
                        icon: <IconCheck size={16} />,
                    });
                    fetchProveedores(true);
                } catch (error: any) {
                    notifications.show({
                        title: 'Error',
                        message: error.message || 'No se pudo eliminar',
                        color: 'red',
                        icon: <IconX size={16} />,
                    });
                }
            },
        });
    };

    const rows = proveedores.map((proveedor) => (
        <Table.Tr key={proveedor.id}>
            <Table.Td>
                <Stack gap={0}>
                    <Text fw={600} size="sm">{proveedor.nombre}</Text>
                    <Text c="dimmed" size="xs" ff="monospace">{proveedor.ruc}</Text>
                </Stack>
            </Table.Td>
            <Table.Td>
                <Text size="sm" lineClamp={1}>{proveedor.actividad_economica || '-'}</Text>
            </Table.Td>
            <Table.Td>
                <Badge variant="dot" color="blue" size="sm">{proveedor.regimen || 'No especificado'}</Badge>
            </Table.Td>
            <Table.Td>
                <Group gap={4} justify="flex-end">
                    <Tooltip label="Editar" radius="md">
                        <ActionIcon variant="subtle" color="blue" onClick={() => openEditDrawer(proveedor)} radius="md">
                            <IconPencil size={18} stroke={1.5} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Eliminar" radius="md">
                        <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(proveedor.id)} radius="md">
                            <IconTrash size={18} stroke={1.5} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    const formFields = (
        <Stack gap="md">
            <TextInput
                label="RUC"
                placeholder="Ingrese el RUC"
                required
                {...form.getInputProps('ruc')}
            />
            <TextInput
                label="Razón Social / Nombre"
                placeholder="Nombre de la empresa o persona"
                required
                {...form.getInputProps('nombre')}
            />
            <TextInput
                label="Actividad Económica"
                placeholder="Ej: Venta de materiales..."
                {...form.getInputProps('actividad_economica')}
            />
            <Select
                label="Régimen"
                placeholder="Seleccione el régimen"
                data={regimenes}
                required
                searchable
                {...form.getInputProps('regimen')}
            />
        </Stack>
    );

    return (
        <>
            <Paper
                withBorder
                shadow="sm"
                p="md"
                radius="md"
                bg="white"
                className="h-full flex flex-col"
                style={{ minHeight: '500px' }}
            >
                <Stack gap="md" className="flex-1">
                    <Group justify="space-between">
                        <Group flex={1}>
                            <TextInput
                                placeholder="Buscar por nombre o RUC..."
                                leftSection={<IconSearch size={16} />}
                                style={{ flex: 1, maxWidth: '400px' }}
                                value={search}
                                onChange={(e) => setSearch(e.currentTarget.value)}
                                radius="md"
                            />
                            <Select
                                placeholder="Filtrar por Régimen"
                                data={regimenes}
                                clearable
                                value={regimenFilter}
                                onChange={setRegimenFilter}
                                radius="md"
                                style={{ width: '220px' }}
                            />
                        </Group>
                        <Stack gap={0} align="flex-end">
                            <Text size="xs" fw={700} c="blue">
                                {proveedores.length} / {totalCount}
                            </Text>
                            <Text size="xs" c="dimmed" fw={500}>
                                proveedores cargados
                            </Text>
                        </Stack>
                    </Group>

                    <ScrollArea className="flex-1">
                        <Table verticalSpacing="sm" highlightOnHover>
                            <Table.Thead bg="white" style={{ zIndex: 5, position: 'sticky', top: 0 }}>
                                <Table.Tr>
                                    <Table.Th style={{ width: '40%' }}>Proveedor</Table.Th>
                                    <Table.Th style={{ width: '30%' }}>Actividad</Table.Th>
                                    <Table.Th style={{ width: '20%' }}>Régimen</Table.Th>
                                    <Table.Th style={{ width: '10%' }} />
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {fetching && page === 0 ? (
                                    <Table.Tr>
                                        <Table.Td colSpan={4}>
                                            <Stack align="center" py="xl" gap="xs">
                                                <Loader size="sm" />
                                                <Text c="dimmed" size="sm">Cargando proveedores...</Text>
                                            </Stack>
                                        </Table.Td>
                                    </Table.Tr>
                                ) : rows.length > 0 ? (
                                    <>
                                        {rows}
                                        {hasMore && (
                                            <Table.Tr ref={loaderRef}>
                                                <Table.Td colSpan={4}>
                                                    <Center py="md">
                                                        <Loader size="xs" />
                                                        <Text size="xs" c="dimmed" ml="sm">Cargando más...</Text>
                                                    </Center>
                                                </Table.Td>
                                            </Table.Tr>
                                        )}
                                    </>
                                ) : (
                                    <Table.Tr>
                                        <Table.Td colSpan={4}>
                                            <Stack align="center" py="xl" gap="xs">
                                                <Text c="dimmed" ta="center">
                                                    {search || regimenFilter ? 'No se encontraron resultados para los filtros aplicados.' : 'No hay proveedores registrados aún.'}
                                                </Text>
                                            </Stack>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                </Stack>
            </Paper>

            {/* Modal para Crear */}
            <AppModal opened={opened} onClose={close} title="Nuevo Proveedor" loading={loading}>
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    {formFields}
                    <AppActionButtons
                        onCancel={close}
                        loading={loading}
                        submitLabel="Guardar Proveedor"
                        color="green"
                    />
                </form>
            </AppModal>

            {/* Drawer para Editar */}
            <AppDrawer
                opened={drawerOpened}
                onClose={closeDrawer}
                title="Editar Proveedor"
                size="md"
                loading={loading}
            >
                <form onSubmit={form.onSubmit(handleEditSubmit)}>
                    {formFields}
                    <AppActionButtons
                        onCancel={closeDrawer}
                        loading={loading}
                        submitLabel="Actualizar Datos"
                        color="blue"
                    />
                </form>
            </AppDrawer>
        </>
    );
}
