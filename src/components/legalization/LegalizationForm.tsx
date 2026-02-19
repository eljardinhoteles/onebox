import { Stack, Select, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';

interface LegalizationFormProps {
    proveedores: { value: string; label: string }[];
    proveedorId: string | null;
    invoiceNumber: string;
    invoiceDate: Date | null;
    onProveedorChange: (val: string | null) => void;
    onInvoiceNumberChange: (val: string) => void;
    onInvoiceDateChange: (val: any) => void;
}

export function LegalizationForm({
    proveedores,
    proveedorId,
    invoiceNumber,
    invoiceDate,
    onProveedorChange,
    onInvoiceNumberChange,
    onInvoiceDateChange
}: LegalizationFormProps) {
    return (
        <Stack gap="sm">
            <Select
                label="Proveedor Legalizador"
                placeholder="Selecciona un proveedor..."
                data={proveedores}
                value={proveedorId}
                onChange={onProveedorChange}
                searchable
                required
                radius="md"
            />

            <TextInput
                label="Número de Factura"
                placeholder="Ej: 001-001-000000123"
                value={invoiceNumber}
                onChange={(e) => onInvoiceNumberChange(e.currentTarget.value)}
                required
            />

            <DatePickerInput
                label="Fecha de la Factura"
                placeholder="Elegir fecha"
                locale="es"
                value={invoiceDate}
                onChange={onInvoiceDateChange}
                required
                maxDate={new Date()}
                allowDeselect={false}
            />
        </Stack>
    );
}
