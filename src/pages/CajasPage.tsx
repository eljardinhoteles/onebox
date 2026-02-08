import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Paper, Text, Stack, TextInput, Select, Group, NumberInput, SimpleGrid } from '@mantine/core';
import { AppModal } from '../components/ui/AppModal';
import { AppActionButtons } from '../components/ui/AppActionButtons';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { supabase } from '../lib/supabaseClient';
import { IconCheck, IconX } from '@tabler/icons-react';

import { useAppConfig } from '../hooks/useAppConfig';
import { CajaCard } from '../components/caja/CajaCard';

interface CajasPageProps {
    opened: boolean;
    close: () => void;
    onSelectCaja: (id: number) => void;
}

interface Caja {
    id: number;
    created_at: string;
    saldo_anterior: number;
    reposicion: number;
    monto_inicial: number;
    fecha_apertura: string;
    fecha_cierre: string | null;
    responsable: string;
    sucursal: string;
    estado: 'abierta' | 'cerrada';
    saldo_actual: number;
}

export function CajasPage({ opened, close, onSelectCaja }: CajasPageProps) {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [cajas, setCajas] = useState<Caja[]>([]);
    const [sucursales, setSucursales] = useState<{ value: string; label: string }[]>([]);
    const { configs } = useAppConfig();
    const alertThreshold = parseInt(configs.porcentaje_alerta_caja || '15');

    const form = useForm({
        initialValues: {
            saldo_anterior: 0,
            reposicion: 0,
            fecha_apertura: new Date(),
            responsable: '',
            sucursal: '',
        },
        validate: {
            responsable: (value: string) => (value.length < 2 ? 'El responsable es obligatorio' : null),
            sucursal: (value: string) => (value ? null : 'Debes seleccionar un sucursal'),
        },
    });

    const fetchCajas = async () => {
        setFetching(true);
        try {
            // Intentar cargar desde la vista balanceada
            const { data, error } = await supabase
                .from('v_cajas_con_saldo')
                .select('*')
                .order('id', { ascending: false });

            if (error) {
                // Si la vista no existe (error PostgREST 42P01), o hay otro error, reintentar con la tabla base
                console.warn('Fallo al cargar v_cajas_con_saldo, intentando tabla base:', error);

                const { data: baseData, error: baseError } = await supabase
                    .from('cajas')
                    .select('*')
                    .order('id', { ascending: false });

                if (baseError) throw baseError;

                // Mapear los datos de la tabla base para que coincidan con la interfaz Caja
                // (saldo_actual será igual a monto_inicial hasta que se cree la vista)
                const mappedData = (baseData || []).map(c => ({
                    ...c,
                    saldo_actual: c.monto_inicial // Valor por defecto
                }));
                setCajas(mappedData as Caja[]);
            } else {
                setCajas(data || []);
            }
        } catch (error: any) {
            console.error('Error fetching cajas:', error);
            notifications.show({
                title: 'Error de conexión',
                message: 'No se pudieron cargar las cajas. Verifica la conexión.',
                color: 'red'
            });
        } finally {
            setFetching(false);
        }
    };

    const fetchSucursales = async () => {
        try {
            const { data } = await supabase.from('sucursales').select('nombre').order('nombre');
            if (data) {
                setSucursales(data.map(s => ({ value: s.nombre, label: s.nombre })));
            }
        } catch (error) {
            console.error('Error fetching sucursales:', error);
        }
    };

    useEffect(() => {
        fetchCajas();
        fetchSucursales();
    }, []);

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        try {
            const monto_inicial = (values.saldo_anterior || 0) + (values.reposicion || 0);
            const { data: { user } } = await supabase.auth.getUser();

            const { data: newCaja, error } = await supabase.from('cajas').insert([{
                ...values,
                monto_inicial,
                fecha_apertura: dayjs(values.fecha_apertura).toISOString(),
            }]).select().single();

            if (error) throw error;

            // Log de apertura
            await supabase.from('bitacora').insert({
                accion: 'APERTURA_CAJA',
                detalle: {
                    caja_id: newCaja.id,
                    sucursal: newCaja.sucursal,
                    responsable: newCaja.responsable,
                    monto_inicial
                },
                user_id: user?.id,
                user_email: user?.email
            });

            notifications.show({
                title: 'Caja creada',
                message: 'La caja se ha abierto correctamente.',
                color: 'teal',
                icon: <IconCheck size={16} />,
            });

            form.reset();
            close();
            fetchCajas();
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: error.message || 'No se pudo abrir la caja',
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setLoading(false);
        }
    };

    /*
        const handleCerrarCaja = (id: number) => {
            modals.openConfirmModal({
                title: 'Cerrar Caja',
                centered: true,
                children: (
                    <Text size="sm">
                        ¿Estás seguro de que deseas cerrar esta caja? Una vez cerrada, no se podrán realizar más cambios.
                    </Text>
                ),
                labels: { confirm: 'Cerrar ahora', cancel: 'Cancelar' },
                confirmProps: { color: 'orange' },
                onConfirm: async () => {
                    try {
                        const { data: { user } } = await supabase.auth.getUser();
    
                        const { error } = await supabase
                            .from('cajas')
                            .update({
                                estado: 'cerrada',
                                fecha_cierre: new Date().toISOString()
                            })
                            .eq('id', id);
    
                        if (error) throw error;
    
                        // Log de cierre
                        await supabase.from('bitacora').insert({
                            accion: 'CIERRE_CAJA',
                            detalle: { caja_id: id },
                            user_id: user?.id,
                            user_email: user?.email
                        });
    
                        notifications.show({
                            title: 'Caja cerrada',
                            message: 'La caja ha sido finalizada con éxito.',
                            color: 'orange',
                            icon: <IconLock size={16} />,
                        });
                        fetchCajas();
                    } catch (error: any) {
                        notifications.show({
                            title: 'Error',
                            message: error.message || 'No se pudo cerrar la caja',
                            color: 'red'
                        });
                    }
                },
            });
        };
        */


    return (
        <>
            {fetching ? (
                <Text ta="center" py="xl" c="dimmed">Cargando cajas...</Text>
            ) : cajas.length === 0 ? (
                <Paper p="xl" withBorder radius="md" ta="center">
                    <Text c="dimmed">No hay cajas registradas</Text>
                </Paper>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                    {cajas.map((caja: Caja) => (
                        <CajaCard
                            key={caja.id}
                            caja={caja}
                            alertThreshold={alertThreshold}
                            onSelectCaja={onSelectCaja}
                            onDelete={fetchCajas}
                        />
                    ))}
                </SimpleGrid>
            )}

            <AppModal opened={opened} onClose={close} title="Nueva Apertura de Caja" loading={loading}>
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="md">
                        <Group grow>
                            <NumberInput
                                label="Saldo Anterior"
                                placeholder="0.00"
                                leftSection="$"
                                decimalScale={2}
                                required
                                hideControls
                                {...form.getInputProps('saldo_anterior')}
                            />
                            <NumberInput
                                label="Reposición"
                                placeholder="0.00"
                                leftSection="$"
                                decimalScale={2}
                                hideControls
                                {...form.getInputProps('reposicion')}
                            />
                        </Group>

                        <Paper withBorder p="xs" radius="md" className="bg-blue-50/50 border-blue-100">
                            <Group justify="space-between">
                                <Text size="sm" fw={600} c="blue.8">Monto Inicial:</Text>
                                <Text size="lg" fw={700} c="blue.9">
                                    ${((form.values.saldo_anterior || 0) + (form.values.reposicion || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </Text>
                            </Group>
                        </Paper>

                        <DatePickerInput
                            label="Fecha de Apertura"
                            placeholder="Seleccione fecha"
                            locale="es"
                            required
                            maxDate={new Date()}
                            allowDeselect={false}
                            {...form.getInputProps('fecha_apertura')}
                        />

                        <TextInput
                            label="Responsable"
                            placeholder="Nombre del encargado"
                            required
                            {...form.getInputProps('responsable')}
                        />

                        <Select
                            label="Sucursal"
                            placeholder="Seleccione sucursal"
                            data={sucursales.length > 0 ? sucursales : [
                                { value: 'norte', label: 'Sucursal Norte (Default)' },
                                { value: 'sur', label: 'Sucursal Sur' },
                                { value: 'centro', label: 'Sucursal Centro' },
                            ]}
                            required
                            {...form.getInputProps('sucursal')}
                        />

                        <AppActionButtons
                            onCancel={close}
                            loading={loading}
                            submitLabel="Abrir Caja"
                        />
                    </Stack>
                </form>
            </AppModal>
        </>
    );
}
