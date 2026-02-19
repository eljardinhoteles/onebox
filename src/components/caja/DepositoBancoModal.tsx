import { useEffect } from 'react';
import { Stack, NumberInput, Select, Button, Text, Group } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../lib/supabaseClient';
import { AppModal } from '../ui/AppModal';
import { IconBuildingBank, IconCalendar, IconCurrencyDollar } from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

interface DepositoBancoModalProps {
    opened: boolean;
    onClose: () => void;
    cajaId: number;
    maxMonto: number; // El saldo actual en efectivo para no depositar más de lo que hay
    onSuccess?: () => void;
}

export function DepositoBancoModal({ opened, onClose, cajaId, maxMonto, onSuccess }: DepositoBancoModalProps) {
    const queryClient = useQueryClient();

    const form = useForm({
        initialValues: {
            fecha: new Date(),
            monto: undefined as number | undefined,
            banco_id: '' as string,
        },
        validate: {
            fecha: (value) => (!value ? 'La fecha es obligatoria' : null),
            monto: (value) => {
                if (!value || value <= 0) return 'El monto debe ser mayor a 0';
                if (value > maxMonto) return `El monto no puede exceder el efectivo disponible ($${maxMonto.toFixed(2)})`;
                return null;
            },
            banco_id: (value) => (!value ? 'Debe seleccionar un banco de destino' : null),
        },
    });

    useEffect(() => {
        if (opened) {
            form.reset();
            form.setFieldValue('fecha', new Date());
        }
    }, [opened]);

    // Consultar lista de bancos
    const { data: bancosList = [] } = useQuery({
        queryKey: ['bancos_list_deposito'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bancos')
                .select('id, nombre')
                .order('nombre');

            if (error) throw error;

            return (data || []).map(b => ({
                value: String(b.id),
                label: b.nombre
            }));
        },
        enabled: opened // Solo cargar cuando se abre el modal
    });

    const mutation = useMutation({
        mutationFn: async (values: typeof form.values) => {
            if (!values.monto) throw new Error("Monto inválido");

            // 1. Insertar transacción de tipo 'deposito'
            // Nota: Un depósito es una SALIDA de dinero de la caja
            const { error } = await supabase.from('transacciones').insert({
                caja_id: cajaId,
                fecha_factura: dayjs(values.fecha).format('YYYY-MM-DD'),
                total_factura: values.monto, // Se registra positivo, pero al ser 'deposito' restará en la vista
                tipo_documento: 'deposito', // Nuevo tipo
                banco_id: values.banco_id,
                numero_factura: 'DEPOSITO', // Placeholder
                proveedor_id: null, // No aplica
                es_justificacion: false
            });

            if (error) throw error;

            // 2. Registro en bitácora
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('bitacora').insert({
                accion: 'REGISTRAR_DEPOSITO',
                detalle: {
                    caja_id: cajaId,
                    monto: values.monto,
                    banco_id: values.banco_id
                },
                user_id: user?.id,
                user_email: user?.email
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['caja_transactions', cajaId] });
            queryClient.invalidateQueries({ queryKey: ['caja', cajaId] });
            notifications.show({
                title: 'Depósito Registrado',
                message: 'El dinero ha sido descontado de la caja correctamente.',
                color: 'teal',
            });
            onClose();
            onSuccess?.();
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error.message || 'No se pudo registrar el depósito',
                color: 'red',
            });
        }
    });

    return (
        <AppModal
            opened={opened}
            onClose={onClose}
            title="Registrar Depósito a Banco"
            size="sm"
        >
            <form onSubmit={form.onSubmit((v) => mutation.mutate(v))}>
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Registre la salida de efectivo de esta caja hacia una cuenta bancaria de la empresa.
                    </Text>

                    <DateInput
                        label="Fecha del Depósito"
                        placeholder="Seleccione fecha"
                        leftSection={<IconCalendar size={16} />}
                        maxDate={new Date()}
                        locale="es"
                        required
                        {...form.getInputProps('fecha')}
                    />

                    <Select
                        label="Banco de Destino"
                        placeholder="Seleccione cuenta bancaria"
                        leftSection={<IconBuildingBank size={16} />}
                        data={bancosList}
                        searchable
                        nothingFoundMessage="No hay bancos registrados"
                        required
                        {...form.getInputProps('banco_id')}
                    />

                    <NumberInput
                        label="Monto a Depositar"
                        placeholder="0.00"
                        leftSection={<IconCurrencyDollar size={16} />}
                        min={0.01}
                        max={maxMonto}
                        decimalScale={2}
                        fixedDecimalScale
                        required
                        description={`Disponible en caja: $${maxMonto.toFixed(2)}`}
                        {...form.getInputProps('monto')}
                    />

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            color="blue"
                            loading={mutation.isPending}
                            disabled={!form.isValid()}
                        >
                            Registrar Depósito
                        </Button>
                    </Group>
                </Stack>
            </form>
        </AppModal>
    );
}
