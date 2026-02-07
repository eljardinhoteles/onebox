import { Alert, Text } from '@mantine/core';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';

export function MonthlyCloseAlert() {
    const day = new Date().getDate();

    // No mostrar nada antes del día 25
    if (day < 25) return null;

    // Alerta de Bloqueo (Día 28 en adelante)
    if (day >= 28) {
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

    // Alerta Preventiva (Días 25, 26, 27)
    return (
        <Alert
            variant="light"
            color="orange"
            title="Aviso de Cierre Mensual"
            icon={<IconInfoCircle />}
            mb="md"
        >
            <Text size="sm">
                Recuerda que debes realizar el <strong>Cierre de Caja</strong> antes del día 28.
                A partir de esa fecha, no se podrán registrar nuevos movimientos hasta que se cierre la caja.
            </Text>
        </Alert>
    );
}
