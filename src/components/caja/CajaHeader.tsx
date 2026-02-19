
import { Stack, Group, ActionIcon, Title, Text, Tooltip, Button, Alert, PillsInput, Pill, Menu } from '@mantine/core';
import { IconArrowLeft, IconSearch, IconFilter, IconReceipt, IconLock, IconBuildingBank, IconPrinter, IconAlertTriangle } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { MonthlyCloseAlert } from '../MonthlyCloseAlert';

interface CajaHeaderProps {
    caja: any;
    onBack?: () => void;
    isLowBalance: boolean;
    percentageRemaining: number;
    montoInicialNeto: number;
    totalDepositos: number;
    filterState: any;
    setFilterState: (fn: (prev: any) => any) => void;
    TIPO_LABELS: Record<string, string>;
    openLegalization: () => void;
    handleCloseCaja: () => void;
    openDeposito: () => void;
    handlePrint: () => void;
    isError?: boolean;
    error?: any;
}

export function CajaHeader({
    caja,
    onBack,
    isLowBalance,
    percentageRemaining,
    montoInicialNeto,
    totalDepositos,
    filterState,
    setFilterState,
    TIPO_LABELS,
    openLegalization,
    handleCloseCaja,
    openDeposito,
    handlePrint,
    isError,
    error
}: CajaHeaderProps) {
    return (
        <Stack gap="md" className="no-print">
            <Group align="center" gap="sm">
                {onBack && (
                    <ActionIcon variant="subtle" color="gray" size="lg" radius="xl" onClick={onBack}><IconArrowLeft size={20} /></ActionIcon>
                )}
                <div>
                    <Title order={2} fw={700}>{caja?.sucursal || 'Caja'} #{caja?.numero ?? caja?.id}</Title>
                    <Text size="sm" c="dimmed">
                        {caja?.responsable} · Apertura: {dayjs(caja?.fecha_apertura).format('DD/MM/YYYY')}
                        {caja?.fecha_cierre && ` · Cierre: ${dayjs(caja.fecha_cierre).format('DD/MM/YYYY')}`}
                    </Text>
                </div>
            </Group>
            <MonthlyCloseAlert />
            {isLowBalance && (
                <Alert variant="light" color="orange" title="Saldo de Caja Bajo" icon={<IconAlertTriangle size={18} />} radius="md" mb="md">
                    <Text size="sm">
                        Solo queda un <b>{percentageRemaining.toFixed(1)}%</b> disponible del efectivo operativo (${montoInicialNeto.toLocaleString()}).
                        <br />
                        <Text span size="xs" c="dimmed">(Inicial: ${caja?.monto_inicial?.toLocaleString()} - Depósitos: ${totalDepositos.toLocaleString()})</Text>
                    </Text>
                </Alert>
            )}
            {isError && (
                <Alert variant="light" color="red" title="Error al cargar transacciones" icon={<IconAlertTriangle size={18} />} radius="md">
                    <Text size="sm">{error instanceof Error ? error.message : 'Ha ocurrido un error desconocido'}</Text>
                </Alert>
            )}

            <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
                <Group gap="xs" style={{ flex: 1, minWidth: '300px' }}>
                    <PillsInput radius="md" style={{ flex: 1 }} leftSection={<IconSearch size={16} />} rightSection={
                        <Menu position="bottom-end" shadow="sm" width={220} withArrow transitionProps={{ transition: 'pop-top-right' }}>
                            <Menu.Target>
                                <ActionIcon variant="subtle" color={filterState.tipo ? 'blue' : 'gray'} radius="md"><IconFilter size={18} /></ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Label>Filtrar por Documento</Menu.Label>
                                <Menu.Divider />
                                {Object.entries(TIPO_LABELS).map(([val, label]) => (
                                    <Menu.Item key={val} onClick={() => setFilterState(p => ({ ...p, tipo: val }))} bg={filterState.tipo === val ? 'blue.0' : undefined} c={filterState.tipo === val ? 'blue.7' : undefined}>
                                        {label}
                                    </Menu.Item>
                                ))}
                                {filterState.tipo && (
                                    <><Menu.Divider /><Menu.Item color="red" onClick={() => setFilterState(p => ({ ...p, tipo: null }))}>Limpiar Filtro</Menu.Item></>
                                )}
                            </Menu.Dropdown>
                        </Menu>
                    }
                    >
                        <Pill.Group>
                            {filterState.tipo && (
                                <Pill withRemoveButton onRemove={() => setFilterState(p => ({ ...p, tipo: null }))} size="sm" color="blue">{TIPO_LABELS[filterState.tipo]}</Pill>
                            )}
                            <PillsInput.Field placeholder={filterState.tipo ? "" : "Buscar por proveedor, RUC o factura..."} value={filterState.query} onChange={(e) => setFilterState(p => ({ ...p, query: e.currentTarget.value }))} />
                        </Pill.Group>
                    </PillsInput>
                </Group>

                <Group>
                    {caja?.estado === 'abierta' && (
                        <>
                            <Tooltip label="Legalizar Gastos [L]" withArrow radius="md"><Button variant="outline" color="orange" leftSection={<IconReceipt size={16} />} onClick={openLegalization}>Legalizar</Button></Tooltip>
                            <Button variant="filled" color="red" leftSection={<IconLock size={16} />} onClick={handleCloseCaja}>Cerrar Caja</Button>
                            <Tooltip label="Registrar Depósito [D]" withArrow radius="md"><ActionIcon variant="light" color="green" onClick={openDeposito} size="lg" radius="md"><IconBuildingBank size={20} /></ActionIcon></Tooltip>
                        </>
                    )}
                    <Tooltip label="Imprimir Reporte [P]" withArrow radius="md" position="bottom"><ActionIcon variant="light" color="blue" size="lg" radius="md" onClick={handlePrint}><IconPrinter size={18} /></ActionIcon></Tooltip>
                </Group>
            </Group>
        </Stack>
    );
}
