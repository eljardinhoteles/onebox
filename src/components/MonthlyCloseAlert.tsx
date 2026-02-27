import { Alert, Text } from '@mantine/core';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';

interface MonthlyCloseAlertProps {
    enabled?: boolean;
    closingDay?: number;
}

export function MonthlyCloseAlert({ enabled = true, closingDay = 28 }: MonthlyCloseAlertProps) {
    if (!enabled) return null;

    const day = new Date().getDate();
    const warningStart = closingDay - 3;

    // No mostrar nada antes de 3 días del cierre
    if (day < warningStart) return null;

    // Alerta de Bloqueo (día de cierre en adelante)
    if (day >= closingDay) {
        return (
            <Alert
                variant="filled"
                color="red"
                title="Cierre Mensual Obligatorio"
                icon={<IconAlertTriangle />}
                mb="md"
            >
                <Text size="sm">
                    El mes está por terminar. Por políticas contables, <strong>es obligatorio cerrar la caja antes de continuar</strong>.
                    No se permiten nuevas transacciones hasta que se realice el cierre mensual.
                </Text>
            </Alert>
        );
    }

    // Alerta Preventiva (3 días antes del cierre)
    return (
        <Alert
            variant="light"
            color="orange"
            title="Aviso de Cierre Mensual"
            icon={<IconInfoCircle />}
            mb="md"
        >
            <Text size="sm">
                Recuerda que debes realizar el <strong>Cierre de Caja</strong> antes del día {closingDay}.
                A partir de esa fecha, no se podrán registrar nuevos movimientos hasta que se cierre la caja.
            </Text>
        </Alert>
    );
}
