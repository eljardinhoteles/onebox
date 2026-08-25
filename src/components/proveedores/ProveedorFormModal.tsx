import { useEffect } from 'react';
import { Stack, TextInput, Select, Group, MultiSelect, Textarea, Checkbox } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../lib/supabaseClient';
import { useEmpresa } from '../../context/EmpresaContext';
import { AppDrawer } from '../ui/AppDrawer';
import { AppActionButtons } from '../ui/AppActionButtons';

export interface Proveedor {
    id: number;
    ruc: string;
    nombre: string;
    actividad_economica: string;
    regimen: string;
    telefono?: string;
    sucursales?: string[];
    banco?: string;
    codigo_banco?: string;
    tipo_cuenta?: string;
    numero_cuenta?: string;
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
        modulo = 11;
    } else if (tercerDigito === 6) {
        // Entidad Pública - Módulo 11
        coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
        posicionVerificador = 8;
        modulo = 11;
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
    const { empresa } = useEmpresa();
    const queryClient = useQueryClient();

    const form = useForm({
        initialValues: {
            ruc: '',
            nombre: '',
            actividad_economica: '',
            regimen: '',
            telefono: '',
            sucursales: [] as string[],
            banco: '',
            codigo_banco: '',
            tipo_cuenta: '',
            numero_cuenta: '',
            bypassRucValidation: false,
        },
        validate: (values) => {
            const errors: Record<string, string | null> = {};

            // Validación de RUC
            if (values.ruc.length < 13) {
                errors.ruc = 'El RUC debe tener 13 dígitos';
            } else if (!values.bypassRucValidation && !validarRucEcuador(values.ruc)) {
                errors.ruc = 'RUC inválido (error en algoritmo). Marque "Ignorar validación" si está seguro.';
            }

            // Validación de Nombre
            if (values.nombre.length < 2) {
                errors.nombre = 'El nombre es obligatorio';
            }

            // Validación de Régimen
            if (!values.regimen) {
                errors.regimen = 'Debes seleccionar un régimen';
            }

            return errors;
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
                    banco: editingProveedor.banco || '',
                    codigo_banco: editingProveedor.codigo_banco || '',
                    tipo_cuenta: editingProveedor.tipo_cuenta || '',
                    numero_cuenta: editingProveedor.numero_cuenta || '',
                    bypassRucValidation: false,
                });
            } else {
                form.reset();
            }
        }
    }, [opened, editingProveedor]);

    // --- DATA QUERIES (Para los Selects) ---
    const { data: regimenes = [] } = useQuery({
        queryKey: ['regimenes', empresa?.id],
        queryFn: async () => {
            if (!empresa) return [];
            const { data } = await supabase.from('regimenes').select('nombre').eq('empresa_id', empresa.id).order('nombre');
            return (data || []).map(r => ({ value: r.nombre, label: r.nombre }));
        },
        enabled: !!empresa
    });

    const { data: sucursalesList = [] } = useQuery({
        queryKey: ['sucursales_list', empresa?.id],
        queryFn: async () => {
            if (!empresa) return [];
            const { data } = await supabase.from('sucursales').select('nombre').eq('empresa_id', empresa.id).order('nombre');
            return (data || []).map(s => ({ value: s.nombre, label: s.nombre }));
        },
        enabled: !!empresa
    });

    // --- MUTATIONS ---
    const mutation = useMutation({
        mutationFn: async (values: typeof form.values) => {
            const isEditing = !!editingProveedor;

            // Preparar datos para enviar (excluyendo bypassRucValidation)
            const proveedorData = {
                ruc: values.ruc,
                nombre: values.nombre,
                actividad_economica: values.actividad_economica,
                regimen: values.regimen,
                telefono: values.telefono,
                sucursales: values.sucursales,
                banco: values.banco || null,
                codigo_banco: values.codigo_banco || null,
                tipo_cuenta: values.tipo_cuenta || null,
                numero_cuenta: values.numero_cuenta || null
            };

            // 1. Si es creación, verificar duplicidad por RUC
            if (!isEditing) {
                const { data: existing, error: checkError } = await supabase
                    .from('proveedores')
                    .select('id, nombre')
                    .eq('ruc', values.ruc)
                    .eq('empresa_id', empresa?.id)
                    .maybeSingle();

                if (checkError) throw checkError;
                if (existing) {
                    throw new Error(`El RUC ${values.ruc} ya está registrado a nombre de: ${existing.nombre}`);
                }
            }

            // 2. Ejecutar inserción o actualización
            const { error } = isEditing
                ? await supabase.from('proveedores').update(proveedorData).eq('id', editingProveedor.id)
                : await supabase.from('proveedores').insert([{ ...proveedorData, empresa_id: empresa?.id }]);

            if (error) throw error;

            // 3. Registro en bitácora
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('bitacora').insert({
                accion: isEditing ? 'EDITAR_PROVEEDOR' : 'CREAR_PROVEEDOR',
                detalle: isEditing ? { id: editingProveedor.id, nombre: values.nombre } : { nombre: values.nombre, ruc: values.ruc },
                user_id: user?.id,
                user_email: user?.email,
                empresa_id: empresa?.id
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
            queryClient.invalidateQueries({ queryKey: ['proveedores_simple'] });
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
        <AppDrawer
            opened={opened}
            onClose={onClose}
            title={editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            loading={mutation.isPending}
            size="md"
        >
            <form onSubmit={form.onSubmit((v) => mutation.mutate(v))}>
                <Stack gap="md">
                    <Stack gap={4}>
                        <TextInput
                            label="RUC"
                            placeholder="Ingrese el RUC"
                            required
                            {...form.getInputProps('ruc')}
                        />
                        <Checkbox
                            label="Ignorar validación de RUC (permitir RUCs no estándar)"
                            size="xs"
                            mt={4}
                            checked={form.values.bypassRucValidation}
                            {...form.getInputProps('bypassRucValidation', { type: 'checkbox' })}
                        />
                    </Stack>

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

                    {/* Datos Bancarios */}
                    <Stack gap="xs" mt="sm">
                        <Group grow>
                            <TextInput
                                label="Banco"
                                placeholder="Ej: Pichincha"
                                {...form.getInputProps('banco')}
                            />
                            <TextInput
                                label="Código Banco"
                                placeholder="Ej: 10"
                                {...form.getInputProps('codigo_banco')}
                            />
                        </Group>
                        <Group grow>
                            <Select
                                label="Tipo de Cuenta"
                                placeholder="Seleccione..."
                                data={[
                                    { value: 'Ahorros', label: 'Ahorros' },
                                    { value: 'Corriente', label: 'Corriente' }
                                ]}
                                {...form.getInputProps('tipo_cuenta')}
                            />
                            <TextInput
                                label="Número de Cuenta"
                                placeholder="Ej: 22000..."
                                {...form.getInputProps('numero_cuenta')}
                            />
                        </Group>
                    </Stack>

                    <AppActionButtons
                        onCancel={onClose}
                        loading={mutation.isPending}
                        submitLabel={editingProveedor ? 'Actualizar Datos' : 'Guardar Proveedor'}
                        color={editingProveedor ? 'blue' : 'green'}
                    />
                </Stack>
            </form>
        </AppDrawer>
    );
}
