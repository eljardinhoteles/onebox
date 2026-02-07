import { useState, useEffect } from 'react';
import { Paper, Title, Text, Stack, Group, Button, Divider, TextInput, Select, Alert, Tooltip, ActionIcon } from '@mantine/core';
import { supabase } from '../lib/supabaseClient';
import { useDisclosure, useHotkeys } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { AppDrawer } from '../components/ui/AppDrawer';
import { TransactionForm } from '../components/TransactionForm';
import { RetentionForm } from '../components/RetentionForm';
import { LegalizationDrawer } from '../components/LegalizationDrawer';
import { notifications } from '@mantine/notifications';
import {
    IconPlus, IconReceipt2, IconCheck,
    IconFileInvoice, IconLock, IconFileDescription, IconPrinter, IconAlertTriangle, IconEye
} from '@tabler/icons-react';
import { CajaReport } from '../components/CajaReport';
import { DatePickerInput } from '@mantine/dates';
import 'dayjs/locale/es';

import { useCajaCalculations, type Transaction } from '../hooks/useCajaCalculations';
import { CajaSummaryCards } from '../components/caja/CajaSummaryCards';
import { TransactionTable } from '../components/caja/TransactionTable';
import { useAppConfig } from '../hooks/useAppConfig';
import { MonthlyCloseAlert } from '../components/MonthlyCloseAlert';

interface CajaDetalleProps {
    cajaId: number;
    setHeaderActions?: (actions: React.ReactNode) => void;
}

export function CajaDetalle({ cajaId, setHeaderActions }: CajaDetalleProps) {
    const [caja, setCaja] = useState<any>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [bancos, setBancos] = useState<{ value: string; label: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
    const [retentionTransactionId, setRetentionTransactionId] = useState<number | null>(null);
    const [formOpened, { open, close }] = useDisclosure(false);
    const [retentionOpened, { open: openRetention, close: closeRetention }] = useDisclosure(false);
    const [legalizationOpened, { open: openLegalization, close: closeLegalization }] = useDisclosure(false);
    const { configs } = useAppConfig();
    const alertThreshold = parseInt(configs.porcentaje_alerta_caja || '15');

    const [retentionReadOnlyMessage, setRetentionReadOnlyMessage] = useState<string | null>(null);

    const handlePrint = () => {
        window.print();
    };

    const handleCreate = () => {
        setRetentionReadOnlyMessage(null);
        setEditingTransactionId(null);
        open();
    };

    // Atajos contextuales
    useHotkeys([
        ['n', () => { if (caja?.estado === 'abierta') handleCreate(); }],
        ['l', () => { if (caja?.estado === 'abierta') openLegalization(); }],
        ['p', handlePrint],
    ]);

    const totals = useCajaCalculations(caja, transactions);
    const percentageRemaining = caja ? (totals.efectivo / caja.monto_inicial) * 100 : 100;
    const isLowBalance = percentageRemaining <= alertThreshold && caja?.estado === 'abierta';

    const fetchData = async () => {
        setLoading(true);
        try {
            const [cajaResponse, transResponse] = await Promise.all([
                supabase
                    .from('cajas')
                    .select('*')
                    .eq('id', cajaId)
                    .single(),
                supabase
                    .from('transacciones')
                    .select(`
                        id,
                        tipo_documento,
                        fecha_factura,
                        numero_factura,
                        total_factura,
                        parent_id,
                        es_justificacion,
                        proveedor:proveedores (nombre, ruc),
                        retencion:retenciones (id, numero_retencion, total_fuente, total_iva, total_retenido),
                        items:transaccion_items (nombre)
                    `)
                    .eq('caja_id', cajaId)
                    .order('created_at', { ascending: false })
            ]);

            if (cajaResponse.error) throw cajaResponse.error;
            if (transResponse.error) throw transResponse.error;

            setCaja(cajaResponse.data);

            const mappedTrans = (transResponse.data || []).map((t: any) => ({
                ...t,
                proveedor: Array.isArray(t.proveedor) ? t.proveedor[0] : t.proveedor,
                retencion: Array.isArray(t.retencion) ? t.retencion[0] : t.retencion
            }));

            setTransactions(mappedTrans);
        } catch (error) {
            console.error('Error fetching details:', error);
            notifications.show({
                title: 'Error de carga',
                message: 'No se pudieron cargar los datos de la caja',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchBancos = async () => {
        try {
            const { data } = await supabase.from('bancos').select('nombre').order('nombre');
            if (data) {
                setBancos(data.map(b => ({ value: b.nombre, label: b.nombre })));
            }
        } catch (error) {
            console.error('Error fetching banks:', error);
        }
    };

    useEffect(() => {
        fetchData();
        fetchBancos();
    }, [cajaId]);


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
            onConfirm: async () => {
                try {
                    const { error } = await supabase.from('transacciones').delete().eq('id', t.id);
                    if (error) throw error;
                    notifications.show({
                        title: 'Eliminado',
                        message: 'El registro de gasto ha sido eliminado.',
                        color: 'teal',
                        icon: <IconCheck size={16} />,
                    });
                    fetchData();
                } catch (error: any) {
                    notifications.show({
                        title: 'Error',
                        message: error.message || 'No se pudo eliminar el registro',
                        color: 'red',
                    });
                }
            },
        });
    };

    const openClosingModal = (readOnly: boolean = false) => {
        let chequeNumber = '';
        let bancoReposicion = '';
        let closingDate: Date | null = new Date();

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
                        minDate={caja ? new Date(caja.fecha_apertura) : undefined}
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
                    const { error } = await supabase
                        .from('cajas')
                        .update({
                            estado: 'cerrada',
                            fecha_cierre: closingDate ? closingDate.toISOString() : new Date().toISOString(),
                            reposicion: totals.neto,
                            numero_cheque_reposicion: chequeNumber,
                            banco_reposicion: bancoReposicion
                        })
                        .eq('id', cajaId);

                    if (error) throw error;
                    notifications.show({ title: 'Caja Cerrada', message: 'Caja cerrada exitosamente.', color: 'teal' });
                    fetchData();

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
                    <Group justify="flex-end">
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
                        <Group justify="space-between" mb="lg">
                            <Group gap="xs">
                                <IconFileDescription size={20} color="blue" />
                                <Title order={4}>Historial de Transacciones</Title>
                            </Group>
                        </Group>

                        <TransactionTable
                            transactions={transactions}
                            loading={loading}
                            cajaEstado={caja?.estado || 'abierta'}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onRetention={(id) => { setRetentionTransactionId(id); openRetention(); }}
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
                    readOnly={caja?.estado !== 'abierta' || !!retentionReadOnlyMessage}
                    warningMessage={retentionReadOnlyMessage}
                    onSuccess={() => { close(); setEditingTransactionId(null); fetchData(); }}
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
                        onSuccess={() => { closeRetention(); setRetentionTransactionId(null); fetchData(); }}
                        onCancel={() => { closeRetention(); setRetentionTransactionId(null); }}
                        readOnly={caja?.estado !== 'abierta'}
                    />
                )}
            </AppDrawer>

            <LegalizationDrawer
                opened={legalizationOpened}
                onClose={closeLegalization}
                cajaId={cajaId}
                onSuccess={fetchData}
            />

            <CajaReport caja={caja} transactions={transactions} totals={totals} />
        </Stack >
    );
}
