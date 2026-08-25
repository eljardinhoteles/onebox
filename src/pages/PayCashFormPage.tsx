import { useState, useEffect } from 'react';
import { Stack, Title, Text, Paper, Button, Group, TextInput, NumberInput, Select, ActionIcon, Divider, Box, Badge, Center } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { IconDeviceFloppy, IconPlus, IconTrash, IconArrowLeft, IconUser, IconFileText, IconEdit } from '@tabler/icons-react';
import { supabase } from '../lib/supabaseClient';
import { useEmpresa } from '../context/EmpresaContext';
import { notifications } from '@mantine/notifications';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLoader } from '../components/ui/AppLoader';
import { ProveedorFormModal, type Proveedor } from '../components/proveedores/ProveedorFormModal';

export function PayCashFormPage() {
    const { empresa, loading: empresaLoading } = useEmpresa();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    const queryClient = useQueryClient();

    const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
    const [isProveedorModalOpen, setIsProveedorModalOpen] = useState(false);

    // Cargar proveedores para el select y para mostrar sus detalles
    const { data: proveedoresRaw = [], isLoading: isLoadingProveedores } = useQuery({
        queryKey: ['proveedores_select_paycash', empresa?.id],
        queryFn: async () => {
            if (!empresa) return [];
            const { data } = await supabase
                .from('proveedores')
                .select('id, nombre, ruc, tipo_cuenta, numero_cuenta, codigo_banco, banco')
                .eq('empresa_id', empresa.id)
                .order('nombre');
            
            return data || [];
        },
        enabled: !!empresa
    });

    const proveedoresOptions = proveedoresRaw
        .filter((p: any) => p && p.id != null)
        .map((p: any) => ({
            value: p.id.toString(),
            label: `${p.nombre} (${p.ruc})`
        }));

    const form = useForm({
        initialValues: {
            descripcion: '',
            detalles: [
                { proveedor_id: '', valor_factura: 0, referencia: '', tipo_id: 'C' }
            ]
        },
        validate: {
            descripcion: (value) => (value.length < 3 ? 'La descripción es muy corta' : null),
            detalles: {
                proveedor_id: (value) => (!value ? 'Requerido' : null),
                valor_factura: (value) => (value <= 0 ? 'Debe ser mayor a 0' : null),
                referencia: (value) => {
                    if (value.length < 2) return 'Requerido';
                    if (value.length > 40) return 'Máximo 40 caracteres';
                    return null;
                },
                tipo_id: (value) => (!value ? 'Requerido' : null),
            }
        }
    });

    // Autoguardado en LocalStorage (Solo para modo Nuevo)
    const [draftLoaded, setDraftLoaded] = useState(false);

    useEffect(() => {
        if (!isEditMode && !draftLoaded) {
            const savedDraft = localStorage.getItem('paycash_draft');
            if (savedDraft) {
                try {
                    const parsed = JSON.parse(savedDraft);
                    if (parsed && parsed.detalles) {
                        form.setValues(parsed);
                    }
                } catch (e) {
                    console.error("Error cargando borrador:", e);
                }
            }
            setDraftLoaded(true);
        }
    }, [isEditMode, draftLoaded]);

    useEffect(() => {
        // Solo guardamos si ya se cargó el borrador inicial y estamos en creación
        if (!isEditMode && draftLoaded) {
            localStorage.setItem('paycash_draft', JSON.stringify(form.values));
        }
    }, [form.values, isEditMode, draftLoaded]);

    // Cargar datos existentes si estamos en modo edición
    const { data: ordenData, isLoading: isLoadingOrderData } = useQuery({
        queryKey: ['orden_pago_detalle', id],
        queryFn: async () => {
            if (!id || !isEditMode) return null;
            
            const { data: orden, error: ordenError } = await supabase
                .from('ordenes_pago')
                .select('*')
                .eq('id', id)
                .single();
                
            if (ordenError) throw ordenError;

            const { data: detalles, error: detallesError } = await supabase
                .from('ordenes_pago_detalles')
                .select('*')
                .eq('orden_pago_id', id);

            if (detallesError) throw detallesError;

            if (orden && detalles) {
                form.setValues({
                    descripcion: orden.descripcion,
                    detalles: detalles.length > 0 ? detalles.map((d: any) => ({
                        proveedor_id: d.proveedor_id.toString(),
                        valor_factura: Number(d.valor_factura),
                        referencia: d.referencia || '',
                        tipo_id: d.tipo_id || 'C'
                    })) : [{ proveedor_id: '', valor_factura: 0, referencia: '', tipo_id: 'C' }]
                });
            }

            return orden;
        },
        enabled: isEditMode
    });

    const totalGeneral = form.values.detalles.reduce((acc, curr) => acc + (parseFloat(curr.valor_factura as any) || 0), 0);

    const isCompleted = ordenData?.estado === 'COMPLETADA';

    const handleAddRow = () => {
        form.insertListItem('detalles', { proveedor_id: '', valor_factura: 0, referencia: '', tipo_id: 'C' });
    };

    const handleRemoveRow = (index: number) => {
        if (form.values.detalles.length > 1) {
            form.removeListItem('detalles', index);
        } else {
            notifications.show({
                title: 'Atención',
                message: 'Debe haber al menos un pago en la orden.',
                color: 'orange'
            });
        }
    };

    const saveMutation = useMutation({
        mutationFn: async (values: typeof form.values) => {
            if (!empresa) throw new Error("No hay empresa seleccionada");

            let currentOrderId = id;

            if (isEditMode && currentOrderId) {
                // 1. Actualizar orden principal
                const { error: updateError } = await supabase
                    .from('ordenes_pago')
                    .update({
                        descripcion: values.descripcion,
                        total: totalGeneral
                    })
                    .eq('id', currentOrderId);

                if (updateError) throw updateError;

                // 2. Eliminar detalles anteriores
                const { error: deleteError } = await supabase
                    .from('ordenes_pago_detalles')
                    .delete()
                    .eq('orden_pago_id', currentOrderId);
                
                if (deleteError) throw deleteError;

            } else {
                // 1. Insertar orden de pago principal
                const { data: orden, error: ordenError } = await supabase
                    .from('ordenes_pago')
                    .insert([{
                        empresa_id: empresa.id,
                        descripcion: values.descripcion,
                        total: totalGeneral,
                        estado: 'Pendiente'
                    }])
                    .select()
                    .single();

                if (ordenError) throw ordenError;
                currentOrderId = orden.id;
            }

            // Insertar los nuevos detalles (aplica tanto para creación como para edición)
            const detallesToInsert = values.detalles.map(d => ({
                orden_pago_id: currentOrderId,
                proveedor_id: parseInt(d.proveedor_id, 10),
                valor_factura: d.valor_factura,
                referencia: d.referencia,
                tipo_id: d.tipo_id
            }));

            const { error: detallesError } = await supabase
                .from('ordenes_pago_detalles')
                .insert(detallesToInsert);

            if (detallesError) throw detallesError;

            // Limpiar el borrador si se guardó con éxito y era uno nuevo
            if (!isEditMode) {
                localStorage.removeItem('paycash_draft');
            }

            return currentOrderId;
        },
        onSuccess: () => {
            notifications.show({
                title: 'Éxito',
                message: isEditMode ? 'Orden de pago actualizada' : 'Orden de pago creada correctamente',
                color: 'teal'
            });
            queryClient.invalidateQueries({ queryKey: ['ordenes_pago', empresa?.id] });
            navigate('/paycash');
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error.message || 'No se pudo guardar la orden',
                color: 'red'
            });
        }
    });

    const handleSubmit = (values: typeof form.values) => {
        saveMutation.mutate(values);
    };

    if (empresaLoading || isLoadingOrderData) return <AppLoader fullScreen message="Cargando..." />;

    return (
        <Stack gap="lg" pb={100}>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                {/* Header Superior solo con Título */}
                <Group justify="space-between" align="center" mb="lg">
                    <Group>
                        <ActionIcon variant="subtle" color="gray" size="lg" radius="md" onClick={() => navigate('/paycash')}>
                            <IconArrowLeft size={20} />
                        </ActionIcon>
                        <Title order={2} fw={800} style={{ letterSpacing: '-0.5px' }}>
                            {isEditMode ? 'Editar Lote de Pago' : 'Nuevo Lote'}
                        </Title>
                    </Group>
                </Group>

                <Group justify="space-between" align="center" mb="md" mt="sm">
                    <TextInput
                        placeholder="Descripción del Lote (Ej. Pago a proveedores)"
                        required
                        size="md"
                        variant={isCompleted ? 'unstyled' : 'filled'}
                        w={{ base: '100%', sm: 450 }}
                        readOnly={isCompleted}
                        styles={isCompleted ? { input: { fontWeight: 700, fontSize: '1.1rem' } } : undefined}
                        {...form.getInputProps('descripcion')}
                    />
                    <Group align="center">
                        <Badge size="md" variant="light" color="blue" mr="sm">
                            {form.values.detalles.length} {form.values.detalles.length === 1 ? 'pago' : 'pagos'}
                        </Badge>
                        <Text fw={700} size="xl" c="blue.8" mr="xs">
                            ${totalGeneral.toFixed(2)}
                        </Text>
                        {!isCompleted && (
                            <Button 
                                type="submit" 
                                color="blue" 
                                radius="md"
                                loading={saveMutation.isPending}
                                leftSection={<IconDeviceFloppy size={18} />}
                            >
                                Guardar Lote
                            </Button>
                        )}
                    </Group>
                </Group>

                <Paper radius="md" withBorder>
                    {/* Cabeceras de la "tabla" */}
                    <Group wrap="nowrap" px="md" py="sm" bg="gray.0" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
                        <Text size="sm" fw={600} c="dimmed" style={{ flex: 4 }}>Proveedor y Datos Bancarios</Text>
                        <Text size="sm" fw={600} c="dimmed" style={{ flex: 2 }}>Tipo ID</Text>
                        <Text size="sm" fw={600} c="dimmed" style={{ flex: 3 }}>Referencia</Text>
                        <Text size="sm" fw={600} c="dimmed" style={{ flex: 2 }}>Valor Factura</Text>
                        <Box w={36}></Box>
                    </Group>

                    <Stack gap={0}>
                        {form.values.detalles.map((detalle, index) => {
                            const prov = proveedoresRaw.find((p: any) => p && p.id != null && p.id.toString() === detalle.proveedor_id);
                            
                            return (
                                <Box key={index} px="md" py="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-1)' }}>
                                    <Group wrap="nowrap" align="flex-start">
                                        
                                        {/* Columna Proveedor */}
                                        <Box style={{ flex: 4 }}>
                                            <Select
                                                placeholder="Buscar proveedor..."
                                                data={proveedoresOptions}
                                                searchable
                                                required
                                                disabled={isLoadingProveedores}
                                                readOnly={isCompleted}
                                                variant={isCompleted ? 'unstyled' : 'default'}
                                                {...form.getInputProps(`detalles.${index}.proveedor_id`)}
                                            />
                                            {prov && (
                                                <Group justify="space-between" mt={4} wrap="nowrap">
                                                    <Text size="xs" c={(!prov.ruc || !prov.numero_cuenta || !prov.codigo_banco || !prov.tipo_cuenta) ? 'red' : 'dimmed'}>
                                                        {prov.ruc?.length === 10 ? 'CED' : prov.ruc?.length === 13 ? 'RUC' : 'PAS'}: {prov.ruc || 'S/N'} &bull; {prov.tipo_cuenta === 'AHO' ? 'Ahorros' : prov.tipo_cuenta === 'CTE' ? 'Corriente' : 'Cta'} {prov.numero_cuenta || 'S/N'} &bull; {prov.banco || 'Banco'} {prov.codigo_banco || 'S/C'}
                                                    </Text>
                                                    {!isCompleted && (
                                                        <ActionIcon variant="subtle" color="blue" size="sm" onClick={() => { setEditingProveedor(prov); setIsProveedorModalOpen(true); }}>
                                                            <IconEdit size={14} />
                                                        </ActionIcon>
                                                    )}
                                                </Group>
                                            )}
                                        </Box>

                                        {/* Columna Tipo ID */}
                                        <Select
                                            placeholder="Tipo"
                                            data={[
                                                { value: 'C', label: 'C - Cédula' },
                                                { value: 'R', label: 'R - RUC' },
                                                { value: 'P', label: 'P - Pasaporte' }
                                            ]}
                                            required
                                            readOnly={isCompleted}
                                            variant={isCompleted ? 'unstyled' : 'default'}
                                            style={{ flex: 2 }}
                                            {...form.getInputProps(`detalles.${index}.tipo_id`)}
                                        />
                                        
                                        {/* Columna Referencia */}
                                        <TextInput
                                            placeholder="Ej. FAC-001"
                                            required
                                            maxLength={40}
                                            readOnly={isCompleted}
                                            variant={isCompleted ? 'unstyled' : 'default'}
                                            style={{ flex: 3 }}
                                            {...form.getInputProps(`detalles.${index}.referencia`)}
                                        />
                                        
                                        {/* Columna Valor */}
                                        <NumberInput
                                            placeholder="0.00"
                                            decimalScale={2}
                                            fixedDecimalScale
                                            min={0}
                                            required
                                            readOnly={isCompleted}
                                            variant={isCompleted ? 'unstyled' : 'default'}
                                            leftSection={<Text size="sm" c="dimmed">$</Text>}
                                            styles={{ input: { fontWeight: 600 } }}
                                            style={{ flex: 2 }}
                                            {...form.getInputProps(`detalles.${index}.valor_factura`)}
                                        />
                                        
                                        {/* Columna Eliminar */}
                                        {!isCompleted && (
                                            <ActionIcon 
                                                color="red" 
                                                variant="subtle" 
                                                onClick={() => handleRemoveRow(index)}
                                            >
                                                <IconTrash size={18} />
                                            </ActionIcon>
                                        )}
                                    </Group>
                                </Box>
                            );
                        })}
                    </Stack>
                    
                    {!isCompleted && (
                        <Box p="sm">
                            <Button 
                                variant="transparent" 
                                color="blue" 
                                leftSection={<IconPlus size={16} />} 
                                onClick={handleAddRow}
                                size="sm"
                            >
                                Añadir otra fila
                            </Button>
                        </Box>
                    )}
                </Paper>
            </form>
            
            <ProveedorFormModal 
                opened={isProveedorModalOpen}
                onClose={() => setIsProveedorModalOpen(false)}
                editingProveedor={editingProveedor}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['proveedores_select_paycash', empresa?.id] });
                }}
            />
        </Stack>
    );
}
