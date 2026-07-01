import { useState, useEffect } from 'react';
import { Stack, Group, ActionIcon, Title, Text, Tooltip, Button, Alert, PillsInput, Pill, Menu, Skeleton, Paper, ThemeIcon, Badge } from '@mantine/core';
import { IconArrowLeft, IconSearch, IconFilter, IconReceipt, IconLock, IconBuildingBank, IconPrinter, IconAlertTriangle, IconCash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { MonthlyCloseAlert } from '../MonthlyCloseAlert';
import { useAppConfig } from '../../hooks/useAppConfig';
import { useDebouncedCallback } from '@mantine/hooks';

interface CajaHeaderProps {
    caja: any;
    onBack?: () => void;
    isLowBalance: boolean;
    percentageRemaining: number;
    totalDepositos: number;
    filterState: any;
    setFilterState: (fn: (prev: any) => any) => void;
    TIPO_LABELS: Record<string, string>;
    openLegalization: () => void;
    handleCloseCaja: () => void;
    openDeposito: () => void;
    handlePrint: () => void;
    openVerUltimoArqueo: () => void;
    isError?: boolean;
    error?: any;
    isReadOnly?: boolean;
    loading?: boolean;
}

export function CajaHeader({
    caja,
    onBack,
    isLowBalance,
    percentageRemaining,
    totalDepositos,
    filterState,
    setFilterState,
    TIPO_LABELS,
    openLegalization,
    handleCloseCaja,
    openDeposito,
    handlePrint,
    openVerUltimoArqueo,
    isError,
    error,
    isReadOnly,
    loading
}: CajaHeaderProps) {
    const { configs, loading: configLoading } = useAppConfig();
    const cierreEnabled = configs.cierre_mensual_obligatorio !== 'false';
    const closingDay = parseInt(configs.dia_cierre_mensual || '28');

    const [localQuery, setLocalQuery] = useState(filterState.query || '');

    useEffect(() => {
        if (!filterState.query) {
            setLocalQuery('');
        }
    }, [filterState.query]);

    const handleSearchDebounced = useDebouncedCallback((val: string) => {
        setFilterState(p => ({ ...p, query: val }));
    }, 500);

    return (
        <Stack gap="md" className="no-print">
            <Group align="center" justify="space-between" gap="sm">
                <Group align="center" gap="md" style={{ flex: 1 }}>
                    {onBack && (
                        <ActionIcon variant="subtle" color="gray" size="xl" radius="xl" onClick={onBack}>
                            <IconArrowLeft size={24} />
                        </ActionIcon>
                    )}
                    <div style={{ flex: 1 }}>
                        {loading ? (
                            <Stack gap={4}>
                                <Skeleton height={32} width={250} radius="md" />
                                <Skeleton height={16} width={300} radius="xs" />
                            </Stack>
                        ) : (
                            <>
                                <Group gap="sm" align="center">
                                    <Title order={1} size="h2" fw={800} style={{ lineHeight: 1 }}>{caja?.sucursal || 'Caja'} #{caja?.numero ?? caja?.id}</Title>
                                    <Badge color={caja?.estado === 'abierta' ? 'green' : 'gray'} variant="light" size="sm">
                                        {caja?.estado === 'abierta' ? 'ABIERTA' : 'CERRADA'}
                                    </Badge>
                                    {isLowBalance && (
                                        <Badge color="orange" variant="filled" leftSection={<IconAlertTriangle size={12} />} size="sm">
                                            SALDO BAJO
                                        </Badge>
                                    )}
                                </Group>
                                <Text size="sm" c="dimmed" mt={8}>
                                    <Text span fw={600} c="dark.3">{caja?.responsable}</Text>
                                    <Text span mx={6}>·</Text>
                                    Apertura: {dayjs(caja?.fecha_apertura).format('DD MMM YYYY')}
                                    {caja?.fecha_cierre && (
                                        <>
                                            <Text span mx={6}>·</Text>
                                            <Text span c="red.7" fw={600}>Cierre: {dayjs(caja.fecha_cierre).format('DD MMM YYYY')}</Text>
                                        </>
                                    )}
                                </Text>
                            </>
                        )}
                    </div>
                </Group>

            </Group>
            {!configLoading && <MonthlyCloseAlert enabled={cierreEnabled} closingDay={closingDay} />}
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
                            <PillsInput.Field 
                                placeholder={filterState.tipo ? "" : "Buscar por proveedor, RUC o factura..."} 
                                value={localQuery} 
                                onChange={(e) => {
                                    const val = e.currentTarget.value;
                                    setLocalQuery(val);
                                    handleSearchDebounced(val);
                                }} 
                            />
                        </Pill.Group>
                    </PillsInput>
                </Group>

                <Group gap="sm" align="center">
                    {caja?.estado === 'abierta' && !isReadOnly && (
                        <>
                            <Tooltip label="Legalizar Gastos [L]" withArrow radius="md">
                                <Button variant="light" color="orange" h={36} leftSection={<IconReceipt size={16} />} onClick={openLegalization}>
                                    Legalizar
                                </Button>
                            </Tooltip>
                            <Button variant="filled" color="red" h={36} leftSection={<IconLock size={16} />} onClick={handleCloseCaja}>
                                Cerrar Caja
                            </Button>
                        </>
                    )}
                    
                    <ActionIcon.Group>
                        {caja?.estado === 'abierta' && !isReadOnly && (
                            <Tooltip label="Registrar Depósito [D]" withArrow position="bottom">
                                <ActionIcon variant="default" size={36} onClick={openDeposito} c="green.7">
                                    <IconBuildingBank size={18} />
                                </ActionIcon>
                            </Tooltip>
                        )}
                        <Tooltip label="Ver Último Arqueo" withArrow position="bottom">
                            <ActionIcon variant="default" size={36} onClick={openVerUltimoArqueo} c="teal.7">
                                <IconCash size={18} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Imprimir Reporte [P]" withArrow position="bottom">
                            <ActionIcon variant="default" size={36} onClick={handlePrint} c="blue.7">
                                <IconPrinter size={18} />
                            </ActionIcon>
                        </Tooltip>
                    </ActionIcon.Group>
                </Group>
            </Group>
        </Stack>
    );
}
