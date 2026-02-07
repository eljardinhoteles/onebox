import { Table, Text, Stack, Group, Title, Divider, Paper, Flex, Box } from '@mantine/core';
import dayjs from 'dayjs';

interface Transaction {
    id: number;
    fecha_factura: string;
    numero_factura: string;
    total_factura: number;
    tipo_documento: 'factura' | 'nota_venta' | 'sin_factura';
    proveedor: {
        nombre: string;
        ruc: string;
    } | null;
    items?: {
        nombre: string;
        monto: number;
        con_iva: boolean;
        monto_iva: number;
    }[];
    retencion?: {
        numero_retencion: string;
        total_fuente: number;
        total_iva: number;
        total_retenido: number;
    } | null;
}

interface CajaReportProps {
    caja: any;
    transactions: Transaction[];
    totals: any;
}

export function CajaReport({ caja, transactions, totals }: CajaReportProps) {
    if (!caja) return null;

    return (
        <div className="print-only p-8 bg-white text-black font-sans">
            {/* Membrete / Cabezal */}
            <Stack gap="xs" mb="xl">
                <Group justify="space-between" align="flex-start">
                    <Stack gap={0}>
                        <Title order={2} style={{ color: 'black' }}>{caja.estado === 'cerrada' ? 'REPORTE DE CIERRE DE CAJA' : 'REPORTE DE CAJA (EN CURSO)'}</Title>
                        <Text fw={700} size="sm" c="dimmed">ID CAJA: #{caja.id}</Text>
                    </Stack>
                    <Stack gap={0} align="flex-end">
                        <Text fw={700} size="sm">FECHA DE EMISIÓN</Text>
                        <Text size="sm">{dayjs().format('DD/MM/YYYY HH:mm')}</Text>
                    </Stack>
                </Group>

                <Divider my="md" color="black" />

                <Flex justify="space-between" gap={40} mt="md">
                    <Box style={{ flex: 1 }}>
                        <Stack gap={4}>
                            <Text size="xs" fw={800} tt="uppercase" c="dimmed">Información de la Caja</Text>
                            <Group gap="xs"><Text size="sm" fw={700}>Responsable:</Text><Text size="sm">{caja.responsable}</Text></Group>
                            <Group gap="xs"><Text size="sm" fw={700}>Sucursal:</Text><Text size="sm">{caja.sucursal}</Text></Group>
                            <Group gap="xs"><Text size="sm" fw={700}>Fecha de Apertura:</Text><Text size="sm">{dayjs(caja.fecha_apertura).format('DD/MM/YYYY HH:mm')}</Text></Group>
                            {caja.fecha_cierre && (
                                <Group gap="xs"><Text size="sm" fw={700}>Fecha de Cierre:</Text><Text size="sm">{dayjs(caja.fecha_cierre).format('DD/MM/YYYY HH:mm')}</Text></Group>
                            )}
                        </Stack>
                    </Box>
                    <Box style={{ flex: 1, borderLeft: '1px solid #eee', paddingLeft: '40px' }}>
                        <Stack gap={4}>
                            <Text size="xs" fw={800} tt="uppercase" c="dimmed">Resumen Financiero</Text>
                            <Group justify="space-between"><Text size="sm" fw={700}>Monto Inicial:</Text><Text size="sm">${caja.monto_inicial.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></Group>
                            <Group justify="space-between"><Text size="sm" fw={700}>Total Gastos (Neto):</Text><Text size="sm">-${totals.neto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></Group>
                            <Divider variant="dashed" my={4} />
                            <Group justify="space-between"><Text size="md" fw={900}>EFECTIVO FINAL:</Text><Text size="md" fw={900}>${totals.efectivo.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></Group>
                        </Stack>
                    </Box>
                </Flex>
            </Stack>

            {/* Reposición */}
            {caja.estado === 'cerrada' && (
                <Paper withBorder p="sm" radius="md" mb="xl" style={{ border: '2px solid black' }}>
                    <Stack gap={4}>
                        <Text size="xs" fw={800} tt="uppercase">Detalle de Reposición</Text>
                        <Group justify="space-between">
                            <Text fw={700} size="lg">MONTO A REPONER:</Text>
                            <Text fw={900} size="lg">${caja.reposicion.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                        </Group>
                        <Text size="sm" fw={600}>Número de Cheque: {caja.numero_cheque_reposicion || '---'}</Text>
                    </Stack>
                </Paper>
            )}

            {/* Listado de Gastos */}
            <Title order={4} mb="sm" tt="uppercase">Detalle de Gastos Registrados</Title>
            <Table variant="striped" withTableBorder withColumnBorders style={{ color: 'black' }}>
                <Table.Thead>
                    <Table.Tr bg="gray.1">
                        <Table.Th w={80} ta="center">Fecha</Table.Th>
                        <Table.Th>Proveedor / Detalle</Table.Th>
                        <Table.Th w={120}>Doc #</Table.Th>
                        <Table.Th ta="right" w={100}>Subtotal</Table.Th>
                        <Table.Th ta="right" w={80}>IVA</Table.Th>
                        <Table.Th ta="right" w={100}>Retención</Table.Th>
                        <Table.Th ta="right" w={100}>Total Neto</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {transactions.map(t => {
                        const subtotalGasto = t.total_factura - (t.retencion?.total_iva || 0);
                        const retencionTotal = t.retencion?.total_retenido || 0;
                        const netoGasto = t.total_factura - retencionTotal;

                        return (
                            <Table.Tr key={t.id}>
                                <Table.Td ta="center">
                                    <Text size="xs">{dayjs(t.fecha_factura).format('DD/MM')}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text fw={700} size="sm">{t.proveedor?.nombre || (t.items && t.items[0]?.nombre) || 'Gasto'}</Text>
                                    {t.items && t.items.length > 1 && (
                                        <Text size="xs" c="dimmed" fs="italic"> + {t.items.length - 1} productos adicionales</Text>
                                    )}
                                </Table.Td>
                                <Table.Td>
                                    <Text size="xs">{t.numero_factura}</Text>
                                </Table.Td>
                                <Table.Td ta="right">
                                    <Text size="sm">${subtotalGasto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                </Table.Td>
                                <Table.Td ta="right">
                                    <Text size="sm">${(t.retencion?.total_iva || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                </Table.Td>
                                <Table.Td ta="right">
                                    <Text size="sm" c="red.8">-${retencionTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                </Table.Td>
                                <Table.Td ta="right">
                                    <Text fw={700} size="sm">${netoGasto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                </Table.Td>
                            </Table.Tr>
                        );
                    })}
                </Table.Tbody>
                <Table.Tfoot>
                    <Table.Tr bg="gray.1">
                        <Table.Th colSpan={3} ta="right">TOTALES ACUMULADOS:</Table.Th>
                        <Table.Th ta="right">${totals.facturado.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Table.Th>
                        <Table.Th ta="right">${totals.iva.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Table.Th>
                        <Table.Th ta="right" c="red.8">-${totals.totalRet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Table.Th>
                        <Table.Th ta="right" fw={800}>${totals.neto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Table.Th>
                    </Table.Tr>
                </Table.Tfoot>
            </Table>

            {/* Espacio para auditoría interna */}
            <Box mt={50}>
                <Text size="xs" c="dimmed" ta="center">Este reporte es un documento de control interno generado por el Sistema de Gestión de Caja © 2026</Text>
            </Box>
        </div>
    );
}
