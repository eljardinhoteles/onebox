import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Paper, Text, Stack, Group, Button, Alert, Tooltip, ActionIcon, Menu, PillsInput, Pill, Title } from '@mantine/core';
import { supabase } from '../lib/supabaseClient';
import { useDisclosure, useHotkeys } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { AppDrawer } from '../components/ui/AppDrawer';
import { TransactionForm } from '../components/TransactionForm';
import { RetentionForm } from '../components/RetentionForm';
import { LegalizationDrawer } from '../components/LegalizationDrawer';
import { notifications } from '@mantine/notifications';
import {
    IconPlus, IconReceipt,
    IconLock, IconPrinter, IconAlertTriangle, IconEye, IconSearch, IconFilter, IconArrowLeft
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CajaReport } from '../components/CajaReport';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

import { useCajaCalculations, type Transaction } from '../hooks/useCajaCalculations';
import { CajaSummaryCards } from '../components/caja/CajaSummaryCards';
import { TransactionTable } from '../components/caja/TransactionTable';
import { useAppConfig } from '../hooks/useAppConfig';
import { MonthlyCloseAlert } from '../components/MonthlyCloseAlert';
import { TransactionNovedadesDrawer } from '../components/caja/TransactionNovedadesDrawer';
import { CierreCajaModal } from '../components/caja/CierreCajaModal';
import { RetencionesRecaudacionDrawer } from '../components/caja/RetencionesRecaudacionDrawer';
import { ArqueoControlModal } from '../components/caja/ArqueoControlModal';

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
};

export function CajaDetalle({ cajaId, setHeaderActions, setOnAdd, onBack }: CajaDetalleProps) {
    const queryClient = useQueryClient();
    const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
    const [retentionTransactionId, setRetentionTransactionId] = useState<number | null>(null);
    const [formOpened, { open, close }] = useDisclosure(false);
    const [retentionOpened, { open: openRetention, close: closeRetention }] = useDisclosure(false);
    const [legalizationOpened, { open: openLegalization, close: closeLegalization }] = useDisclosure(false);
    const [novedadesOpened, { open: openNovedades, close: closeNovedades }] = useDisclosure(false);
    const [closingOpened, { open: openClosing, close: closeClosing }] = useDisclosure(false);
    const [retencionesControlOpened, { open: openRetencionesControl, close: closeRetencionesControl }] = useDisclosure(false);
    const [arqueoControlOpened, { open: openArqueoControl, close: closeArqueoControl }] = useDisclosure(false);
    const [isClosingInReadOnlyMode, setIsClosingInReadOnlyMode] = useState(false);
    const [selectedTransactionForNovedades, setSelectedTransactionForNovedades] = useState<Transaction | null>(null);
    const { configs } = useAppConfig();
    const alertThreshold = parseInt(configs.porcentaje_alerta_caja || '15');

    const [retentionReadOnlyMessage, setRetentionReadOnlyMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTipo, setFilterTipo] = useState<string | null>(null);

    const componentRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Reporte-Caja-${cajaId}`,
    });

    const handleCreate = () => {
        setRetentionReadOnlyMessage(null);
        setEditingTransactionId(null);
        open();
    };

    // Atajos contextuales
    useHotkeys([
        ['n', () => { if (caja?.estado === 'abierta') handleCreate(); }],
        ['l', () => { if (caja?.estado === 'abierta') openLegalization(); }],
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

    // Exponer handleCreate al padre para el FAB
    useEffect(() => {
        if (setOnAdd && caja?.estado === 'abierta') {
            setOnAdd(() => handleCreate);
        } else if (setOnAdd) {
            setOnAdd(undefined);
        }
        return () => setOnAdd?.(undefined);
    }, [caja?.estado]);

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
                    items:transaccion_items!transaccion_items_transaccion_id_fkey (nombre)
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

    // Removed banks query as it's now internal to CierreCajaModal

    const loading = loadingCaja || loadingTrans;

    // --- CÁLCULOS DERIVADOS ---

    const totals = useCajaCalculations(caja, transactions);
    const percentageRemaining = caja ? (totals.efectivo / caja.monto_inicial) * 100 : 100;
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

    // closeCajaMutation removed as it's now handled inside CierreCajaModal

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = !searchQuery ||
            t.proveedor?.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.proveedor?.ruc?.includes(searchQuery) ||
            t.numero_factura?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.items?.some((i: any) => i.nombre.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesTipo = !filterTipo || t.tipo_documento === filterTipo;

        return matchesSearch && matchesTipo;
    });


    useEffect(() => {
        if (!setHeaderActions) return;

        const day = new Date().getDate();
        const isMonthlyCloseBlocking = day >= 28;

        if (caja?.estado === 'abierta') {
            setHeaderActions(
                isMonthlyCloseBlocking ? (
                    <Tooltip label="Cierre mensual bloqueado" withArrow position="bottom">
                        <ActionIcon
                            variant="filled"
                            color="gray"
                            size="lg"
                            radius="md"
                            disabled
                            style={{ opacity: 0.5, cursor: 'not-allowed' }}
                        >
                            <IconPlus size={18} />
                        </ActionIcon>
                    </Tooltip>
                ) : (
                    <Tooltip label="Registrar Gasto [N]" withArrow position="bottom" radius="md">
                        <ActionIcon
                            variant="filled"
                            color="blue"
                            size="lg"
                            radius="md"
                            onClick={handleCreate}
                            style={{ boxShadow: 'var(--mantine-shadow-sm)' }}
                        >
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
        if (trans && trans.retencion && trans.retencion.total_retenido > 0) {
            setRetentionReadOnlyMessage('No se puede editar una transacción que tiene una retención asociada. Por favor, elimine la retención primero para poder modificar el documento.');
        } else {
            setRetentionReadOnlyMessage(null);
        }
        setEditingTransactionId(id);
        open();
    };


    const handleDelete = (t: Transaction) => {
        modals.openConfirmModal({
            title: 'Confirmar eliminación',
            centered: true,
            children: (
                <Stack gap="sm">
                    <Text size="sm">
                        ¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.
                    </Text>
                    <Paper withBorder p="xs" radius="md" bg="gray.0">
                        <Group justify="space-between">
                            <Text size="xs" fw={700} c="dimmed">Proveedor:</Text>
                            <Text size="xs" fw={600}>{t.proveedor?.nombre || (t.items && t.items[0]?.nombre)}</Text>
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
                        <Text size="sm">
                            No es posible cerrar la caja debido a que existen transacciones registradas como <b>"Sin Factura"</b> que aún no han sido legalizadas.
                        </Text>
                        <Paper withBorder p="xs" bg="orange.0" c="orange.9" className="border-orange-200">
                            <Text size="xs" fw={500}>
                                Debes legalizar todos los gastos pendientes antes de proceder con el cierre definitivo de la caja.
                            </Text>
                        </Paper>
                        <Group grow>
                            <Button variant="default" onClick={() => modals.closeAll()}>Entendido</Button>
                            <Button
                                variant="light"
                                color="blue"
                                leftSection={<IconEye size={16} />}
                                onClick={() => {
                                    modals.closeAll();
                                    openClosingModal(true);
                                }}
                            >
                                Ver Detalles
                            </Button>
                        </Group>
                    </Stack>
                )
            });
            return;
        }

        openClosingModal(false);
    };

    if (!caja && loading) return <Text p="xl" ta="center">Cargando...</Text>;

    return (
        <Stack gap="md">
            <div className="no-print">
                <Stack gap="md">
                    <Group align="center" gap="sm">
                        {onBack && (
                            <ActionIcon variant="subtle" color="gray" size="lg" radius="xl" onClick={onBack}>
                                <IconArrowLeft size={20} />
                            </ActionIcon>
                        )}
                        <div>
                            <Title order={2} fw={700}>{caja?.sucursal || 'Caja'}</Title>
                            <Text size="sm" c="dimmed">
                                {caja?.responsable} · Apertura: {dayjs(caja?.fecha_apertura).format('DD/MM/YYYY')}
                                {caja?.fecha_cierre && ` · Cierre: ${dayjs(caja.fecha_cierre).format('DD/MM/YYYY')}`}
                            </Text>
                        </div>
                    </Group>
                    <MonthlyCloseAlert />
                    {isLowBalance && (
                        <Alert
                            variant="light"
                            color="orange"
                            title="Saldo de Caja Bajo"
                            icon={<IconAlertTriangle size={18} />}
                            radius="md"
                            mb="md"
                        >
                            <Text size="sm">
                                Solo queda un <b>{percentageRemaining.toFixed(1)}%</b> disponible de los ${caja?.monto_inicial.toLocaleString()}.
                                Se recomienda proceder al cierre de la caja para evitar falta de fondos.
                            </Text>
                        </Alert>
                    )}
                    {isError && (
                        <Alert
                            variant="light"
                            color="red"
                            title="Error al cargar transacciones"
                            icon={<IconAlertTriangle size={18} />}
                            radius="md"
                        >
                            <Text size="sm">{error instanceof Error ? error.message : 'Ha ocurrido un error desconocido'}</Text>
                        </Alert>
                    )}
                    <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
                        <Group gap="xs" style={{ flex: 1, minWidth: '300px' }}>
                            <PillsInput
                                radius="md"
                                style={{ flex: 1 }}
                                leftSection={<IconSearch size={16} />}
                                rightSection={
                                    <Menu position="bottom-end" shadow="sm" width={220} withArrow transitionProps={{ transition: 'pop-top-right' }}>
                                        <Menu.Target>
                                            <ActionIcon variant="subtle" color={filterTipo ? 'blue' : 'gray'} radius="md">
                                                <IconFilter size={18} />
                                            </ActionIcon>
                                        </Menu.Target>
                                        <Menu.Dropdown>
                                            <Menu.Label>Filtrar por Documento</Menu.Label>
                                            <Menu.Divider />
                                            {Object.entries(TIPO_LABELS).map(([val, label]) => (
                                                <Menu.Item
                                                    key={val}
                                                    onClick={() => setFilterTipo(val)}
                                                    bg={filterTipo === val ? 'blue.0' : undefined}
                                                    c={filterTipo === val ? 'blue.7' : undefined}
                                                >
                                                    {label}
                                                </Menu.Item>
                                            ))}
                                            {filterTipo && (
                                                <>
                                                    <Menu.Divider />
                                                    <Menu.Item color="red" onClick={() => setFilterTipo(null)}>
                                                        Limpiar Filtro
                                                    </Menu.Item>
                                                </>
                                            )}
                                        </Menu.Dropdown>
                                    </Menu>
                                }
                            >
                                <Pill.Group>
                                    {filterTipo && (
                                        <Pill
                                            withRemoveButton
                                            onRemove={() => setFilterTipo(null)}
                                            size="sm"
                                            color="blue"
                                        >
                                            {TIPO_LABELS[filterTipo]}
                                        </Pill>
                                    )}
                                    <PillsInput.Field
                                        placeholder={filterTipo ? "" : "Buscar por proveedor, RUC o factura..."}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                                    />
                                </Pill.Group>
                            </PillsInput>
                        </Group>

                        <Group>
                            {caja?.estado === 'abierta' && (
                                <>
                                    <Tooltip label="Legalizar Gastos [L]" withArrow radius="md">
                                        <Button variant="outline" color="orange" leftSection={<IconReceipt size={16} />} onClick={openLegalization}>
                                            Legalizar
                                        </Button>
                                    </Tooltip>
                                    <Button variant="filled" color="red" leftSection={<IconLock size={16} />} onClick={handleCloseCaja}>
                                        Cerrar Caja
                                    </Button>
                                </>
                            )}
                            <Tooltip label="Imprimir Reporte [P]" withArrow radius="md" position="bottom">
                                <ActionIcon
                                    variant="light"
                                    color="blue"
                                    size="lg"
                                    radius="md"
                                    onClick={handlePrint}
                                >
                                    <IconPrinter size={18} />
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                    </Group>

                    <CajaSummaryCards
                        caja={caja}
                        totals={totals}
                        onOpenRetencionesControl={openRetencionesControl}
                        onOpenArqueoControl={openArqueoControl}
                    />

                    <Paper withBorder p={{ base: 'xs', sm: 'md' }} radius="lg" className="shadow-sm border-gray-100">

                        <TransactionTable
                            transactions={filteredTransactions}
                            loading={loading}
                            cajaEstado={caja?.estado || 'abierta'}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onRetention={(id) => { setRetentionTransactionId(id); openRetention(); }}
                            onNovedades={(t) => { setSelectedTransactionForNovedades(t); openNovedades(); }}
                        />
                    </Paper>
                </Stack>
            </div >

            <AppDrawer
                opened={formOpened}
                onClose={() => { close(); setEditingTransactionId(null); }}
                title={caja?.estado !== 'abierta' ? "Detalle de Gasto" : (editingTransactionId ? "Editar Gasto" : "Registrar Gasto")}
                size="lg"
                closeOnClickOutside={false}
            >
                <TransactionForm
                    cajaId={cajaId}
                    transactionId={editingTransactionId || undefined}
                    warningMessage={retentionReadOnlyMessage}
                    currentBalance={totals.efectivo}
                    readOnly={!!retentionReadOnlyMessage || caja?.estado !== 'abierta'}
                    onSuccess={() => {
                        close();
                        setEditingTransactionId(null);
                        queryClient.invalidateQueries({ queryKey: ['transactions', cajaId] });
                        queryClient.invalidateQueries({ queryKey: ['caja', cajaId] });
                        if (editingTransactionId) {
                            queryClient.invalidateQueries({ queryKey: ['transaction_detail', editingTransactionId] });
                        }
                    }}
                    onCancel={() => { close(); setEditingTransactionId(null); }}
                />
            </AppDrawer>

            <AppDrawer
                opened={retentionOpened}
                onClose={() => { closeRetention(); setRetentionTransactionId(null); }}
                title="Comprobante de Retención"
                size="xl"
            >
                {retentionTransactionId && (
                    <RetentionForm
                        transactionId={retentionTransactionId}
                        onSuccess={() => {
                            closeRetention();
                            setRetentionTransactionId(null);
                            queryClient.invalidateQueries({ queryKey: ['transactions', cajaId] });
                        }}
                        onCancel={() => { closeRetention(); setRetentionTransactionId(null); }}
                        readOnly={caja?.estado !== 'abierta'}
                    />
                )}
            </AppDrawer>

            <LegalizationDrawer
                opened={legalizationOpened}
                onClose={closeLegalization}
                cajaId={cajaId}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['transactions', cajaId] });
                    queryClient.invalidateQueries({ queryKey: ['caja', cajaId] });
                }}
            />

            <TransactionNovedadesDrawer
                opened={novedadesOpened}
                onClose={() => { closeNovedades(); setSelectedTransactionForNovedades(null); }}
                transactionId={selectedTransactionForNovedades?.id || null}
                transactionDetail={selectedTransactionForNovedades ?
                    `${selectedTransactionForNovedades.proveedor?.nombre || 'Gasto'} - $${selectedTransactionForNovedades.total_factura}` :
                    undefined
                }
            />

            <CajaReport ref={componentRef} caja={caja} transactions={transactions} totals={totals} />

            <CierreCajaModal
                opened={closingOpened}
                close={closeClosing}
                caja={caja}
                totals={totals}
                readOnly={isClosingInReadOnlyMode}
                onSuccess={() => {
                    closeClosing();
                    modals.open({
                        title: <Text fw={700}>¡Cierre Exitoso!</Text>,
                        centered: true,
                        children: (
                            <Stack gap="md">
                                <Text size="sm">La caja ha sido finalizada correctamente con el arqueo verificado.</Text>
                                <Button leftSection={<IconPrinter size={16} />} onClick={() => { modals.closeAll(); setTimeout(handlePrint, 500); }} fullWidth>
                                    Imprimir Reporte
                                </Button>
                                <Button variant="light" color="gray" onClick={() => modals.closeAll()} fullWidth>Cerrar</Button>
                            </Stack>
                        )
                    });
                }}
            />

            <RetencionesRecaudacionDrawer
                opened={retencionesControlOpened}
                onClose={closeRetencionesControl}
                cajaId={cajaId}
                sucursal={caja?.sucursal}
            />

            <ArqueoControlModal
                opened={arqueoControlOpened}
                onClose={closeArqueoControl}
                cajaId={cajaId}
                sucursal={caja?.sucursal}
                efectivoEsperado={totals.efectivo}
            />
        </Stack>
    );
}
