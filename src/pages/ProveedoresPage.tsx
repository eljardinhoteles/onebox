import { useState, useEffect } from 'react';
import { Paper, Text, Stack, Group, Table, ActionIcon, Badge, ScrollArea, Tooltip, Loader, Title, Pagination, Card, Divider, Menu, PillsInput, Pill } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { supabase } from '../lib/supabaseClient';
import { IconPencil, IconTrash, IconSearch, IconFilter } from '@tabler/icons-react';
import { useDisclosure, useDebouncedValue, useMediaQuery } from '@mantine/hooks';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProveedorFormModal } from '../components/proveedores/ProveedorFormModal';
import type { Proveedor } from '../components/proveedores/ProveedorFormModal';

interface ProveedoresPageProps {
    opened: boolean;
    close: () => void;
}

const PAGE_SIZE = 50;

export function ProveedoresPage({ opened, close }: ProveedoresPageProps) {
    const queryClient = useQueryClient();
    const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
    const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
    const isMobile = useMediaQuery('(max-width: 768px)');

    // Filtros
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebouncedValue(search, 400);
    const [filterSucursal, setFilterSucursal] = useState<string | null>(null);
    const [filterRegimen, setFilterRegimen] = useState<string | null>(null);

    const [page, setPage] = useState(1);

    // Consulta de Proveedores (Paginada)
    const { data: proveedoresData, isLoading: fetching } = useQuery({
        queryKey: ['proveedores', debouncedSearch, filterSucursal, filterRegimen, page],
        queryFn: async () => {
            const from = (page - 1) * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            let query = supabase
                .from('proveedores')
                .select('*', { count: 'exact' })
                .order('nombre', { ascending: true })
                .range(from, to);

            if (debouncedSearch) {
                query = query.or(`nombre.ilike.%${debouncedSearch}%,ruc.ilike.%${debouncedSearch}%`);
            }

            if (filterRegimen) {
                query = query.eq('regimen', filterRegimen);
            }

            if (filterSucursal) {
                // Filtramos por proveedores que tengan la sucursal en su array o que no tengan sucursales (Todas)
                query = query.or(`sucursales.cs.{"${filterSucursal}"},sucursales.is.null`);
            }

            const { data, error, count } = await query;
            if (error) throw error;
            return { data: data || [], count: count || 0 };
        }
    });

    const allProveedores = proveedoresData?.data || [];
    const totalCount = proveedoresData?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    // Observer para scroll infinito
    // Observer para scroll infinito
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, filterSucursal, filterRegimen]);

    // --- DATA QUERIES (Para los Filtros) ---
    const { data: regimenes = [] } = useQuery({
        queryKey: ['regimenes_filter'],
        queryFn: async () => {
            const { data } = await supabase.from('regimenes').select('nombre').order('nombre');
            return (data || []).map(r => r.nombre);
        }
    });

    const { data: sucursalesList = [] } = useQuery({
        queryKey: ['sucursales_list_filter'],
        queryFn: async () => {
            const { data } = await supabase.from('sucursales').select('nombre').order('nombre');
            return (data || []).map(s => s.nombre);
        }
    });

    // --- MUTATIONS ---

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            // 1. Verificar si existen transacciones vinculadas
            const { data: linked, error: checkError } = await supabase
                .from('transacciones')
                .select('id')
                .eq('proveedor_id', id)
                .limit(1)
                .maybeSingle();

            if (checkError) throw checkError;
            if (linked) {
                throw new Error('No se puede eliminar este proveedor porque tiene transacciones asociadas en el sistema.');
            }

            // 2. Eliminar si no hay vínculos
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
        },
        onError: (error: any) => {
            notifications.show({
                title: 'No se pudo eliminar',
                message: error.message || 'Error al procesar la solicitud',
                color: 'red'
            });
        }
    });

    const openEditDrawer = (proveedor: Proveedor) => {
        setEditingProveedor(proveedor);
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
                        proveedor.sucursales.map((s: string) => (
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

    const MobileCard = ({ __proveedor }: { __proveedor: Proveedor }) => (
        <Card shadow="sm" radius="md" withBorder mb="sm" key={__proveedor.id}>
            <Group justify="space-between" mb="xs">
                <Stack gap={0}>
                    <Text fw={700} size="md">{__proveedor.nombre}</Text>
                    <Text c="dimmed" size="xs" ff="monospace">{__proveedor.ruc}</Text>
                </Stack>
                <Group gap={4}>
                    <ActionIcon variant="light" color="blue" onClick={() => openEditDrawer(__proveedor)} radius="md">
                        <IconPencil size={18} stroke={1.5} />
                    </ActionIcon>
                    <ActionIcon variant="light" color="red" onClick={() => handleDelete(__proveedor.id)} radius="md">
                        <IconTrash size={18} stroke={1.5} />
                    </ActionIcon>
                </Group>
            </Group>

            <Divider mb="xs" />

            <Stack gap="xs">
                <Group gap="xs">
                    <Text size="sm" c="dimmed" fw={500} w={80}>Teléfono:</Text>
                    <Text size="sm">{__proveedor.telefono || 'No registrado'}</Text>
                </Group>
                <Group gap="xs">
                    <Text size="sm" c="dimmed" fw={500} w={80}>Régimen:</Text>
                    <Badge variant="dot" color="blue" size="sm">{__proveedor.regimen || 'No especificado'}</Badge>
                </Group>
                <Stack gap={4}>
                    <Text size="sm" c="dimmed" fw={500}>Sucursales:</Text>
                    <Group gap={4}>
                        {__proveedor.sucursales && __proveedor.sucursales.length > 0 ? (
                            __proveedor.sucursales.map((s: string) => (
                                <Badge key={s} size="xs" variant="outline" radius="sm">{s}</Badge>
                            ))
                        ) : (
                            <Text size="xs" c="dimmed">Todas las sucursales</Text>
                        )}
                    </Group>
                </Stack>
            </Stack>
        </Card>
    );

    return (
        <Stack gap="lg">
            <Stack gap="md">
                <Group justify="space-between" align="center" wrap="wrap">
                    <Title order={2} fw={700}>
                        {totalCount} Proveedores
                    </Title>
                    <Group gap="xs" style={{ flex: 1, minWidth: isMobile ? '100%' : '400px' }}>
                        <PillsInput
                            radius="md"
                            style={{ flex: 1 }}
                            leftSection={<IconSearch size={16} />}
                            rightSection={
                                <Menu position="bottom-end" shadow="sm" width={220} withArrow transitionProps={{ transition: 'pop-top-right' }}>
                                    <Menu.Target>
                                        <ActionIcon variant="subtle" color={(filterSucursal || filterRegimen) ? 'blue' : 'gray'} radius="md">
                                            <IconFilter size={18} />
                                        </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Label>Filtrar por Sucursal</Menu.Label>
                                        {sucursalesList.map((s: string) => (
                                            <Menu.Item
                                                key={s}
                                                onClick={() => setFilterSucursal(s)}
                                                bg={filterSucursal === s ? 'blue.0' : undefined}
                                                c={filterSucursal === s ? 'blue.7' : undefined}
                                            >
                                                {s}
                                            </Menu.Item>
                                        ))}
                                        {filterSucursal && (
                                            <Menu.Item color="red" onClick={() => setFilterSucursal(null)}>
                                                Limpiar Sucursal
                                            </Menu.Item>
                                        )}

                                        <Menu.Divider />
                                        <Menu.Label>Filtrar por Régimen</Menu.Label>
                                        {regimenes.map((r: string) => (
                                            <Menu.Item
                                                key={r}
                                                onClick={() => setFilterRegimen(r)}
                                                bg={filterRegimen === r ? 'blue.0' : undefined}
                                                c={filterRegimen === r ? 'blue.7' : undefined}
                                            >
                                                {r}
                                            </Menu.Item>
                                        ))}
                                        {filterRegimen && (
                                            <Menu.Item color="red" onClick={() => setFilterRegimen(null)}>
                                                Limpiar Régimen
                                            </Menu.Item>
                                        )}

                                        {(filterSucursal || filterRegimen) && (
                                            <>
                                                <Menu.Divider />
                                                <Menu.Item color="red" fw={600} onClick={() => { setFilterSucursal(null); setFilterRegimen(null); }}>
                                                    Limpiar Todos los Filtros
                                                </Menu.Item>
                                            </>
                                        )}
                                    </Menu.Dropdown>
                                </Menu>
                            }
                        >
                            <Pill.Group>
                                {filterSucursal && (
                                    <Pill
                                        withRemoveButton
                                        onRemove={() => setFilterSucursal(null)}
                                        size="sm"
                                        color="blue"
                                    >
                                        Suc: {filterSucursal}
                                    </Pill>
                                )}
                                {filterRegimen && (
                                    <Pill
                                        withRemoveButton
                                        onRemove={() => setFilterRegimen(null)}
                                        size="sm"
                                        color="orange"
                                    >
                                        Reg: {filterRegimen}
                                    </Pill>
                                )}
                                <PillsInput.Field
                                    placeholder={(filterSucursal || filterRegimen) ? "" : "Buscar por nombre o RUC..."}
                                    value={search}
                                    onChange={(e) => setSearch(e.currentTarget.value)}
                                />
                            </Pill.Group>
                        </PillsInput>
                    </Group>
                </Group>
            </Stack>

            <Paper
                withBorder
                shadow="sm"
                p="md"
                radius="md"
                bg="white"
                className="h-full flex flex-col"
                style={{ minHeight: isMobile ? 'auto' : '500px', background: isMobile ? 'transparent' : 'white', boxShadow: isMobile ? 'none' : undefined, border: isMobile ? 'none' : undefined, padding: isMobile ? 0 : undefined }}
            >
                <Stack gap="md" className="flex-1">
                    {isMobile ? (
                        <Stack gap="sm">
                            {fetching ? (
                                <Stack align="center" py="xl">
                                    <Loader size="sm" />
                                    <Text c="dimmed" size="sm">Cargando...</Text>
                                </Stack>
                            ) : allProveedores.length > 0 ? (
                                allProveedores.map(p => <MobileCard key={p.id} __proveedor={p} />)
                            ) : (
                                <Text c="dimmed" ta="center" py="xl">
                                    {search ? 'Sin resultados.' : 'Sin proveedores.'}
                                </Text>
                            )}
                        </Stack>
                    ) : (
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
                                    {fetching ? (
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
                                        </>
                                    ) : (
                                        <Table.Tr>
                                            <Table.Td colSpan={5}>
                                                <Stack align="center" py="xl" gap="xs">
                                                    <Text c="dimmed" ta="center">
                                                        {search ? 'No se encontraron resultados para los filtros aplicados.' : 'No hay proveedores registrados aún.'}
                                                    </Text>
                                                </Stack>
                                            </Table.Td>
                                        </Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea>
                    )}
                </Stack>

                {/* Paginación */}
                {totalPages > 1 && (
                    <Group justify="center" mt="md" pb="xl">
                        <Pagination
                            total={totalPages}
                            value={page}
                            onChange={setPage}
                            radius="md"
                            withEdges
                        />
                    </Group>
                )}
            </Paper>

            {/* Modal Unificado para Crear y Editar */}
            <ProveedorFormModal
                opened={opened || drawerOpened}
                onClose={() => {
                    if (opened) close();
                    if (drawerOpened) closeDrawer();
                    setEditingProveedor(null);
                }}
                editingProveedor={editingProveedor}
            />
        </Stack>
    );
}
