import { useState, useRef, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useReactToPrint } from 'react-to-print';
import { ActionIcon, Button, Group, Loader, Paper, Stack, Text, Tooltip } from '@mantine/core';
import { AppLoader } from '../components/ui/AppLoader';
import { supabase } from '../lib/supabaseClient';
import { useEmpresa } from '../context/EmpresaContext';
import { useDisclosure, useHotkeys } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { AppDrawer } from '../components/ui/AppDrawer';
// import { TransactionForm } from '../components/TransactionForm'; // Refactored to lazy
import { RetentionForm } from '../components/RetentionForm';
import { LegalizationDrawer } from '../components/LegalizationDrawer';
import { notifications } from '@mantine/notifications';
import { IconPrinter, IconAlertTriangle, IconEye, IconTransfer } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
import { VerUltimoArqueoModal } from '../components/caja/VerUltimoArqueoModal';

const TransactionForm = lazy(() => import('../components/TransactionForm').then(m => ({ default: m.TransactionForm })));

interface CajaDetalleProps {
    cajaId: number;
    onBack?: (estado?: string) => void;
}

const TIPO_LABELS: Record<string, string> = {
    factura: 'Factura',
    nota_venta: 'N. Venta',
    liquidacion_compra: 'Liq. Compra',
    sin_factura: 'S/ Factura',
};

export function CajaDetalle({ cajaId, onBack }: CajaDetalleProps) {
    const { isReadOnly, loading: empresaLoading } = useEmpresa();
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
    const [ultimoArqueoOpened, { open: openUltimoArqueo, close: closeUltimoArqueo }] = useDisclosure(false);

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
        ['n', () => { if (caja?.estado === 'abierta' && !isReadOnly) handleCreate(); }],
        ['l', () => { if (caja?.estado === 'abierta' && !isReadOnly) openLegalization(); }],
        ['p', () => handlePrint()],
    ]);

    // --- QUERIES ---

    const { data: caja, isLoading: loadingCaja } = useQuery({
        queryKey: ['caja', cajaId],
        queryFn: async () => {
            const { data, error } = await supabase.from('cajas').select('*').eq('id', cajaId).single();
            if (error) throw error;
            return data;
        },
    });

    const { data: transactions = [], isLoading: loadingTrans, isError, error } = useQuery({
        queryKey: ['transactions', cajaId],
        placeholderData: keepPreviousData,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('transacciones')
                .select(`
                    id, tipo_documento, fecha_factura, numero_factura, total_factura,
                    parent_id, es_justificacion, has_manual_novedad,
                    proveedor:proveedores (nombre, ruc),
                    retencion:retenciones (id, numero_retencion, total_fuente, total_iva, total_retenido, recaudada),
                    items:transaccion_items!transaccion_items_transaccion_id_fkey (nombre, cantidad),
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

    const montoInicial = caja?.monto_inicial || 0;

    // El porcentaje se calcula vs el monto inicial original (los depósitos ya están descontados en totals.efectivo)
    const percentageRemaining = montoInicial > 0
        ? (totals.efectivo / montoInicial) * 100
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
            queryClient.invalidateQueries({ queryKey: ['retenciones_recaudacion', cajaId] });
            queryClient.invalidateQueries({ queryKey: ['caja', cajaId] });
            queryClient.invalidateQueries({ queryKey: ['cajas'] });
            notifications.show({ title: 'Eliminado', message: 'Registro eliminado', color: 'teal' });
        },
        onError: (err: any) => notifications.show({ title: 'Error', message: err.message, color: 'red' })
    });

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = !filterState.query ||
            t.proveedor?.nombre?.toLowerCase().includes(filterState.query.toLowerCase()) ||
            t.proveedor?.ruc?.includes(filterState.query) ||
            t.numero_factura?.toLowerCase().includes(filterState.query.toLowerCase()) ||
            dayjs(t.fecha_factura).format('DD/MM/YYYY').includes(filterState.query) ||
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

    const isGlobalLoading = loadingCaja || empresaLoading;

    if (!caja && !isGlobalLoading) return <AppLoader py={100} message="No se encontró la información de la caja..." />;

    const fabSlot = document.getElementById('global-fab-slot');

    return (
        <Stack gap="md">
            {fabSlot && caja?.estado === 'abierta' && !isReadOnly && createPortal(
                <Tooltip label="Nueva Transacción" position="top" withArrow color="cyan.7">
                    <ActionIcon
                        size={48}
                        radius={24}
                        variant="filled"
                        color="cyan"
                        onClick={handleCreate}
                        style={{
                            boxShadow: '0 4px 14px rgba(21, 170, 191, 0.4)',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.08)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(21, 170, 191, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '0 4px 14px rgba(21, 170, 191, 0.4)';
                        }}
                    >
                        <IconTransfer size={22} stroke={2.5} />
                    </ActionIcon>
                </Tooltip>,
                fabSlot
            )}

            <CajaHeader
                caja={caja}
                onBack={onBack ? () => onBack(caja?.estado) : undefined}
                isLowBalance={isLowBalance}
                filterState={filterState}
                setFilterState={setFilterState}
                TIPO_LABELS={TIPO_LABELS}
                openLegalization={openLegalization}
                handleCloseCaja={handleCloseCaja}
                openDeposito={openDeposito}
                handlePrint={handlePrint}
                openVerUltimoArqueo={openUltimoArqueo}
                isError={isError}
                error={error}
                isReadOnly={isReadOnly}
                loading={isGlobalLoading}
            />

            <CajaSummaryCards 
                caja={caja} 
                totals={totals} 
                onOpenRetencionesControl={openRetencionesControl} 
                onOpenArqueoControl={openArqueoControl} 
                loading={isGlobalLoading}
                isLowBalance={isLowBalance}
                percentageRemaining={percentageRemaining}
            />

            <Paper withBorder p={{ base: 'xs', sm: 'md' }} radius="lg" className="border-gray-100" style={{ position: 'relative' }}>
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
                    isReadOnly={isReadOnly}
                    isFilterActive={!!(filterState.query || filterState.tipo)}
                />
            </Paper>

            <AppDrawer opened={formOpened} onClose={() => { close(); setTransactionState(p => ({ ...p, editingId: null })); }} title={caja?.estado !== 'abierta' ? "Detalle de Gasto" : (transactionState.editingId ? "Editar Gasto" : "Registrar Gasto")} size="xl" closeOnClickOutside={false}>
                <Suspense fallback={
                    <Stack align="center" py={50}>
                        <Loader size="lg" />
                        <Text size="sm" c="dimmed">Cargando formulario...</Text>
                    </Stack>
                }>
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
                            queryClient.invalidateQueries({ queryKey: ['retenciones_recaudacion', cajaId] });
                            queryClient.invalidateQueries({ queryKey: ['caja', cajaId] });
                            queryClient.invalidateQueries({ queryKey: ['cajas'] });
                            if (transactionState.editingId) {
                                queryClient.invalidateQueries({ queryKey: ['transaction_detail', transactionState.editingId] });
                            }
                        }}
                        onCancel={() => { close(); setTransactionState(p => ({ ...p, editingId: null })); }}
                    />
                </Suspense>
            </AppDrawer>

            <AppDrawer opened={retentionOpened} onClose={() => { closeRetention(); setTransactionState(p => ({ ...p, retentionId: null })); }} title="Comprobante de Retención" size="xl">
                {transactionState.retentionId && (
                    <RetentionForm
                        transactionId={transactionState.retentionId}
                        onSuccess={() => {
                            closeRetention();
                            setTransactionState(p => ({ ...p, retentionId: null }));
                            queryClient.invalidateQueries({ queryKey: ['transactions', cajaId] });
                            queryClient.invalidateQueries({ queryKey: ['retenciones_recaudacion', cajaId] });
                            queryClient.invalidateQueries({ queryKey: ['caja', cajaId] });
                            queryClient.invalidateQueries({ queryKey: ['cajas'] });
                        }}
                        onCancel={() => { closeRetention(); setTransactionState(p => ({ ...p, retentionId: null })); }}
                        readOnly={caja?.estado !== 'abierta'}
                    />
                )}
            </AppDrawer>

            <LegalizationDrawer opened={legalizationOpened} onClose={closeLegalization} cajaId={cajaId} cajaNumero={caja?.numero} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['transactions', cajaId] }); queryClient.invalidateQueries({ queryKey: ['retenciones_recaudacion', cajaId] }); queryClient.invalidateQueries({ queryKey: ['caja', cajaId] }); queryClient.invalidateQueries({ queryKey: ['cajas'] }); }} />
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
                onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['transactions', cajaId] }); queryClient.invalidateQueries({ queryKey: ['caja', cajaId] }); queryClient.invalidateQueries({ queryKey: ['cajas'] }); }}
                existingDeposits={deposits} onDeleteDeposit={(id) => deleteTransactionMutation.mutate(id)}
            />
            <VerUltimoArqueoModal
                opened={ultimoArqueoOpened}
                onClose={closeUltimoArqueo}
                cajaId={cajaId}
                cajaNumero={caja?.numero}
            />
        </Stack>
    );
}
