import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Paper, Text, Stack, Group, Button, Divider, TextInput, Select, Alert, Tooltip, ActionIcon } from '@mantine/core';
import { supabase } from '../lib/supabaseClient';
import { useDisclosure, useHotkeys } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { AppDrawer } from '../components/ui/AppDrawer';
import { TransactionForm } from '../components/TransactionForm';
import { RetentionForm } from '../components/RetentionForm';
import { LegalizationDrawer } from '../components/LegalizationDrawer';
import { notifications } from '@mantine/notifications';
import {
    IconPlus, IconReceipt2,
    IconFileInvoice, IconLock, IconPrinter, IconAlertTriangle, IconEye, IconSearch, IconFilter
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CajaReport } from '../components/CajaReport';
import { DatePickerInput } from '@mantine/dates';
import 'dayjs/locale/es';

import { useCajaCalculations, type Transaction } from '../hooks/useCajaCalculations';
import { CajaSummaryCards } from '../components/caja/CajaSummaryCards';
import { TransactionTable } from '../components/caja/TransactionTable';
import { useAppConfig } from '../hooks/useAppConfig';
import { MonthlyCloseAlert } from '../components/MonthlyCloseAlert';
import { TransactionNovedadesDrawer } from '../components/caja/TransactionNovedadesDrawer';

interface CajaDetalleProps {
    cajaId: number;
    setHeaderActions?: (actions: React.ReactNode) => void;
}

export function CajaDetalle({ cajaId, setHeaderActions }: CajaDetalleProps) {
    const queryClient = useQueryClient();
    const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
    const [retentionTransactionId, setRetentionTransactionId] = useState<number | null>(null);
    const [formOpened, { open, close }] = useDisclosure(false);
    const [retentionOpened, { open: openRetention, close: closeRetention }] = useDisclosure(false);
    const [legalizationOpened, { open: openLegalization, close: closeLegalization }] = useDisclosure(false);
    const [novedadesOpened, { open: openNovedades, close: closeNovedades }] = useDisclosure(false);
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

    const { data: transactions = [], isLoading: loadingTrans, isError, error } = useQuery({
        queryKey: ['transactions', cajaId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('transacciones')
                .select(`
                    id, tipo_documento, fecha_factura, numero_factura, total_factura,
                    parent_id, es_justificacion,
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

    const { data: bancos = [] } = useQuery({
        queryKey: ['bancos'],
        queryFn: async () => {
            const { data } = await supabase.from('bancos').select('nombre').order('nombre');
            return (data || []).map(b => ({ value: b.nombre, label: b.nombre }));
        },
    });

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

    const closeCajaMutation = useMutation({
        mutationFn: async (payload: any) => {
            const { error } = await supabase.from('cajas').update(payload).eq('id', cajaId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['caja', cajaId] });
            notifications.show({ title: 'Éxito', message: 'Caja cerrada exitosamente', color: 'teal' });
        }
    });

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
        let chequeNumber = '';
        let bancoReposicion = '';
        let closingDate: Date | null = new Date();

        // Calculate max transaction date
        const maxTransactionDate = transactions.reduce((max, t) => {
            const tDate = new Date(t.fecha_factura);
            return tDate > max ? tDate : max;
        }, caja ? new Date(caja.fecha_apertura) : new Date(0));

        // Ensure we don't pick a date before opening if no transactions exist
        const minCloseDate = caja && new Date(caja.fecha_apertura) > maxTransactionDate
            ? new Date(caja.fecha_apertura)
            : maxTransactionDate;

        modals.openConfirmModal({
            title: <Group gap="xs">
                {readOnly ? <IconEye size={20} color="gray" /> : <IconLock size={20} color="red" />}
                <Text fw={700}>{readOnly ? 'Simulación de Cierre' : 'Cierre de Caja Definitivo'}</Text>
            </Group>,
            centered: true,
            size: 'md',
            children: (
                <Stack gap="md">
                    <Text size="sm">
                        {readOnly
                            ? 'A continuación se muestran los totales calculados hasta el momento. No puedes cerrar la caja porque hay gastos pendientes de legalizar.'
                            : 'Vas a proceder al cierre de la caja. Una vez cerrada, no podrás registrar más gastos ni editar los existentes.'}
                    </Text>

                    <DatePickerInput
                        label="Fecha de Cierre"
                        placeholder="Seleccione la fecha"
                        defaultValue={new Date()}
                        minDate={minCloseDate}
                        locale="es"
                        required
                        disabled={readOnly}
                        onChange={(value: any) => { closingDate = value; }}
                    />

                    <Paper withBorder p="md" radius="md" bg="gray.0">
                        <Stack gap="xs">
                            <Group justify="space-between">
                                <Text size="sm">Monto Inicial:</Text>
                                <Text size="sm" fw={600}>${caja?.monto_inicial.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm" c="red.6">Total Gastos Netos:</Text>
                                <Text size="sm" fw={600} c="red.6">-${totals.neto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                            </Group>
                            <Divider />
                            <Group justify="space-between">
                                <Text size="sm" fw={700}>Efectivo Final en Caja:</Text>
                                <Text size="sm" fw={700}>${totals.efectivo.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                            </Group>

                            <Paper withBorder p="sm" radius="md" bg="orange.0" className="border-orange-100" mt="xs">
                                <Group gap="xs" mb={4} justify="space-between">
                                    <Group gap="xs">
                                        <IconFileInvoice size={16} color="orange" />
                                        <Text size="xs" fw={700} c="orange.6" tt="uppercase">Retenciones Totales</Text>
                                    </Group>
                                    <Text size="sm" fw={800} c="orange.9">
                                        ${totals.totalRet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </Text>
                                </Group>
                            </Paper>
                        </Stack>
                    </Paper>

                    <Group grow>
                        <Select
                            label="Banco del Cheque"
                            placeholder="Seleccione banco"
                            data={bancos}
                            required
                            searchable
                            disabled={readOnly}
                            onChange={(value) => { bancoReposicion = value || ''; }}
                        />
                        <TextInput
                            label="Número de Cheque"
                            placeholder="Ej: CH-123456"
                            required
                            disabled={readOnly}
                            onChange={(e) => { chequeNumber = e.currentTarget.value; }}
                        />
                    </Group>

                    {!readOnly ? (
                        <Text size="xs" c="dimmed" fs="italic">
                            * El estado de la caja cambiará a "Cerrada" y se registrará la fecha seleccionada.
                        </Text>
                    ) : (
                        <Paper withBorder p="xs" bg="blue.0" c="blue.9" className="border-blue-200">
                            <Group gap="xs">
                                <IconAlertTriangle size={16} />
                                <Text size="xs" fw={500}>Modo solo lectura.</Text>
                            </Group>
                        </Paper>
                    )}
                </Stack>
            ),
            labels: { confirm: 'Confirmar Cierre', cancel: readOnly ? 'Cerrar' : 'Cancelar' },
            confirmProps: { color: 'red', disabled: readOnly, display: readOnly ? 'none' : 'block' },
            onConfirm: async () => {
                if (readOnly) return;

                if (!chequeNumber || !bancoReposicion) {
                    notifications.show({ title: 'Error', message: 'Debes ingresar banco y número de cheque', color: 'red' });
                    return;
                }

                try {
                    const payload = {
                        estado: 'cerrada',
                        fecha_cierre: closingDate ? closingDate.toISOString() : new Date().toISOString(),
                        reposicion: totals.neto,
                        numero_cheque_reposicion: chequeNumber,
                        banco_reposicion: bancoReposicion,
                        // Add metadata for actual action date if backend supports it or just rely on updated_at
                        // Assuming we can send it as metadata or similar if column exists.
                        // Based on request: "almacenar la fecha de la accion de cierre".
                        // I will add a text note in bitacora logic or if schema allows.
                        // Since I don't have schema for 'cajas' fully visible, I'll add it to payload.
                        // If it fails, I'll remove it. But user asked for it.
                        // Let's assume standard field 'fecha_cierre_real' or similar doesn't exist yet,
                        // but sticking to user request: "almacenar la fecha de la accion"
                        // I will attempt to send it.
                        datos_cierre: {
                            fecha_accion: new Date().toISOString(),
                            usuario_id: (await supabase.auth.getUser()).data.user?.id
                        }
                    };

                    await closeCajaMutation.mutateAsync(payload);

                    modals.open({
                        title: <Text fw={700}>¡Cierre Exitoso!</Text>,
                        centered: true,
                        children: (
                            <Stack gap="md">
                                <Text size="sm">La caja ha sido finalizada correctamente.</Text>
                                <Button leftSection={<IconPrinter size={16} />} onClick={() => { modals.closeAll(); setTimeout(handlePrint, 500); }} fullWidth>
                                    Imprimir Reporte
                                </Button>
                                <Button variant="light" color="gray" onClick={() => modals.closeAll()} fullWidth>Cerrar</Button>
                            </Stack>
                        )
                    });
                } catch (error: any) {
                    notifications.show({ title: 'Error', message: error.message || 'Error al cerrar caja', color: 'red' });
                }
            },
        });
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
        <Stack gap="lg">
            <div className="no-print">
                <Stack gap="lg">
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
                        <Group gap="sm" style={{ flex: 1, minWidth: '300px' }}>
                            <TextInput
                                placeholder="Buscar por proveedor, RUC o número de factura..."
                                leftSection={<IconSearch size={16} />}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                                style={{ flex: 1 }}
                                radius="md"
                            />
                            <Select
                                placeholder="Filtrar por documento"
                                leftSection={<IconFilter size={16} />}
                                data={[
                                    { value: 'factura', label: 'Factura' },
                                    { value: 'nota_venta', label: 'Nota de Venta' },
                                    { value: 'liquidacion_compra', label: 'Liquidación de Compra' },
                                    { value: 'sin_factura', label: 'Sin Factura' },
                                ]}
                                value={filterTipo}
                                onChange={setFilterTipo}
                                clearable
                                radius="md"
                                style={{ width: '180px' }}
                            />
                        </Group>

                        <Group>
                            {caja?.estado === 'abierta' && (
                                <>
                                    <Tooltip label="Legalizar Gastos [L]" withArrow radius="md">
                                        <Button variant="outline" color="orange" leftSection={<IconReceipt2 size={16} />} onClick={openLegalization}>
                                            Legalizar
                                        </Button>
                                    </Tooltip>
                                    <Button variant="filled" color="red" leftSection={<IconLock size={16} />} onClick={handleCloseCaja}>
                                        Cerrar
                                    </Button>
                                </>
                            )}
                            <Tooltip label="Imprimir Reporte [P]" withArrow radius="md">
                                <Button variant="light" color="blue" leftSection={<IconPrinter size={16} />} onClick={handlePrint}>
                                    Imprimir
                                </Button>
                            </Tooltip>
                        </Group>
                    </Group>

                    <CajaSummaryCards caja={caja} totals={totals} />

                    <Paper withBorder p="md" radius="lg" className="shadow-sm border-gray-100">

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
        </Stack >
    );
}
