import { Table, Text, Stack, Group, Divider, Paper, Flex, Box, Badge } from '@mantine/core';
import { IconFileDescription } from '@tabler/icons-react';
import { forwardRef } from 'react';
import dayjs from 'dayjs';
import { useEmpresa } from '../context/EmpresaContext';

interface Transaction {
    id: number;
    fecha_factura: string;
    numero_factura: string;
    total_factura: number;
    tipo_documento: 'factura' | 'nota_venta' | 'sin_factura' | 'no_deducible' | 'deposito';
    proveedor: {
        nombre: string;
        ruc: string;
    } | null;
    banco?: {
        nombre: string;
    } | null;
    items?: {
        nombre: string;
        monto: number;
        cantidad?: number;
        valor?: number;
        con_iva: boolean;
        monto_iva: number;
    }[];
    retencion?: {
        numero_retencion: string;
        total_fuente: number;
        total_iva: number;
        total_retenido: number;
        recaudada?: boolean;
    } | null;
    es_justificacion?: boolean;
}

interface CajaReportProps {
    caja: any;
    transactions: Transaction[];
    totals: any;
    arqueoData?: {
        items: {
            denominacion: number;
            cantidad: number;
            subtotal: number;
        }[];
        total_contado: number;
    } | null;
}

export const CajaReport = forwardRef<HTMLDivElement, CajaReportProps>(({ caja, transactions, totals, arqueoData }, ref) => {
    const { empresa } = useEmpresa();
    
    if (!caja) return null;

    const deposits = transactions.filter(t => t.tipo_documento === 'deposito');
    const noDeducibles = transactions.filter(t => t.tipo_documento === 'no_deducible');
    const gastos = transactions.filter(t => t.tipo_documento !== 'deposito' && t.tipo_documento !== 'no_deducible');
    const totalDepositos = deposits.reduce((sum, t) => sum + t.total_factura, 0);
    const totalNoDeducibles = totals.totalNoDeducibles ?? noDeducibles.reduce((sum, t) => sum + t.total_factura, 0);

    return (
        <div ref={ref} className="print-only p-8 bg-white text-black font-sans">
            {/* Cabezal de Empresa e Impresión */}
            <Group justify="space-between" align="flex-start" mb="sm">
                <Box>
                    {empresa && (
                        <>
                            <Text size="md" fw={800} style={{ color: 'black', lineHeight: 1.2 }} tt="uppercase">{empresa.nombre}</Text>
                            {empresa.ruc && <Text size="10px" fw={700} c="dimmed">RUC: {empresa.ruc}</Text>}
                            {(empresa.direccion || empresa.ciudad) && <Text size="10px" c="dimmed" style={{ maxWidth: 350 }}>{[empresa.direccion, empresa.ciudad].filter(Boolean).join(' - ')}</Text>}
                        </>
                    )}
                </Box>
                <Stack gap={0} align="flex-end">
                    <Text fw={700} size="10px" c="dimmed">FECHA DE IMPRESIÓN</Text>
                    <Text size="10px" fw={600}>{dayjs().format('DD/MM/YYYY HH:mm')}</Text>
                </Stack>
            </Group>

            <Divider my="sm" color="gray.2" />

            {/* Información Principal y Resumen */}
            <Flex justify="space-between" gap={40} mt="md" mb="xl">
                <Box style={{ flex: 1 }}>
                    <Stack gap={6}>
                        <Box mb="sm">
                            <Text size="14px" fw={800} tt="uppercase" style={{ color: 'black', lineHeight: 1.2 }}>
                                {caja.estado === 'cerrada' ? 'REPORTE DE CIERRE DE CAJA' : 'REPORTE DE CAJA (EN CURSO)'}: #{caja.numero ?? caja.id}
                            </Text>
                        </Box>
                        <Group gap="xs"><Text size="10px" fw={700} w={100}>Responsable:</Text><Text size="10px">{caja.responsable}</Text></Group>
                        <Group gap="xs"><Text size="10px" fw={700} w={100}>Sucursal:</Text><Text size="10px">{caja.sucursal}</Text></Group>
                        <Group gap="xs"><Text size="10px" fw={700} w={100}>Fecha Apertura:</Text><Text size="10px">{dayjs(caja.fecha_apertura).format('DD/MM/YYYY HH:mm').replace(' 00:00', '')}</Text></Group>
                        {caja.fecha_cierre && (
                            <Group gap="xs"><Text size="10px" fw={700} w={100}>Fecha Cierre:</Text><Text size="10px">{dayjs(caja.fecha_cierre).format('DD/MM/YYYY HH:mm').replace(' 00:00', '')}</Text></Group>
                        )}
                    </Stack>
                </Box>
                <Box style={{ flex: 1, paddingLeft: '40px' }}>
                    <Paper bg="gray.0" p="md" radius="sm">
                        <Stack gap={8}>
                            <Text size="11px" fw={800} tt="uppercase" c="dark.9">Resumen Financiero</Text>
                            <Group justify="space-between"><Text size="11px" fw={600} c="dimmed">Monto Inicial:</Text><Text size="11px" fw={700}>${caja.monto_inicial.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></Group>
                            <Group justify="space-between"><Text size="11px" fw={600} c="dimmed">Total Gastos:</Text><Text size="11px" fw={700} c="red.8">-${(totals.neto + totalNoDeducibles).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></Group>
                            {totals.totalRetPendiente > 0 && (
                                <Group justify="space-between" align="center">
                                    <Text size="11px" fw={600} c="dimmed">Faltante (Ret. Pend):</Text>
                                    <Text size="11px" fw={700} c="red.8">-${totals.totalRetPendiente.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                </Group>
                            )}
                            {totalDepositos > 0 && (
                                <Group justify="space-between"><Text size="11px" fw={600} c="dimmed">Depósitos a Banco:</Text><Text size="11px" fw={700} c="red.8">-${totalDepositos.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></Group>
                            )}
                            <Divider my={4} color="gray.3" />
                            <Group justify="space-between" bg="green.0" px="xs" py={4} style={{ borderRadius: '4px' }}>
                                <Text size="12px" fw={800} c="green.9">EFECTIVO FINAL:</Text>
                                <Text size="12px" fw={800} c="green.9">${totals.efectivo.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                            </Group>
                        </Stack>
                    </Paper>
                </Box>
                </Flex>
            {caja.estado === 'cerrada' && (() => {
                const metodoReposicion = caja.metodo_reposicion || (caja.reposicion > 0 ? 'cheque' : 'ninguna');
                return (
                    <Paper bg="blue.0" p="md" radius="sm" mb="xl">
                        <Group justify="space-between" align="center">
                            <Box>
                                <Text size="11px" fw={800} tt="uppercase" c="blue.9" mb={4}>Detalle de Reposición</Text>
                                <Text size="11px" fw={600} c="dimmed">
                                    Método: <span style={{ fontWeight: 700, color: 'black', textTransform: 'capitalize' }}>{metodoReposicion}</span>
                                </Text>
                                {metodoReposicion !== 'ninguna' && (
                                    <Group gap="xl" mt={2}>
                                        <Text size="11px" fw={600} c="dimmed">
                                            {metodoReposicion === 'transferencia' ? 'Ref' : 'Cheque'}: <span style={{ fontWeight: 700, color: 'black' }}>{caja.numero_cheque_reposicion || '---'}</span>
                                        </Text>
                                        <Text size="11px" fw={600} c="dimmed">
                                            Banco: <span style={{ fontWeight: 700, color: 'black' }}>{caja.banco_reposicion || '---'}</span>
                                        </Text>
                                    </Group>
                                )}
                            </Box>
                            <Box bg="blue.1" px="md" py={8} style={{ borderRadius: '4px' }}>
                                <Text size="10px" fw={700} c="blue.9" ta="right" mb={2}>MONTO A REPONER</Text>
                                <Text size="18px" fw={800} c="blue.9" ta="right">${caja.reposicion.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                            </Box>
                        </Group>
                    </Paper>
                );
            })()}
            {/* Observaciones de Cierre */}
            {caja.observaciones && (
                <Stack gap={4} mb="xl">
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">Observaciones de Cierre</Text>
                    <Paper withBorder p="md" radius="sm" bg="gray.1" style={{ border: '1px solid #ccc' }}>
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{caja.observaciones}</Text>
                    </Paper>
                </Stack>
            )}

            {/* Depósitos Bancarios */}
            {deposits.length > 0 && (
                <Box mb="xl">
                    <Text size="10px" fw={800} tt="uppercase" mb="xs">Depósitos Bancarios de Efectivo</Text>
                    <Table style={{ color: 'black', fontSize: '10px' }} verticalSpacing="xs" horizontalSpacing="sm">
                        <Table.Thead>
                            <Table.Tr bg="gray.1">
                                <Table.Th w={80} ta="center">FECHA</Table.Th>
                                <Table.Th>BANCO DESTINO</Table.Th>
                                <Table.Th ta="right" w={120}>MONTO DEPOSITADO</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {deposits.map(d => (
                                <Table.Tr key={d.id} style={{ borderBottom: '1px dashed #ccc' }}>
                                    <Table.Td ta="center">
                                        <Text size="11px">{dayjs(d.fecha_factura).format('DD/MM/YYYY')}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="11px" fw={700}>{d.banco?.nombre || 'Banco'}</Text>
                                    </Table.Td>
                                    <Table.Td ta="right">
                                        <Text size="11px" fw={700}>${d.total_factura.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                            <Table.Tr fw={800} style={{ borderTop: '2px solid #ccc' }}>
                                <Table.Td colSpan={2} ta="right">TOTAL DEPOSITADO:</Table.Td>
                                <Table.Td ta="right">${totalDepositos.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Table.Td>
                            </Table.Tr>
                        </Table.Tbody>
                    </Table>
                </Box>
            )}

            {/* Gastos No Deducibles */}
            {noDeducibles.length > 0 && (
                <Box mb="xl">
                    <Text size="10px" fw={800} tt="uppercase" mb="xs" c="red.8">Gastos No Deducibles (Sin Factura)</Text>
                    <Table style={{ color: 'black', fontSize: '10px' }} verticalSpacing="xs" horizontalSpacing="sm">
                        <Table.Thead>
                            <Table.Tr bg="red.0">
                                <Table.Th w={80} ta="center" c="red.9">FECHA</Table.Th>
                                <Table.Th c="red.9">DESCRIPCIÓN / DETALLE</Table.Th>
                                <Table.Th ta="right" w={120} c="red.9">MONTO</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {noDeducibles.map(t => (
                                <Table.Tr key={t.id} style={{ borderBottom: '1px dashed #ccc' }}>
                                    <Table.Td ta="center">
                                        <Text size="11px">{dayjs(t.fecha_factura).format('DD/MM/YYYY')}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="11px" fw={700}>{t.proveedor?.nombre || (t.items && t.items[0]?.nombre) || 'Gasto sin detalle'}</Text>
                                        {t.items && t.items.length > 0 && (
                                            <Box mt={2}>
                                                {t.items.map((i, idx) => (
                                                    <Text key={idx} size="11px" c="dimmed">• {i.nombre}</Text>
                                                ))}
                                            </Box>
                                        )}
                                    </Table.Td>
                                    <Table.Td ta="right">
                                        <Text size="11px" fw={700} c="red.8">${t.total_factura.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                            <Table.Tr fw={800} style={{ borderTop: '2px solid #ccc' }}>
                                <Table.Td colSpan={2} ta="right">TOTAL NO DEDUCIBLES:</Table.Td>
                                <Table.Td ta="right" c="red.8">${totalNoDeducibles.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Table.Td>
                            </Table.Tr>
                        </Table.Tbody>
                    </Table>
                </Box>
            )}

            {/* Listado de Gastos */}
            <Box mb="xl">
                <Text size="10px" fw={800} tt="uppercase" mb="xs">Detalle de Gastos Registrados</Text>
                <Table style={{ color: 'black', fontSize: '10px' }} verticalSpacing="xs" horizontalSpacing="sm">
                    <Table.Thead>
                        <Table.Tr bg="gray.1">
                            <Table.Th w={60} ta="center">FECHA</Table.Th>
                            <Table.Th>DOCUMENTO Y DETALLE</Table.Th>
                            <Table.Th ta="right" w={90}>SUBTOTAL</Table.Th>
                            <Table.Th ta="right" w={70}>IVA</Table.Th>
                            <Table.Th ta="right" w={90}>RETENCIÓN</Table.Th>
                            <Table.Th ta="right" w={90}>NETO</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {gastos.flatMap(t => {
                            const subtotalGasto = t.total_factura - (t.retencion?.total_iva || 0);
                            const retencionTotal = t.retencion?.total_retenido || 0;
                            const netoGasto = t.total_factura - retencionTotal;

                            return [
                                <Table.Tr key={`${t.id}-prov`} style={{ borderBottom: 'none' }}>
                                    <Table.Td colSpan={6} style={{ paddingTop: '8px', paddingBottom: '0' }}>
                                        <Group gap="xs">
                                            <Text fw={600} size="11px" tt="uppercase" c="gray.7">
                                                {t.proveedor?.nombre || (t.items && t.items[0]?.nombre) || 'GASTO'}
                                            </Text>
                                            {t.es_justificacion && (
                                                <Badge variant="light" color="blue" size="xs" leftSection={<IconFileDescription size={10} />}>
                                                    Justificativo
                                                </Badge>
                                            )}
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>,
                                <Table.Tr key={`${t.id}-det`} style={{ borderBottom: '1px dashed #ccc' }}>
                                    <Table.Td ta="center" style={{ verticalAlign: 'top', paddingTop: '4px' }}>
                                        <Text size="11px">{dayjs(t.fecha_factura).format('DD/MM')}</Text>
                                    </Table.Td>
                                    <Table.Td style={{ verticalAlign: 'top', paddingTop: '4px' }}>
                                        <Text size="11px" fw={700}>
                                            {(() => {
                                                const prefijos: Record<string, string> = { factura: 'FAC', nota_venta: 'NV', liquidacion_compra: 'LC' };
                                                const prefijo = prefijos[t.tipo_documento] ?? '';
                                                return t.numero_factura ? `${prefijo}${prefijo ? ': ' : ''}${t.numero_factura}` : 'S/N';
                                            })()}
                                        </Text>
                                        {t.items && t.items.length > 0 && (
                                            <Box mt={2}>
                                                {t.items.map((i, idx) => {
                                                    const qty = Number(i.cantidad) || 1;
                                                    return (
                                                        <Text key={idx} size="10px" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                                                            • {qty !== 1 ? `${qty} x ` : ''}{i.nombre}
                                                        </Text>
                                                    );
                                                })}
                                            </Box>
                                        )}
                                    </Table.Td>
                                    <Table.Td ta="right" style={{ verticalAlign: 'top', paddingTop: '4px' }}>
                                        <Text size="11px">${subtotalGasto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                    </Table.Td>
                                    <Table.Td ta="right" style={{ verticalAlign: 'top', paddingTop: '4px' }}>
                                        <Text size="11px">${(t.retencion?.total_iva || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                    </Table.Td>
                                    <Table.Td ta="right" style={{ verticalAlign: 'top', paddingTop: '4px' }}>
                                        {retencionTotal > 0 ? (
                                            <Stack gap={0} align="flex-end">
                                                <Text size="11px" c="red.8">-${retencionTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                                <Text size="10px" fw={600} c={t.retencion?.recaudada ? 'teal.7' : 'orange.7'}>
                                                    {t.retencion?.recaudada ? '(Rec)' : '(Pend)'}
                                                </Text>
                                            </Stack>
                                        ) : (
                                            <Text size="11px" c="red.8">-$0.00</Text>
                                        )}
                                    </Table.Td>
                                    <Table.Td ta="right" style={{ verticalAlign: 'top', paddingTop: '4px' }}>
                                        <Text fw={700} size="11px">${netoGasto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ];
                        })}
                        <Table.Tr fw={800} style={{ borderTop: '2px solid #ccc' }}>
                            <Table.Td colSpan={2} ta="right">TOTAL CON DOCUMENTO:</Table.Td>
                            <Table.Td ta="right">${totals.facturado.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Table.Td>
                            <Table.Td ta="right">${totals.iva.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Table.Td>
                            <Table.Td ta="right" c="red.8">-${totals.totalRet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Table.Td>
                            <Table.Td ta="right">${totals.neto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Table.Td>
                        </Table.Tr>
                    </Table.Tbody>
                </Table>
            </Box>

            {/* Total General */}
            <Group justify="flex-end" mb="xl">
                <Box p="xs" style={{ borderTop: '2px solid black', borderBottom: '2px solid black', minWidth: '350px' }}>
                    <Group justify="space-between">
                        <Text fw={800} size="12px">TOTAL GENERAL REPORTE:</Text>
                        <Text fw={800} size="14px">${(totals.neto + totalNoDeducibles).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                    </Group>
                </Box>
            </Group>

            {/* Anexo: Arqueo de Caja */}
            {arqueoData && (
                <Box mb="xl" mt="xl" style={{ pageBreakInside: 'avoid' }}>
                    <Text size="10px" fw={800} tt="uppercase" mb="xs">Anexo: Detalle de Arqueo de Caja</Text>
                    <Table style={{ color: 'black', fontSize: '10px' }} verticalSpacing="xs" horizontalSpacing="sm">
                        <Table.Thead>
                            <Table.Tr bg="gray.1">
                                <Table.Th>DENOMINACIÓN</Table.Th>
                                <Table.Th ta="center">CANTIDAD</Table.Th>
                                <Table.Th ta="right">TOTAL</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {arqueoData.items.map((item) => (
                                <Table.Tr key={item.denominacion} style={{ borderBottom: '1px dashed #ccc' }}>
                                    <Table.Td>{item.denominacion >= 1 ? `$${item.denominacion}` : `${(item.denominacion * 100).toFixed(0)} ctvs`}</Table.Td>
                                    <Table.Td ta="center">{item.cantidad}</Table.Td>
                                    <Table.Td ta="right">${item.subtotal.toFixed(2)}</Table.Td>
                                </Table.Tr>
                            ))}
                            <Table.Tr fw={800} style={{ borderTop: '2px solid #ccc' }}>
                                <Table.Td colSpan={2} ta="right">TOTAL CONTADO:</Table.Td>
                                <Table.Td ta="right">${arqueoData.total_contado.toFixed(2)}</Table.Td>
                            </Table.Tr>
                        </Table.Tbody>
                    </Table>
                </Box>
            )}

            {/* Firmas de Responsabilidad */}
            <Group grow mt={100} align="flex-end" px="xl">
                <Stack gap={4} align="center">
                    <Divider w="70%" color="black" />
                    <Text size="sm" fw={700}>REVISADO POR CONTABILIDAD</Text>
                </Stack>

                <Stack gap={4} align="center">
                    <Divider w="70%" color="black" />
                    <Text size="sm" fw={700}>APROBADO POR GERENCIA</Text>
                </Stack>
            </Group>

            {/* Espacio para auditoría interna */}
            <Box mt={60}>
                <Divider mb="xl" variant="dashed" />
                <Text size="xs" c="dimmed" ta="center">Este reporte es un documento de control interno generado por el Sistema de Gestión de Caja © 2026</Text>
                {caja.datos_cierre && caja.datos_cierre.fecha_accion && (
                    <Text size="xs" c="dimmed" ta="center" mt={4}>
                        Generado el: {dayjs(caja.datos_cierre.fecha_accion).format('DD/MM/YYYY HH:mm:ss')} por usuario ID: {caja.datos_cierre.usuario_id || 'N/A'}
                    </Text>
                )}
            </Box>
        </div >
    );
});
