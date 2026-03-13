import { useState } from 'react';
import { Paper, Text, Stack, Group, Table, ActionIcon, Badge, ScrollArea, Tooltip, Title, Pagination, Divider, Menu, PillsInput, Pill } from '@mantine/core';
import { AppLoader } from '../components/ui/AppLoader';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { supabase } from '../lib/supabaseClient';
import { useEmpresa } from '../context/EmpresaContext';
import { IconPencil, IconTrash, IconSearch, IconFilter } from '@tabler/icons-react';
import { useDisclosure, useDebouncedValue, useMediaQuery } from '@mantine/hooks';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { ProveedorFormModal } from '../components/proveedores/ProveedorFormModal';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { ProveedorSkeleton } from '../components/proveedores/ProveedorSkeleton';
import type { Proveedor } from '../components/proveedores/ProveedorFormModal';

interface ProveedoresPageProps {
    opened: boolean;
    close: () => void;
}

const PAGE_SIZE = 50;

// --- SUB-COMPONENTS ---

interface MobileCardProps {
    proveedor: Proveedor;
    onEdit: (p: Proveedor) => void;
    onDelete: (id: number) => void;
    isReadOnly?: boolean;
}

const MobileCard = ({ proveedor, onEdit, onDelete, isReadOnly }: MobileCardProps) => (
    <Paper shadow="xs" radius="lg" withBorder p="md" mb="sm" key={proveedor.id} bg="white">
        <Stack gap="xs">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap={2} style={{ flex: 1 }}>
                    <Text fw={700} size="sm" style={{ lineHeight: 1.2 }}>{proveedor.nombre}</Text>
                    <Text c="dimmed" size="xs" ff="monospace" style={{ letterSpacing: '0.5px' }}>{proveedor.ruc}</Text>
                </Stack>
                {!isReadOnly && (
                    <Group gap={8} wrap="nowrap">
                        <ActionIcon variant="light" color="blue" onClick={() => onEdit(proveedor)} radius="md" size="lg">
                            <IconPencil size={20} stroke={1.5} />
                        </ActionIcon>
                        <ActionIcon variant="light" color="red" onClick={() => onDelete(proveedor.id)} radius="md" size="lg">
                            <IconTrash size={20} stroke={1.5} />
                        </ActionIcon>
                    </Group>
                )}
            </Group>

            <Divider variant="dashed" />

            <Group grow gap="xs">
                <Stack gap={2}>
                    <Text size="xs" c="dimmed" fw={500}>Teléfono</Text>
                    <Text size="sm" fw={500}>{proveedor.telefono || '-'}</Text>
                </Stack>
                <Stack gap={2}>
                    <Text size="xs" c="dimmed" fw={500}>Régimen</Text>
                    <Badge variant="dot" color="blue" size="sm" styles={{ label: { textTransform: 'none' } }}>
                        {proveedor.regimen || 'No especificado'}
                    </Badge>
                </Stack>
            </Group>

            {proveedor.sucursales && proveedor.sucursales.length > 0 && (
                <Stack gap={4}>
                    <Text size="xs" c="dimmed" fw={500}>Sucursales habilitadas</Text>
                    <Group gap={4}>
                        {proveedor.sucursales.map((s: string) => (
                            <Badge key={s} size="xs" variant="outline" radius="sm" color="gray">
                                {s}
                            </Badge>
                        ))}
                    </Group>
                </Stack>
            )}
        </Stack>
    </Paper>
);

interface ProveedoresHeaderProps {
    totalCount: number;
    queryState: any;
    setQueryState: React.Dispatch<React.SetStateAction<any>>;
    sucursalesList: string[];
    regimenes: string[];
    isMobile: boolean;
}

function ProveedoresHeader({ totalCount, queryState, setQueryState, sucursalesList, regimenes, isMobile }: ProveedoresHeaderProps) {
    const { search, filterSucursal, filterRegimen } = queryState;
    const updateQuery = (updates: any) => setQueryState((prev: any) => ({ ...prev, ...updates, page: 1 }));

    return (
        <Stack gap={isMobile ? "sm" : "md"}>
            <Group justify="space-between" align="center">
                <Stack gap={0}>
                    <Title order={2} size={isMobile ? "h3" : "h2"} fw={800} style={{ letterSpacing: '-0.5px' }}>
                        {totalCount} Proveedores
                    </Title>
                    <Text size="xs" c="dimmed">Gestiona tus contactos y proveedores autorizados.</Text>
                </Stack>
            </Group>

            <Group gap="sm" wrap={isMobile ? "wrap" : "nowrap"}>
                <PillsInput
                    radius="md"
                    style={{ flex: 1, minWidth: isMobile ? '100%' : '300px' }}
                    leftSection={<IconSearch size={18} stroke={1.5} />}
                    rightSection={
                        <Menu position="bottom-end" shadow="md" width={240} withArrow offset={10}>
                            <Menu.Target>
                                <ActionIcon 
                                    variant={ (filterSucursal || filterRegimen) ? "light" : "subtle" } 
                                    color={(filterSucursal || filterRegimen) ? 'blue' : 'gray'} 
                                    radius="md" 
                                    size="lg"
                                >
                                    <IconFilter size={20} />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Label>Filtrar por Sucursal</Menu.Label>
                                {sucursalesList.map((s: string) => (
                                    <Menu.Item
                                        key={s}
                                        onClick={() => updateQuery({ filterSucursal: s })}
                                        leftSection={filterSucursal === s ? <Badge size="xs" variant="dot" /> : null}
                                        bg={filterSucursal === s ? 'blue.0' : undefined}
                                        c={filterSucursal === s ? 'blue.7' : undefined}
                                    >
                                        {s}
                                    </Menu.Item>
                                ))}
                                {filterSucursal && (
                                    <Menu.Item color="red" onClick={() => updateQuery({ filterSucursal: null })}>
                                        Limpiar Sucursal
                                    </Menu.Item>
                                )}

                                <Menu.Divider />
                                <Menu.Label>Filtrar por Régimen</Menu.Label>
                                {regimenes.map((r: string) => (
                                    <Menu.Item
                                        key={r}
                                        onClick={() => updateQuery({ filterRegimen: r })}
                                        leftSection={filterRegimen === r ? <Badge size="xs" variant="dot" color="orange" /> : null}
                                        bg={filterRegimen === r ? 'orange.0' : undefined}
                                        c={filterRegimen === r ? 'orange.7' : undefined}
                                    >
                                        {r}
                                    </Menu.Item>
                                ))}
                                {filterRegimen && (
                                    <Menu.Item color="red" onClick={() => updateQuery({ filterRegimen: null })}>
                                        Limpiar Régimen
                                    </Menu.Item>
                                )}

                                {(filterSucursal || filterRegimen) && (
                                    <>
                                        <Menu.Divider />
                                        <Menu.Item color="red" fw={700} onClick={() => updateQuery({ filterSucursal: null, filterRegimen: null })}>
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
                                onRemove={() => updateQuery({ filterSucursal: null })}
                                size="sm"
                                variant="contrast"
                            >
                                Suc: {filterSucursal}
                            </Pill>
                        )}
                        {filterRegimen && (
                            <Pill
                                withRemoveButton
                                onRemove={() => updateQuery({ filterRegimen: null })}
                                size="sm"
                                variant="contrast"
                                color="orange"
                            >
                                Reg: {filterRegimen}
                            </Pill>
                        )}
                        <PillsInput.Field
                            placeholder={isMobile ? "Buscar..." : "Buscar por nombre o RUC..."}
                            value={search}
                            onChange={(e) => updateQuery({ search: e.currentTarget.value })}
                        />
                    </Pill.Group>
                </PillsInput>
            </Group>
        </Stack>
    );
}

interface ProveedoresTableProps {
    allProveedores: Proveedor[];
    fetching: boolean;
    search: string;
    onEdit: (p: Proveedor) => void;
    onDelete: (id: number) => void;
    isMobile: boolean;
    isReadOnly?: boolean;
}

function ProveedoresTable({ allProveedores, fetching, search, onEdit, onDelete, isMobile, isReadOnly }: ProveedoresTableProps) {
    const showSkeleton = fetching; 

    if (isMobile) {
        return (
            <Stack gap="sm" style={{ position: 'relative' }}>
                {showSkeleton && allProveedores.length > 0 && <AppLoader variant="bar" />}
                {showSkeleton && allProveedores.length === 0 ? (
                    <Stack gap="sm">
                        {Array(5).fill(0).map((_, i) => <ProveedorSkeleton key={i} />)}
                    </Stack>
                ) : allProveedores.length > 0 ? (
                    allProveedores.map(p => <MobileCard key={p.id} proveedor={p} onEdit={onEdit} onDelete={onDelete} isReadOnly={isReadOnly} />)
                ) : (
                    <Text c="dimmed" ta="center" py="xl">
                        {search ? 'Sin resultados.' : 'Sin proveedores.'}
                    </Text>
                )}
            </Stack>
        );
    }

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
                    {!isReadOnly && (
                        <>
                            <Tooltip label="Editar" radius="md">
                                <ActionIcon variant="subtle" color="blue" onClick={() => onEdit(proveedor)} radius="md">
                                    <IconPencil size={18} stroke={1.5} />
                                </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Eliminar" radius="md">
                                <ActionIcon variant="subtle" color="red" onClick={() => onDelete(proveedor.id)} radius="md">
                                    <IconTrash size={18} stroke={1.5} />
                                </ActionIcon>
                            </Tooltip>
                        </>
                    )}
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <ScrollArea className="flex-1" style={{ position: 'relative' }}>
            {showSkeleton && allProveedores.length > 0 && <AppLoader variant="bar" />}
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
                    {showSkeleton && allProveedores.length === 0 ? (
                        <Table.Tr>
                            <Table.Td colSpan={5} p={0}>
                                <TableSkeleton rows={10} cols={5} />
                            </Table.Td>
                        </Table.Tr>
                    ) : rows.length > 0 ? (
                        rows
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
    );
}

export function ProveedoresPage({ opened, close }: ProveedoresPageProps) {
    const { empresa, loading: empresaLoading, isReadOnly } = useEmpresa();
    const queryClient = useQueryClient();
    const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
    const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
    const isMobile = useMediaQuery('(max-width: 768px)');

    // Filtros agrupados
    const [queryState, setQueryState] = useState({
        search: '',
        filterSucursal: null as string | null,
        filterRegimen: null as string | null,
        page: 1
    });

    const { search, filterSucursal, filterRegimen, page } = queryState;
    const [debouncedSearch] = useDebouncedValue(search, 400);

    // Consulta de Proveedores (Paginada)
    const { data: proveedoresData, isLoading: fetching } = useQuery({
        queryKey: ['proveedores', debouncedSearch, filterSucursal, filterRegimen, page, empresa?.id],
        placeholderData: keepPreviousData,
        queryFn: async () => {
            if (!empresa) return { data: [], count: 0 };
            const from = (page - 1) * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            let query = supabase
                .from('proveedores')
                .select('*', { count: 'exact' })
                .eq('empresa_id', empresa.id)
                .order('nombre', { ascending: true })
                .range(from, to);

            if (debouncedSearch) {
                query = query.or(`nombre.ilike.%${debouncedSearch}%,ruc.ilike.%${debouncedSearch}%`);
            }

            if (filterRegimen) {
                query = query.eq('regimen', filterRegimen);
            }

            if (filterSucursal) {
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

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
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

            const { error } = await supabase.from('proveedores').delete().eq('id', id);
            if (error) throw error;

            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('bitacora').insert({
                accion: 'ELIMINAR_PROVEEDOR',
                detalle: { id },
                user_id: user?.id,
                user_email: user?.email,
                empresa_id: empresa?.id
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

    return (
        <Stack gap="lg">
            <ProveedoresHeader
                totalCount={totalCount}
                queryState={queryState}
                setQueryState={setQueryState}
                sucursalesList={sucursalesList}
                regimenes={regimenes}
                isMobile={!!isMobile}
            />

            <Paper
                withBorder
                shadow="sm"
                p="md"
                radius="md"
                bg="white"
                className="h-full flex flex-col"
                style={{
                    minHeight: isMobile ? 'auto' : '500px',
                    background: isMobile ? 'transparent' : 'white',
                    boxShadow: isMobile ? 'none' : undefined,
                    border: isMobile ? 'none' : undefined,
                    padding: isMobile ? 0 : undefined
                }}
            >
                <Stack gap="md" className="flex-1">
                    <ProveedoresTable
                        allProveedores={allProveedores}
                        fetching={fetching || empresaLoading}
                        search={search}
                        onEdit={openEditDrawer}
                        onDelete={handleDelete}
                        isMobile={!!isMobile}
                        isReadOnly={isReadOnly}
                    />
                </Stack>

                {totalPages > 1 && (
                    <Group justify="center" mt="md" pb="xl">
                        <Pagination
                            total={totalPages}
                            value={page}
                            onChange={(p) => setQueryState(prev => ({ ...prev, page: p }))}
                            radius="xl"
                            withEdges
                            size={isMobile ? "sm" : "md"}
                        />
                    </Group>
                )}
            </Paper>

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
