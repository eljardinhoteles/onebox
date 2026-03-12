import { useState, useEffect } from 'react';
import { Drawer, Stack, Paper, Group, Text, Textarea, Button, Title, NumberInput } from '@mantine/core';
import { IconBuilding, IconDeviceFloppy, IconCurrencyDollar } from '@tabler/icons-react';
import { supabase } from '../../../lib/supabaseClient';
import { notifications } from '@mantine/notifications';

interface AdminConfigModalProps {
    opened: boolean;
    onClose: () => void;
}

export function AdminConfigModal({ opened, onClose }: AdminConfigModalProps) {
    const [bankConfig, setBankConfig] = useState({ banco_datos: '', precio_mensual: 20, precio_anual: 204 });
    const [savingConfig, setSavingConfig] = useState(false);

    useEffect(() => {
        if (opened) {
            fetchBankConfig();
        }
    }, [opened]);

    const fetchBankConfig = async () => {
        const { data } = await supabase.from('platform_config').select('*');
        if (data) {
            const config: any = {};
            data.forEach((row: any) => { config[row.key] = row.value; });
            setBankConfig({ 
                banco_datos: config.banco_datos || '',
                precio_mensual: Number(config.precio_mensual) || 20,
                precio_anual: Number(config.precio_anual) || 204
            });
        }
    };

    const handleSaveBankConfig = async () => {
        setSavingConfig(true);
        try {
            for (const [key, value] of Object.entries(bankConfig)) {
                await supabase
                    .from('platform_config')
                    .upsert({ key, value, updated_at: new Date().toISOString() });
            }
            notifications.show({ title: 'Guardado', message: 'Configuración actualizada exitosamente.', color: 'teal' });
            onClose();
        } catch (err: any) {
            notifications.show({ title: 'Error', message: err.message, color: 'red' });
        } finally {
            setSavingConfig(false);
        }
    };

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            title={<Title order={4} fw={800}>Configuración de Plataforma</Title>}
            position="right"
            size="md"
        >
            <Stack gap="md" mt="sm">
                <Paper withBorder radius="md" p="md" bg="blue.0">
                    <Group gap="xs" mb="xs">
                        <IconBuilding size={16} color="var(--mantine-color-blue-8)" />
                        <Text fw={700} c="blue.9" size="sm">Cuentas Bancarias (Transferencias)</Text>
                    </Group>
                    <Text size="xs" c="blue.8" mb="sm">
                        Ingresa los detalles de la cuenta donde los clientes deben realizar sus pagos.
                        Admite formato multilínea.
                    </Text>
                    <Textarea
                        placeholder={`Ejemplo:\nBanco Pichincha - Cta Corriente\nNo. 2100xxxxxx\nNombre: Empresa SA\nRUC: 179xxxxxxx001`}
                        minRows={5}
                        maxRows={8}
                        autosize
                        value={bankConfig.banco_datos}
                        onChange={(e) => setBankConfig(prev => ({ ...prev, banco_datos: e.currentTarget.value }))}
                        styles={{ input: { fontFamily: 'monospace', fontSize: 13 } }}
                    />
                </Paper>

                <Paper withBorder radius="md" p="md" bg="teal.0">
                    <Group gap="xs" mb="xs">
                        <IconCurrencyDollar size={16} color="var(--mantine-color-teal-8)" />
                        <Text fw={700} c="teal.9" size="sm">Precios de Suscripción (USD)</Text>
                    </Group>
                    <Text size="xs" c="teal.8" mb="sm">
                        Modifica los valores aquí para actualizar el precio en el Landing Page y las suscripciones futuras.
                    </Text>
                    <Group grow>
                        <NumberInput
                            label="Mensual"
                            value={bankConfig.precio_mensual}
                            onChange={(v) => setBankConfig(p => ({ ...p, precio_mensual: Number(v) || 0 }))}
                            min={0}
                            leftSection={<IconCurrencyDollar size={14} />}
                        />
                        <NumberInput
                            label="Anual"
                            value={bankConfig.precio_anual}
                            onChange={(v) => setBankConfig(p => ({ ...p, precio_anual: Number(v) || 0 }))}
                            min={0}
                            leftSection={<IconCurrencyDollar size={14} />}
                        />
                    </Group>
                </Paper>

                <Button
                    fullWidth
                    leftSection={<IconDeviceFloppy size={16} />}
                    color="blue"
                    onClick={handleSaveBankConfig}
                    loading={savingConfig}
                >
                    Guardar Configuración
                </Button>
            </Stack>
        </Drawer>
    );
}
