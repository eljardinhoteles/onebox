import { useState, useEffect } from 'react';
import { Paper, Text, Stack, TextInput, Select, Button, Group, Table, ActionIcon, Badge, ScrollArea } from '@mantine/core';
import { AppModal } from '../components/ui/AppModal';
import { AppDrawer } from '../components/ui/AppDrawer';
import { AppActionButtons } from '../components/ui/AppActionButtons';
import { modals } from '@mantine/modals';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { supabase } from '../lib/supabaseClient';
import { IconCheck, IconX, IconPencil, IconTrash } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';

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

export function ProveedoresPage({ opened, close }: ProveedoresPageProps) {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [regimenes, setRegimenes] = useState<{ value: string; label: string }[]>([]);
    const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
    const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);

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

    const fetchProveedores = async () => {
        setFetching(true);
        try {
            const { data, error } = await supabase
                .from('proveedores')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProveedores(data || []);
        } catch (error) {
            console.error('Error fetching proveedores:', error);
            notifications.show({
                title: 'Error de carga',
                message: 'No se pudieron cargar los proveedores',
                color: 'red'
            });
        } finally {
            setFetching(false);
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

    useEffect(() => {
        fetchProveedores();
        fetchRegimenes();
    }, []);

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        try {
            const { error } = await supabase.from('proveedores').insert([values]);
            if (error) throw error;

            notifications.show({
                title: 'Proveedor creado',
                message: 'El proveedor se ha registrado correctamente.',
                color: 'teal',
                icon: <IconCheck size={16} />,
            });

            form.reset();
            close();
            fetchProveedores();
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

            notifications.show({
                title: 'Proveedor actualizado',
                message: 'Los datos se han guardado correctamente.',
                color: 'teal',
                icon: <IconCheck size={16} />,
            });

            closeDrawer();
            fetchProveedores();
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

                    notifications.show({
                        title: 'Eliminado',
                        message: 'El proveedor ha sido eliminado.',
                        color: 'teal',
                        icon: <IconCheck size={16} />,
                    });
                    fetchProveedores();
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
                <Text fw={500} size="sm">{proveedor.nombre}</Text>
                <Text c="dimmed" size="xs">{proveedor.ruc}</Text>
            </Table.Td>
            <Table.Td>
                <Text size="sm">{proveedor.actividad_economica || '-'}</Text>
            </Table.Td>
            <Table.Td>
                <Badge variant="light" color="blue">{proveedor.regimen || 'No especificado'}</Badge>
            </Table.Td>
            <Table.Td>
                <Group gap={0} justify="flex-end">
                    <ActionIcon variant="subtle" color="gray" onClick={() => openEditDrawer(proveedor)}>
                        <IconPencil size={16} stroke={1.5} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(proveedor.id)}>
                        <IconTrash size={16} stroke={1.5} />
                    </ActionIcon>
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
            <Paper p="md" radius="lg" className="bg-white/80 backdrop-blur-md border border-white/40 shadow-sm h-full flex flex-col" style={{ minHeight: '400px' }}>

                <ScrollArea className="flex-1 -mx-4 px-4">
                    <Table verticalSpacing="sm" highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Proveedor</Table.Th>
                                <Table.Th>Actividad</Table.Th>
                                <Table.Th>Régimen</Table.Th>
                                <Table.Th />
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {fetching ? (
                                <Table.Tr>
                                    <Table.Td colSpan={4}>
                                        <Text c="dimmed" ta="center" py="xl">Cargando proveedores...</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ) : rows.length > 0 ? rows : (
                                <Table.Tr>
                                    <Table.Td colSpan={4}>
                                        <Text c="dimmed" ta="center" py="xl">No hay proveedores registrados aún.</Text>
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
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
