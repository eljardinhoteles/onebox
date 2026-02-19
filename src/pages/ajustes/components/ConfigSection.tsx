import { Stack, Title, Text, Card, Group, NumberInput, Switch, Button } from '@mantine/core';
import { IconDeviceFloppy } from '@tabler/icons-react';

interface ConfigSectionProps {
    alertPercentage: number;
    reservePercentage: number;
    autoFormatFactura: boolean;
    setAlertPercentage: (v: number) => void;
    setReservePercentage: (v: number) => void;
    setAutoFormatFactura: (v: boolean) => void;
    onSave: () => void;
    loading: boolean;
}

export function ConfigSection({ alertPercentage, reservePercentage, autoFormatFactura, setAlertPercentage, setReservePercentage, setAutoFormatFactura, onSave, loading }: ConfigSectionProps) {
    return (
        <Stack gap="lg">
            <Stack gap={4}>
                <Title order={3} size="h4" fw={700}>Configuración</Title>
                <Text size="sm" c="dimmed">Ingresa el porcentaje mínimo para que alerte al usario que debe cerrar su caja.</Text>
            </Stack>
            <Card withBorder radius="md" p="md" bg="blue.0" maw={500} shadow="xs">
                <Stack gap="md">
                    <Group justify="space-between" align="center">
                        <Stack gap={0}>
                            <Text fw={700} size="sm">Alertas de Saldo</Text>
                            <Text size="xs" c="dimmed">Porcentaje de reserva mínimo</Text>
                        </Stack>
                        <NumberInput value={alertPercentage} onChange={(val) => setAlertPercentage(Number(val))} min={0} max={100} suffix="%" w={100} radius="md" />
                    </Group>

                    <Group justify="space-between" align="center">
                        <Stack gap={0}>
                            <Text fw={700} size="sm">Reserva de Gasto</Text>
                            <Text size="xs" c="dimmed">Mínimo para bloquear gastos</Text>
                        </Stack>
                        <NumberInput value={reservePercentage} onChange={(val) => setReservePercentage(Number(val))} min={0} max={100} suffix="%" w={100} radius="md" />
                    </Group>

                    <Group justify="space-between" align="center">
                        <Stack gap={0}>
                            <Text fw={700} size="sm">Formato de Factura</Text>
                            <Text size="xs" c="dimmed">Autocompletar ceros y guiones</Text>
                        </Stack>
                        <Switch checked={autoFormatFactura} onChange={(event) => setAutoFormatFactura(event.currentTarget.checked)} size="md" onLabel="ON" offLabel="OFF" />
                    </Group>

                    <Button onClick={onSave} loading={loading} leftSection={<IconDeviceFloppy size={14} />}>Guardar Cambios</Button>
                </Stack>
            </Card>
        </Stack>
    );
}
