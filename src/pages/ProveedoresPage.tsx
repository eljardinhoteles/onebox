import { useState, useEffect, useRef } from 'react';
import { Paper, Text, Stack, TextInput, Select, Group, Table, ActionIcon, Badge, ScrollArea, Tooltip, Loader, Center, MultiSelect } from '@mantine/core';
import { AppModal } from '../components/ui/AppModal';
import { AppDrawer } from '../components/ui/AppDrawer';
import { AppActionButtons } from '../components/ui/AppActionButtons';
import { modals } from '@mantine/modals';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { supabase } from '../lib/supabaseClient';
import { IconPlus, IconPencil, IconTrash, IconSearch, IconFilter, IconChevronDown, IconDotsVertical } from '@tabler/icons-react';
import { useDisclosure, useDebouncedValue } from '@mantine/hooks';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
    telefono?: string;
    sucursales?: string[];
}

const PAGE_SIZE = 50;

export function ProveedoresPage({ opened, close }: ProveedoresPageProps) {
    const queryClient = useQueryClient();
    const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
    const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);

    // Filtros
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebouncedValue(search, 400);
    const [regimenFilter, setRegimenFilter] = useState<string | null>(null);

    // El scroll infinito lo mantendremos con un estado local de página por ahora, o podríamos usar useInfiniteQuery. 
    // Para no complicar demasiado la primera refactorización, optimizaremos la carga inicial con useQuery.
    const [page, setPage] = useState(0);
    const [allProveedores, setAllProveedores] = useState<Proveedor[]>([]);

    const loaderRef = useRef<HTMLTableRowElement>(null);

    const form = useForm({
        initialValues: {
            ruc: '',
            nombre: '',
            actividad_economica: '',
            regimen: '',
            telefono: '',
            sucursales: [] as string[],
        },
        validate: {
            ruc: (value) => (value.length < 10 ? 'El RUC debe tener al menos 10 dígitos' : null),
            nombre: (value) => (value.length < 2 ? 'El nombre es obligatorio' : null),
            regimen: (value) => (value ? null : 'Debes seleccionar un régimen'),
        },
    });

    // --- QUERIES ---

    // Consulta de Proveedores (Paginada)
    const { data: proveedoresData, isLoading: fetching } = useQuery({
        queryKey: ['proveedores', debouncedSearch, regimenFilter, page],
        queryFn: async () => {
            const from = page * PAGE_SIZE;
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
            return { data: data || [], count: count || 0 };
        }
    });

    const hasMore = (proveedoresData?.data.length || 0) === PAGE_SIZE;

    useEffect(() => {
        if (page === 0) {
            setAllProveedores(proveedoresData?.data || []);
        } else if (proveedoresData?.data) {
            setAllProveedores(prev => [...prev, ...proveedoresData.data]);
        }
    }, [proveedoresData, page]);

    useEffect(() => {
        setPage(0);
    }, [debouncedSearch, regimenFilter]);

    // Regímenes y Sucursales (Caché a largo plazo)
    const { data: regimenes = [] } = useQuery({
        queryKey: ['regimenes'],
        queryFn: async () => {
            const { data } = await supabase.from('regimenes').select('nombre').order('nombre');
            return (data || []).map(r => ({ value: r.nombre, label: r.nombre }));
        }
    });

    const { data: sucursalesList = [] } = useQuery({
        queryKey: ['sucursales_list'],
        queryFn: async () => {
            const { data } = await supabase.from('sucursales').select('nombre').order('nombre');
            return (data || []).map(s => ({ value: s.nombre, label: s.nombre }));
        }
    });

    // Observer para scroll infinito
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !fetching) {
                    setPage(prev => prev + 1);
                }
            },
            { threshold: 1.0 }
        );

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, fetching]);

    // --- MUTATIONS ---

    const createMutation = useMutation({
        mutationFn: async (values: any) => {
            const { error } = await supabase.from('proveedores').insert([values]);
            if (error) throw error;

            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('bitacora').insert({
                accion: 'CREAR_PROVEEDOR',
                detalle: { nombre: values.nombre, ruc: values.ruc },
                user_id: user?.id,
                user_email: user?.email
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
            notifications.show({
                title: 'Éxito',
                message: 'Proveedor creado correctamente',
                color: 'teal',
            });
            form.reset();
            close();
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error.message || 'No se pudo crear el proveedor',
                color: 'red',
            });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (values: any) => {
            if (!editingProveedor) return;
            const { error } = await supabase
                .from('proveedores')
                .update(values)
                .eq('id', editingProveedor.id);

            if (error) throw error;

            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('bitacora').insert({
                accion: 'EDITAR_PROVEEDOR',
                detalle: { id: editingProveedor.id, nombre: values.nombre },
                user_id: user?.id,
                user_email: user?.email
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
            closeDrawer();
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error.message || 'No se pudo actualizar',
                color: 'red',
            });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase.from('proveedores').delete().eq('id', id);
            if (error) throw error;

            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('bitacora').insert({
                accion: 'ELIMINAR_PROVEEDOR',
                detalle: { id },
                user_id: user?.id,
                user_email: user?.email
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
            notifications.show({ title: 'Eliminado', message: 'Proveedor eliminado', color: 'teal' });
        }
    });

    const openEditDrawer = (proveedor: Proveedor) => {
        setEditingProveedor(proveedor);
        form.setValues({
            ruc: proveedor.ruc,
            nombre: proveedor.nombre,
            actividad_economica: proveedor.actividad_economica || '',
            regimen: proveedor.regimen || '',
            telefono: proveedor.telefono || '',
            sucursales: proveedor.sucursales || [],
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
            onConfirm: () => deleteMutation.mutate(id),
        });
    };

    const rows = allProveedores.map((proveedor) => (
        <Table.Tr key={proveedor.id}>
            <Table.Td>
                <Stack gap={0}>
                    <Text fw={600} size="sm">{proveedor.nombre}</Text>
                    <Text c="dimmed" size="xs" ff="monospace">{proveedor.ruc}</Text>
                </Stack>
            </Table.Td>
            <Table.Td>
                <Text size="sm" fw={500}>{proveedor.telefono || '-'}</Text>
            </Table.Td>
            <Table.Td>
                <Group gap={4}>
                    {proveedor.sucursales && proveedor.sucursales.length > 0 ? (
                        proveedor.sucursales.map(s => (
                            <Badge key={s} size="xs" variant="outline" radius="sm">{s}</Badge>
                        ))
                    ) : (
                        <Text size="xs" c="dimmed">Todas</Text>
                    )}
                </Group>
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
            <Group grow>
                <TextInput
                    label="Teléfono de Contacto"
                    placeholder="Ej: +593..."
                    {...form.getInputProps('telefono')}
                />
                <Select
                    label="Régimen"
                    placeholder="Seleccione el régimen"
                    data={regimenes}
                    required
                    searchable
                    {...form.getInputProps('regimen')}
                />
            </Group>
            <MultiSelect
                label="Sucursales"
                placeholder="Seleccione sucursales (vacío = todas)"
                data={sucursalesList}
                searchable
                clearable
                hidePickedOptions
                {...form.getInputProps('sucursales')}
            />
            <TextInput
                label="Actividad Económica"
                placeholder="Ej: Venta de materiales..."
                {...form.getInputProps('actividad_economica')}
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
                                {allProveedores.length} / {proveedoresData?.count || 0}
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
                                    <Table.Th style={{ width: '30%' }}>Proveedor</Table.Th>
                                    <Table.Th style={{ width: '15%' }}>Contacto</Table.Th>
                                    <Table.Th style={{ width: '25%' }}>Sucursales</Table.Th>
                                    <Table.Th style={{ width: '20%' }}>Régimen</Table.Th>
                                    <Table.Th style={{ width: '10%' }} />
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {fetching && page === 0 ? (
                                    <Table.Tr>
                                        <Table.Td colSpan={5}>
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
                                                <Table.Td colSpan={5}>
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
            <AppModal opened={opened} onClose={close} title="Nuevo Proveedor" loading={createMutation.isPending}>
                <form onSubmit={form.onSubmit((v) => createMutation.mutate(v))}>
                    {formFields}
                    <AppActionButtons
                        onCancel={close}
                        loading={createMutation.isPending}
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
                loading={updateMutation.isPending}
            >
                <form onSubmit={form.onSubmit((v) => updateMutation.mutate(v))}>
                    {formFields}
                    <AppActionButtons
                        onCancel={closeDrawer}
                        loading={updateMutation.isPending}
                        submitLabel="Actualizar Datos"
                        color="blue"
                    />
                </form>
            </AppDrawer>
        </>
    );
}
