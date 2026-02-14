import { useEffect } from 'react';
import { Stack, TextInput, Select, Group, MultiSelect, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../lib/supabaseClient';
import { AppModal } from '../ui/AppModal';
import { AppActionButtons } from '../ui/AppActionButtons';

export interface Proveedor {
    id: number;
    ruc: string;
    nombre: string;
    actividad_economica: string;
    regimen: string;
    telefono?: string;
    sucursales?: string[];
}

interface ProveedorFormModalProps {
    opened: boolean;
    onClose: () => void;
    editingProveedor?: Proveedor | null;
    onSuccess?: () => void;
}

/**
 * Validador de RUC Ecuador (Personas Naturales, Privadas y Públicas)
 * Basado en algoritmos de Módulo 10 y Módulo 11
 */
export const validarRucEcuador = (ruc: string): boolean => {
    // 1. Validaciones básicas
    if (!ruc || ruc.length !== 13 || !/^\d+$/.test(ruc)) return false;

    const provincia = parseInt(ruc.substring(0, 2));
    const tercerDigito = parseInt(ruc[2]);

    if (provincia < 1 || (provincia > 24 && provincia !== 30)) return false;
    if (ruc.substring(10, 13) === "000") return false;

    // 2. Definir coeficientes y módulo según el tercer dígito
    let coeficientes: number[] = [];
    let modulo: number = 11;
    let posicionVerificador: number = 9; // Índice base 0

    if (tercerDigito < 6) {
        // Persona Natural - Módulo 10
        coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
        modulo = 10;
    } else if (tercerDigito === 9) {
        // Persona Jurídica / Privada - Módulo 11
        coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
    } else if (tercerDigito === 6) {
        // Entidad Pública - Módulo 11
        coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
        posicionVerificador = 8;
    } else {
        return false;
    }

    // 3. Algoritmo de validación
    const digitos = ruc.split("").map(Number);
    let suma = 0;

    coeficientes.forEach((coef, i) => {
        let valor = digitos[i] * coef;

        // Ajuste para Módulo 10 (Persona Natural)
        if (modulo === 10 && valor >= 10) {
            valor -= 9;
        }

        suma += valor;
    });

    const residuo = suma % modulo;
    const verificadorCalculado = residuo === 0 ? 0 : modulo - residuo;

    return verificadorCalculado === digitos[posicionVerificador];
};

export function ProveedorFormModal({ opened, onClose, editingProveedor, onSuccess }: ProveedorFormModalProps) {
    const queryClient = useQueryClient();

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
            ruc: (value) => {
                if (value.length < 13) return 'El RUC debe tener 13 dígitos';
                if (!validarRucEcuador(value)) return 'RUC inválido (error en algoritmo de verificación)';
                return null;
            },
            nombre: (value) => (value.length < 2 ? 'El nombre es obligatorio' : null),
            regimen: (value) => (value ? null : 'Debes seleccionar un régimen'),
        },
    });

    // Resetear formulario cuando cambia el proveedor a editar o cuando se abre para crear
    useEffect(() => {
        if (opened) {
            if (editingProveedor) {
                form.setValues({
                    ruc: editingProveedor.ruc,
                    nombre: editingProveedor.nombre,
                    actividad_economica: editingProveedor.actividad_economica || '',
                    regimen: editingProveedor.regimen || '',
                    telefono: editingProveedor.telefono || '',
                    sucursales: editingProveedor.sucursales || [],
                });
            } else {
                form.reset();
            }
        }
    }, [opened, editingProveedor]);

    // --- DATA QUERIES (Para los Selects) ---
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

    // --- MUTATIONS ---
    const mutation = useMutation({
        mutationFn: async (values: any) => {
            const isEditing = !!editingProveedor;

            // 1. Si es creación, verificar duplicidad por RUC
            if (!isEditing) {
                const { data: existing, error: checkError } = await supabase
                    .from('proveedores')
                    .select('id, nombre')
                    .eq('ruc', values.ruc)
                    .maybeSingle();

                if (checkError) throw checkError;
                if (existing) {
                    throw new Error(`El RUC ${values.ruc} ya está registrado a nombre de: ${existing.nombre}`);
                }
            }

            // 2. Ejecutar inserción o actualización
            const { error } = isEditing
                ? await supabase.from('proveedores').update(values).eq('id', editingProveedor.id)
                : await supabase.from('proveedores').insert([values]);

            if (error) throw error;

            // 3. Registro en bitácora
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('bitacora').insert({
                accion: isEditing ? 'EDITAR_PROVEEDOR' : 'CREAR_PROVEEDOR',
                detalle: isEditing ? { id: editingProveedor.id, nombre: values.nombre } : { nombre: values.nombre, ruc: values.ruc },
                user_id: user?.id,
                user_email: user?.email
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
            notifications.show({
                title: 'Éxito',
                message: editingProveedor ? 'Proveedor actualizado' : 'Proveedor creado correctamente',
                color: 'teal',
            });
            onClose();
            onSuccess?.();
            if (!editingProveedor) form.reset();
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error.message || 'No se pudo procesar la solicitud',
                color: 'red',
            });
        }
    });

    return (
        <AppModal
            opened={opened}
            onClose={onClose}
            title={editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            loading={mutation.isPending}
            size="md"
        >
            <form onSubmit={form.onSubmit((v) => mutation.mutate(v))}>
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
                    <Textarea
                        label="Actividad Económica"
                        placeholder="Ej: Venta de materiales..."
                        minRows={2}
                        autosize
                        {...form.getInputProps('actividad_economica')}
                    />
                    <AppActionButtons
                        onCancel={onClose}
                        loading={mutation.isPending}
                        submitLabel={editingProveedor ? 'Actualizar Datos' : 'Guardar Proveedor'}
                        color={editingProveedor ? 'blue' : 'green'}
                    />
                </Stack>
            </form>
        </AppModal>
    );
}
