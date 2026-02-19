import { useState, useEffect, useRef, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Paper, Text, Stack, Group, Button, Tooltip, ActionIcon } from '@mantine/core';
import { supabase } from '../lib/supabaseClient';
import { useDisclosure, useHotkeys } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { AppDrawer } from '../components/ui/AppDrawer';
import { TransactionForm } from '../components/TransactionForm';
import { RetentionForm } from '../components/RetentionForm';
import { LegalizationDrawer } from '../components/LegalizationDrawer';
import { notifications } from '@mantine/notifications';
import {
    IconPlus,
    IconPrinter, IconAlertTriangle, IconEye
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CajaReport } from '../components/CajaReport';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

import { useCajaCalculations, type Transaction } from '../hooks/useCajaCalculations';
import { CajaSummaryCards } from '../components/caja/CajaSummaryCards';
import { TransactionTable } from '../components/caja/TransactionTable';
import { useAppConfig } from '../hooks/useAppConfig';
import { TransactionNovedadesDrawer } from '../components/caja/TransactionNovedadesDrawer';
import { CierreCajaModal } from '../components/caja/CierreCajaModal';
import { RetencionesRecaudacionDrawer } from '../components/caja/RetencionesRecaudacionDrawer';
import { ArqueoControlModal } from '../components/caja/ArqueoControlModal';
import { DepositoBancoModal } from '../components/caja/DepositoBancoModal';
import { CajaHeader } from '../components/caja/CajaHeader';

interface CajaDetalleProps {
    cajaId: number;
    setHeaderActions?: (actions: React.ReactNode) => void;
    setOnAdd?: (fn: (() => void) | undefined) => void;
    onBack?: () => void;
}

const TIPO_LABELS: Record<string, string> = {
    factura: 'Factura',
    nota_venta: 'N. Venta',
    liquidacion_compra: 'Liq. Compra',
    sin_factura: 'S/ Factura',
    deposito: 'Depósito a Banco',
};

export function CajaDetalle({ cajaId, setHeaderActions, setOnAdd, onBack }: CajaDetalleProps) {
    const queryClient = useQueryClient();
    const { configs } = useAppConfig();
    const alertThreshold = parseInt(configs.porcentaje_alerta_caja || '15');

    const [transactionState, setTransactionState] = useState({
        editingId: null as number | null,
        retentionId: null as number | null,
        selectedForNovedades: null as Transaction | null,
        readOnlyMessage: null as string | null
    });

    const [filterState, setFilterState] = useState({
        query: '',
        tipo: null as string | null,
        sortBy: 'fecha_factura',
        sortOrder: 'desc' as 'asc' | 'desc'
    });

    const [isClosingInReadOnlyMode, setIsClosingInReadOnlyMode] = useState(false);

    // Modals/Drawers
    const [formOpened, { open, close }] = useDisclosure(false);
    const [retentionOpened, { open: openRetention, close: closeRetention }] = useDisclosure(false);
    const [legalizationOpened, { open: openLegalization, close: closeLegalization }] = useDisclosure(false);
    const [novedadesOpened, { open: openNovedades, close: closeNovedades }] = useDisclosure(false);
    const [closingOpened, { open: openClosing, close: closeClosing }] = useDisclosure(false);
    const [retencionesControlOpened, { open: openRetencionesControl, close: closeRetencionesControl }] = useDisclosure(false);
    const [arqueoControlOpened, { open: openArqueoControl, close: closeArqueoControl }] = useDisclosure(false);
    const [depositoOpened, { open: openDeposito, close: closeDeposito }] = useDisclosure(false);

    const componentRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Reporte-Caja-${cajaId}`,
    });

    const handleCreate = useCallback(() => {
        setTransactionState(prev => ({ ...prev, readOnlyMessage: null, editingId: null }));
        open();
    }, [open]);

    // Atajos contextuales
    useHotkeys([
        ['n', () => { if (caja?.estado === 'abierta') handleCreate(); }],
        ['l', () => { if (caja?.estado === 'abierta') openLegalization(); }],
        ['p', () => handlePrint()],
    ]);

    // --- QUERIES ---

    const { data: caja } = useQuery({
        queryKey: ['caja', cajaId],
        queryFn: async () => {
            const { data, error } = await supabase.from('cajas').select('*').eq('id', cajaId).single();
            if (error) throw error;
            return data;
        },
    });

    // Exponer handleCreate al padre para el FAB
    useEffect(() => {
        if (!setOnAdd) return;

        if (caja?.estado === 'abierta') {
            setOnAdd(handleCreate);
        } else {
            setOnAdd(undefined);
        }

        return () => {
            setOnAdd(undefined);
        };
    }, [caja?.estado, setOnAdd, handleCreate]);

    const { data: transactions = [], isLoading: loadingTrans, isError, error } = useQuery({
        queryKey: ['transactions', cajaId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('transacciones')
                .select(`
                    id, tipo_documento, fecha_factura, numero_factura, total_factura,
                    parent_id, es_justificacion, has_manual_novedad,
                    proveedor:proveedores (nombre, ruc),
                    retencion:retenciones (id, numero_retencion, total_fuente, total_iva, total_retenido),
                    items:transaccion_items!transaccion_items_transaccion_id_fkey (nombre),
                    banco:bancos (nombre)
                `)
                .eq('caja_id', cajaId)
                .is('parent_id', null)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map((t: any) => ({
                ...t,
                total_factura: Number(t.total_factura),
                proveedor: Array.isArray(t.proveedor) ? t.proveedor[0] : t.proveedor,
                retencion: Array.isArray(t.retencion) ? {
                    ...t.retencion[0],
                    total_fuente: Number(t.retencion[0].total_fuente),
                    total_iva: Number(t.retencion[0].total_iva),
                    total_retenido: Number(t.retencion[0].total_retenido)
                } : (t.retencion ? {
                    ...t.retencion,
                    total_fuente: Number(t.retencion.total_fuente),
                    total_iva: Number(t.retencion.total_iva),
                    total_retenido: Number(t.retencion.total_retenido)
                } : null)
            }));
        },
    });

    const { data: arqueoData } = useQuery({
        queryKey: ['arqueo', cajaId],
        queryFn: async () => {
            if (caja?.estado !== 'cerrada') return null;

            const { data, error } = await supabase
                .from('bitacora')
                .select('detalle')
                .eq('accion', 'CIERRE_CAJA')
                .filter('detalle->>caja_id', 'eq', cajaId.toString())
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error) return null;

            return data?.detalle?.arqueo_cierre || null;
        },
        enabled: !!caja && caja.estado === 'cerrada'
    });

    // --- CÁLCULOS DERIVADOS ---

    const totals = useCajaCalculations(caja, transactions);
    const deposits = transactions.filter(t => t.tipo_documento === 'deposito');

    const totalDepositos = deposits.reduce((sum, t) => sum + t.total_factura, 0);
    const montoInicialNeto = (caja?.monto_inicial || 0) - totalDepositos;

    const percentageRemaining = montoInicialNeto > 0
        ? (totals.efectivo / montoInicialNeto) * 100
        : 0;

    const isLowBalance = percentageRemaining <= alertThreshold && caja?.estado === 'abierta';

    // --- MUTATIONS ---

    const deleteTransactionMutation = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase.from('transacciones').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions', cajaId] });
            notifications.show({ title: 'Eliminado', message: 'Registro eliminado', color: 'teal' });
        },
        onError: (err: any) => notifications.show({ title: 'Error', message: err.message, color: 'red' })
    });

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = !filterState.query ||
            t.proveedor?.nombre?.toLowerCase().includes(filterState.query.toLowerCase()) ||
            t.proveedor?.ruc?.includes(filterState.query) ||
            t.numero_factura?.toLowerCase().includes(filterState.query.toLowerCase()) ||
            t.items?.some((i: any) => i.nombre.toLowerCase().includes(filterState.query.toLowerCase()));

        if (t.tipo_documento === 'deposito') return false;

        const matchesTipo = !filterState.tipo || t.tipo_documento === filterState.tipo;

        return matchesSearch && matchesTipo;
    }).sort((a, b) => {
        if (filterState.sortBy === 'fecha_factura') {
            const dateA = dayjs(a.fecha_factura);
            const dateB = dayjs(b.fecha_factura);
            return filterState.sortOrder === 'asc' ? dateA.diff(dateB) : dateB.diff(dateA);
        }
        return 0;
    });

    const handleSort = (key: string) => {
        setFilterState(prev => ({
            ...prev,
            sortBy: key,
            sortOrder: prev.sortBy === key && prev.sortOrder === 'asc' ? 'desc' : 'asc'
        }));
    };

    useEffect(() => {
        if (!setHeaderActions) return;

        const day = new Date().getDate();
        const isMonthlyCloseBlocking = day >= 28;

        if (caja?.estado === 'abierta') {
            setHeaderActions(
                isMonthlyCloseBlocking ? (
                    <Tooltip label="Cierre mensual bloqueado" withArrow position="bottom">
                        <ActionIcon variant="filled" color="gray" size="lg" radius="md" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                            <IconPlus size={18} />
                        </ActionIcon>
                    </Tooltip>
                ) : (
                    <Tooltip label="Registrar Gasto [N]" withArrow position="bottom" radius="md">
                        <ActionIcon variant="filled" color="blue" size="lg" radius="md" onClick={handleCreate} style={{ boxShadow: 'var(--mantine-shadow-sm)' }}>
                            <IconPlus size={18} />
                        </ActionIcon>
                    </Tooltip>
                )
            );
        } else {
            setHeaderActions(null);
        }
    }, [caja, setHeaderActions]);

    const handleEdit = (id: number) => {
        const trans = transactions.find(t => t.id === id);
        if (trans.tipo_documento === 'deposito') {
            notifications.show({ title: 'No editable', message: 'Los depósitos bancarios no se pueden editar, solo eliminar y volver a crear.', color: 'orange' });
            return;
        }

        const msg = (trans && trans.retencion && trans.retencion.total_retenido > 0)
            ? 'No se puede editar una transacción que tiene una retención asociada. Por favor, elimine la retención primero para poder modificar el documento.'
            : null;

        setTransactionState(prev => ({ ...prev, readOnlyMessage: msg, editingId: id }));
        open();
    };

    const handleDelete = (t: Transaction) => {
        modals.openConfirmModal({
            title: 'Confirmar eliminación',
            centered: true,
            children: (
                <Stack gap="sm">
                    <Text size="sm">¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.</Text>
                    <Paper withBorder p="xs" radius="md" bg="gray.0">
                        <Group justify="space-between">
                            <Text size="xs" fw={700} c="dimmed">Detalle:</Text>
                            <Text size="xs" fw={600}>{t.proveedor?.nombre || (t.items && t.items[0]?.nombre) || (t.tipo_documento === 'deposito' ? 'Depósito Bancario' : 'Sin detalle')}</Text>
                        </Group>
                        <Group justify="space-between" mt={4}>
                            <Text size="xs" fw={700} c="dimmed">Monto:</Text>
                            <Text size="xs" fw={700} color="red">-${t.total_factura.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                        </Group>
                    </Paper>
                </Stack>
            ),
            labels: { confirm: 'Eliminar', cancel: 'Cancelar' },
            confirmProps: { color: 'red' },
            onConfirm: () => deleteTransactionMutation.mutate(t.id),
        });
    };

    const openClosingModal = (readOnly: boolean = false) => {
        setIsClosingInReadOnlyMode(readOnly);
        openClosing();
    };

    const handleCloseCaja = () => {
        const hasPendingLegalizations = transactions.some(t => t.tipo_documento === 'sin_factura');

        if (hasPendingLegalizations) {
            modals.open({
                title: <Group gap="xs"><IconAlertTriangle size={20} color="orange" /><Text fw={700}>Cierre Bloqueado</Text></Group>,
                centered: true,
                children: (
                    <Stack gap="md">
                        <Text size="sm">No es posible cerrar la caja debido a que existen transacciones registradas como <b>"Sin Factura"</b> que aún no han sido legalizadas.</Text>
                        <Paper withBorder p="xs" bg="orange.0" c="orange.9" className="border-orange-200">
                            <Text size="xs" fw={500}>Debes legalizar todos los gastos pendientes antes de proceder con el cierre definitivo de la caja.</Text>
                        </Paper>
                        <Group grow>
                            <Button variant="default" onClick={() => modals.closeAll()}>Entendido</Button>
                            <Button variant="light" color="blue" leftSection={<IconEye size={16} />} onClick={() => { modals.closeAll(); openClosingModal(true); }}>Ver Detalles</Button>
                        </Group>
                    </Stack>
                )
            });
            return;
        }
        openClosingModal(false);
    };

    if (!caja && loadingTrans) return <Text p="xl" ta="center">Cargando...</Text>;

    return (
        <Stack gap="md">
            <CajaHeader
                caja={caja}
                onBack={onBack}
                isLowBalance={isLowBalance}
                percentageRemaining={percentageRemaining}
                montoInicialNeto={montoInicialNeto}
                totalDepositos={totalDepositos}
                filterState={filterState}
                setFilterState={setFilterState}
                TIPO_LABELS={TIPO_LABELS}
                openLegalization={openLegalization}
                handleCloseCaja={handleCloseCaja}
                openDeposito={openDeposito}
                handlePrint={handlePrint}
                isError={isError}
                error={error}
            />

            <CajaSummaryCards caja={caja} totals={totals} onOpenRetencionesControl={openRetencionesControl} onOpenArqueoControl={openArqueoControl} />

            <Paper withBorder p={{ base: 'xs', sm: 'md' }} radius="lg" className="shadow-sm border-gray-100" style={{ position: 'relative' }}>
                <TransactionTable
                    transactions={filteredTransactions}
                    loading={loadingTrans}
                    cajaEstado={caja?.estado || 'abierta'}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onRetention={(id: number) => { setTransactionState(p => ({ ...p, retentionId: id })); openRetention(); }}
                    onNovedades={(t: Transaction) => { setTransactionState(p => ({ ...p, selectedForNovedades: t })); openNovedades(); }}
                    sortBy={filterState.sortBy}
                    sortOrder={filterState.sortOrder}
                    onSort={handleSort}
                />

                {(!filterState.query && !filterState.tipo) ? null : (
                    <Paper withBorder mt="md" p="md" radius="md" bg="blue.0" style={{ borderColor: 'var(--mantine-color-blue-2)' }}>
                        <Group justify="space-between" align="center">
                            <Stack gap={0}><Text size="xs" fw={700} c="blue.9" tt="uppercase" lts={1}>Resumen de Filtro</Text><Text size="xs" c="dimmed">{filteredTransactions.length} transacciones encontradas</Text></Stack>
                            <Group gap="xl">
                                <Stack gap={0} align="flex-end"><Text size="xs" c="dimmed" fw={500}>Total Facturado</Text><Text fw={800} size="sm" c="red.7">-${filteredTransactions.reduce((acc, t) => acc + t.total_factura, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></Stack>
                                <Stack gap={0} align="flex-end"><Text size="xs" c="dimmed" fw={500}>Ret. Fuente</Text><Text fw={700} size="sm" c="orange.8">-${filteredTransactions.reduce((acc, t) => acc + (t.retencion?.total_fuente || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></Stack>
                                <Stack gap={0} align="flex-end"><Text size="xs" c="dimmed" fw={500}>Ret. IVA</Text><Text fw={700} size="sm" c="orange.8">-${filteredTransactions.reduce((acc, t) => acc + (t.retencion?.total_iva || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></Stack>
                                <Stack gap={0} align="flex-end"><Text size="xs" c="dimmed" fw={500}>Gasto Neto</Text><Text fw={900} size="md" c="blue.9">${filteredTransactions.reduce((acc, t) => acc + (t.total_factura - (t.retencion?.total_retenido || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></Stack>
                            </Group>
                        </Group>
                    </Paper>
                )}
            </Paper>

            <AppDrawer opened={formOpened} onClose={() => { close(); setTransactionState(p => ({ ...p, editingId: null })); }} title={caja?.estado !== 'abierta' ? "Detalle de Gasto" : (transactionState.editingId ? "Editar Gasto" : "Registrar Gasto")} size="lg" closeOnClickOutside={false}>
                <TransactionForm
                    cajaId={cajaId}
                    transactionId={transactionState.editingId || undefined}
                    warningMessage={transactionState.readOnlyMessage}
                    currentBalance={totals.efectivo}
                    readOnly={!!transactionState.readOnlyMessage || caja?.estado !== 'abierta'}
                    onSuccess={() => {
                        close();
                        setTransactionState(p => ({ ...p, editingId: null }));
                        queryClient.invalidateQueries({ queryKey: ['transactions', cajaId] });
                        queryClient.invalidateQueries({ queryKey: ['caja', cajaId] });
                        if (transactionState.editingId) {
                            queryClient.invalidateQueries({ queryKey: ['transaction_detail', transactionState.editingId] });
                        }
                    }}
                    onCancel={() => { close(); setTransactionState(p => ({ ...p, editingId: null })); }}
                />
            </AppDrawer>

            <AppDrawer opened={retentionOpened} onClose={() => { closeRetention(); setTransactionState(p => ({ ...p, retentionId: null })); }} title="Comprobante de Retención" size="xl">
                {transactionState.retentionId && (
                    <RetentionForm
                        transactionId={transactionState.retentionId}
                        onSuccess={() => { closeRetention(); setTransactionState(p => ({ ...p, retentionId: null })); queryClient.invalidateQueries({ queryKey: ['transactions', cajaId] }); queryClient.invalidateQueries({ queryKey: ['caja', cajaId] }); }}
                        onCancel={() => { closeRetention(); setTransactionState(p => ({ ...p, retentionId: null })); }}
                        readOnly={caja?.estado !== 'abierta'}
                    />
                )}
            </AppDrawer>

            <LegalizationDrawer opened={legalizationOpened} onClose={closeLegalization} cajaId={cajaId} cajaNumero={caja?.numero} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['transactions', cajaId] }); queryClient.invalidateQueries({ queryKey: ['caja', cajaId] }); }} />
            <TransactionNovedadesDrawer opened={novedadesOpened} onClose={() => { closeNovedades(); setTransactionState(p => ({ ...p, selectedForNovedades: null })); }} transactionId={transactionState.selectedForNovedades?.id || null} transactionDetail={transactionState.selectedForNovedades ? `${transactionState.selectedForNovedades.proveedor?.nombre || 'Gasto'} - $${transactionState.selectedForNovedades.total_factura}` : undefined} />
            <CajaReport ref={componentRef} caja={caja} transactions={transactions} totals={totals} arqueoData={arqueoData} />
            <CierreCajaModal
                opened={closingOpened} close={closeClosing} caja={caja} totals={totals} readOnly={isClosingInReadOnlyMode}
                onSuccess={() => {
                    closeClosing();
                    modals.open({
                        title: <Text fw={700}>¡Cierre Exitoso!</Text>,
                        centered: true,
                        children: (
                            <Stack gap="md">
                                <Text size="sm">La caja ha sido finalizada correctamente con el arqueo verificado.</Text>
                                <Button leftSection={<IconPrinter size={16} />} onClick={() => { modals.closeAll(); setTimeout(handlePrint, 500); }} fullWidth>Imprimir Reporte</Button>
                                <Button variant="light" color="gray" onClick={() => modals.closeAll()} fullWidth>Cerrar</Button>
                            </Stack>
                        )
                    });
                }}
            />
            <RetencionesRecaudacionDrawer opened={retencionesControlOpened} onClose={closeRetencionesControl} cajaId={cajaId} cajaNumero={caja?.numero} sucursal={caja?.sucursal} />
            <ArqueoControlModal opened={arqueoControlOpened} onClose={closeArqueoControl} cajaId={cajaId} cajaNumero={caja?.numero} sucursal={caja?.sucursal} efectivoEsperado={totals.efectivo} />
            <DepositoBancoModal
                opened={depositoOpened} onClose={closeDeposito} cajaId={cajaId} maxMonto={totals.efectivo}
                onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['transactions', cajaId] }); queryClient.invalidateQueries({ queryKey: ['caja', cajaId] }); }}
                existingDeposits={deposits} onDeleteDeposit={(id) => deleteTransactionMutation.mutate(id)}
            />
        </Stack>
    );
}
