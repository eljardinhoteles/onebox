import { Paper, Stack, Title, Text, Group, NumberInput, Switch, Divider, TextInput } from '@mantine/core';

interface ConfigSectionProps {
    localConfigs: {
        alertPercentage: number;
        reservePercentage: number;
        autoFormatFactura: boolean;
    };
    handleConfigSave: (key: string, value: string) => void;
    setAlertPercentage: (v: number) => void;
    setReservePercentage: (v: number) => void;
    setAutoFormatFactura: (v: boolean) => void;
}

export function ConfigSection({
    localConfigs,
    handleConfigSave,
    setAlertPercentage,
    setReservePercentage,
    setAutoFormatFactura
}: ConfigSectionProps) {
    return (
        <Paper withBorder p="xl" radius="lg">
            <Stack gap="xl">
                <div>
                    <Title order={3}>Ajustes del Sistema</Title>
                    <Text size="sm" c="dimmed">Personaliza el comportamiento de la aplicación.</Text>
                </div>

                <Stack gap="md">
                    <Group justify="space-between" align="flex-start">
                        <div style={{ flex: 1 }}>
                            <Text fw={600}>Alerta de Saldo Bajo</Text>
                            <Text size="xs" c="dimmed">Porcentaje de efectivo sobre el cual se mostrará una advertencia.</Text>
                        </div>
                        <NumberInput
                            value={localConfigs.alertPercentage}
                            onChange={(v) => {
                                setAlertPercentage(Number(v));
                                handleConfigSave('porcentaje_alerta_caja', v.toString());
                            }}
                            suffix="%"
                            min={1}
                            max={100}
                            w={100}
                        />
                    </Group>

                    <Divider />

                    <Group justify="space-between" align="flex-start">
                        <div style={{ flex: 1 }}>
                            <Text fw={600}>Reserva Mínima de Caja</Text>
                            <Text size="xs" c="dimmed">Porcentaje del monto inicial que debe mantenerse como fondo.</Text>
                        </div>
                        <NumberInput
                            value={localConfigs.reservePercentage}
                            onChange={(v) => {
                                setReservePercentage(Number(v));
                                handleConfigSave('porcentaje_reserva_caja', v.toString());
                            }}
                            suffix="%"
                            min={0}
                            max={100}
                            w={100}
                        />
                    </Group>

                    <Divider />

                    <Group justify="space-between" align="flex-start">
                        <div style={{ flex: 1 }}>
                            <Text fw={600}>Formato de Factura Automático</Text>
                            <Text size="xs" c="dimmed">Formatear números de factura como 000-000-000000000 automáticamente.</Text>
                        </div>
                        <Switch
                            checked={localConfigs.autoFormatFactura}
                            onChange={(e) => {
                                const checked = e.currentTarget.checked;
                                setAutoFormatFactura(checked);
                                handleConfigSave('formato_factura_automatico', checked.toString());
                            }}
                        />
                    </Group>
                </Stack>
            </Stack>
        </Paper>
    );
}

ConfigSection.Input = ({ label, onChange, ...props }: any) => (
    <TextInput
        label={label}
        onChange={(e) => onChange?.(e.currentTarget.value)}
        radius="md"
        {...props}
    />
);
