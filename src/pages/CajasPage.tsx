import { useState, useEffect } from 'react';
import { Paper, Text, SimpleGrid, Title, Stack, SegmentedControl, Group, Menu, Button } from '@mantine/core';
import { AppLoader } from '../components/ui/AppLoader';
import { IconChevronDown, IconMapPin } from '@tabler/icons-react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAppConfig } from '../hooks/useAppConfig';
import { CajaCard } from '../components/caja/CajaCard';
import { AperturaCajaModal } from '../components/caja/AperturaCajaModal';
import { useQueryClient } from '@tanstack/react-query';
import { useEmpresa } from '../context/EmpresaContext';
import IconReceipt from '../assets/Icon.svg';

interface CajasPageProps {
    opened: boolean;
    close: () => void;
    onSelectCaja: (id: number) => void;
}

interface Caja {
    id: number;
    created_at: string;
    saldo_anterior: number;
    reposicion: number;
    monto_inicial: number;
    fecha_apertura: string;
    fecha_cierre: string | null;
    responsable: string;
    sucursal: string;
    estado: 'abierta' | 'cerrada';
    saldo_actual: number;
    total_gastos: number;
    total_depositos: number;
    total_retenido_recaudado: number;
    numero?: number;
}

export function CajasPage({ opened, close, onSelectCaja }: CajasPageProps) {
    const queryClient = useQueryClient();
    const { configs } = useAppConfig();
    const alertThreshold = parseInt(configs.porcentaje_alerta_caja || '15');
    const [filter, setFilter] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const urlFilter = params.get('estado');
        return (urlFilter && ['abiertas', 'cerradas'].includes(urlFilter)) ? urlFilter : 'abiertas';
    });
    const [filterSucursal, setFilterSucursal] = useState<string | null>(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('sucursal');
    });
    const [limit, setLimit] = useState(12);

    // Reset limit on filter change
    useEffect(() => {
        setLimit(12);
    }, [filter, filterSucursal]);

    // PERSISTENCIA: Sincronizar filtros con la URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        if (filter !== 'abiertas') {
            params.set('estado', filter);
        } else {
            params.delete('estado');
        }

        if (filterSucursal) {
            params.set('sucursal', filterSucursal);
        } else {
            params.delete('sucursal');
        }

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, '', newUrl);
    }, [filter, filterSucursal]);

    const { empresa, loading: empresaLoading, isReadOnly, sucursalesAsignadas, role } = useEmpresa();

    const { data: cajas = [], isLoading: fetching } = useQuery({
        queryKey: ['cajas', empresa?.id, filter, filterSucursal, limit, sucursalesAsignadas, role],
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60, // 1 minuto de datos "frescos"
        gcTime: 1000 * 60 * 5, // Mantener en memoria 5 minutos
        queryFn: async () => {
            if (!empresa) return [];
            try {
                let query = supabase
                    .from('v_cajas_con_saldo')
                    .select('*')
                    .eq('empresa_id', empresa.id)
                    .eq('estado', filter === 'abiertas' ? 'abierta' : 'cerrada')
                    .order('id', { ascending: false })
                    .limit(limit);
                
                if (role !== 'owner' && role !== 'admin') {
                    if (!sucursalesAsignadas || sucursalesAsignadas.length === 0) {
                        return [];
                    }
                    query = query.in('sucursal', sucursalesAsignadas);
                }

                if (filterSucursal) {
                    query = query.eq('sucursal', filterSucursal);
                }

                const { data, error } = await query;

                if (error) {
                    console.warn('Fallback a tabla base + cálculo manual:', error);
                    let baseQuery = supabase
                        .from('cajas')
                        .select('*')
                        .eq('empresa_id', empresa.id)
                        .eq('estado', filter === 'abiertas' ? 'abierta' : 'cerrada')
                        .order('id', { ascending: false })
                        .limit(limit);

                    if (role !== 'owner' && role !== 'admin') {
                        if (!sucursalesAsignadas || sucursalesAsignadas.length === 0) {
                            return [];
                        }
                        baseQuery = baseQuery.in('sucursal', sucursalesAsignadas);
                    }

                    if (filterSucursal) baseQuery = baseQuery.eq('sucursal', filterSucursal);

                    const { data: baseData, error: baseError } = await baseQuery;

                    if (baseError) throw baseError;

                    // Fetch transactions for manual calculation
                    const { data: transData } = await supabase
                        .from('transacciones')
                        .select('caja_id, tipo_documento, total_factura')
                        .in('caja_id', (baseData || []).map(c => c.id));

                    return (baseData || []).map(c => {
                        const cTrans = transData?.filter(t => t.caja_id === c.id) || [];
                        const total_depositos = cTrans.filter(t => t.tipo_documento === 'deposito').reduce((sum, t) => sum + t.total_factura, 0);
                        const total_gastos = cTrans.filter(t => t.tipo_documento !== 'deposito').reduce((sum, t) => sum + t.total_factura, 0);
                        const total_retenido_recaudado = 0;
                        const saldo_actual = c.monto_inicial - (total_gastos - total_retenido_recaudado) - total_depositos;

                        return { ...c, total_gastos, total_depositos, total_retenido_recaudado, saldo_actual };
                    });
                }
                return data || [];
            } catch (error) {
                console.error('Error in cajas query:', error);
                throw error;
            }
        },
        enabled: !!empresa
    });

    const { data: sucursalesList = [] } = useQuery({
        queryKey: ['sucursales_names', empresa?.id, role, sucursalesAsignadas],
        queryFn: async () => {
            if (!empresa) return [];
            const { data } = await supabase
                .from('sucursales')
                .select('nombre')
                .eq('empresa_id', empresa.id)
                .order('nombre');
            
            const allSucursales = (data || []).map(s => s.nombre);
            if (role !== 'owner' && role !== 'admin') {
                return allSucursales.filter(s => sucursalesAsignadas?.includes(s));
            }
            return allSucursales;
        },
        enabled: !!empresa
    });

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="center" wrap="wrap">
                <Menu shadow="md" width={200} trigger="click" withinPortal transitionProps={{ transition: 'pop-top-left' }}>
                    <Menu.Target>
                        <Group gap={12} style={{ cursor: 'pointer' }} className="hover:opacity-80 transition-opacity">
                            <Group gap={12} align="center">
                                <img src={IconReceipt} alt="Cajas" width="40" height="40" style={{ display: 'block', flexShrink: 0 }} />
                                {/* Desktop */}
                                <Stack gap={1} visibleFrom="sm" style={{ minWidth: 0 }}>
                                    <Group gap={5} align="baseline" wrap="nowrap">
                                        <Title order={3} size="h4" fw={700} c={filterSucursal ? 'blue.7' : undefined} lh={1.15}>
                                            {filterSucursal ?? 'Cajas'}
                                        </Title>
                                        <Text
                                            fz="sm" c="dimmed" fw={500}
                                            style={{ visibility: (!fetching && cajas.length > 0) ? 'visible' : 'hidden' }}
                                        >
                                            ({cajas.length})
                                        </Text>
                                    </Group>
                                    <Text fz="xs" fw={600} tt="uppercase" lh={1.1}
                                        c={filter !== 'abiertas' ? 'orange.6' : 'teal.6'}
                                    >
                                        {filter === 'abiertas' ? 'Abiertas' : 'Cerradas'}
                                    </Text>
                                </Stack>
                                {/* Mobile */}
                                <Stack gap={1} hiddenFrom="sm" style={{ minWidth: 0 }}>
                                    <Group gap={4} align="baseline" wrap="nowrap">
                                        <Title order={4} size="h5" fw={700} c={filterSucursal ? 'blue.7' : undefined} lh={1.15}>
                                            {filterSucursal ?? 'Cajas'}
                                        </Title>
                                        <Text
                                            fz="xs" c="dimmed" fw={500}
                                            style={{ visibility: (!fetching && cajas.length > 0) ? 'visible' : 'hidden' }}
                                        >
                                            ({cajas.length})
                                        </Text>
                                    </Group>
                                    <Text fz="xs" fw={600} tt="uppercase" lh={1.1}
                                        c={filter !== 'abiertas' ? 'orange.6' : 'teal.6'}
                                    >
                                        {filter === 'abiertas' ? 'Abiertas' : 'Cerradas'}
                                    </Text>
                                </Stack>
                            </Group>
                            <IconChevronDown
                                size={20}
                                className={(filterSucursal || filter !== 'abiertas') ? 'text-blue-500' : 'text-gray-400'}
                            />
                        </Group>
                    </Menu.Target>

                    <Menu.Dropdown>
                        <Menu.Label>Filtrar por Sucursal</Menu.Label>
                        <Menu.Item
                            leftSection={<IconMapPin size={16} />}
                            onClick={() => setFilterSucursal(null)}
                            fw={!filterSucursal ? 700 : 400}
                            color={!filterSucursal ? 'blue' : undefined}
                        >
                            Todas
                        </Menu.Item>
                        <Menu.Divider />
                        {sucursalesList.map((suc: string) => (
                            <Menu.Item
                                key={suc}
                                leftSection={<IconMapPin size={16} />}
                                onClick={() => setFilterSucursal(suc)}
                                fw={filterSucursal === suc ? 700 : 400}
                                color={filterSucursal === suc ? 'blue' : undefined}
                            >
                                {suc}
                            </Menu.Item>
                        ))}
                    </Menu.Dropdown>
                </Menu>
                <SegmentedControl
                    value={filter}
                    onChange={setFilter}
                    radius="xl"
                    size="sm"
                    color="blue"
                    data={[
                        { value: 'abiertas', label: 'Abiertas' },
                        { value: 'cerradas', label: 'Cerradas' },
                    ]}
                />
            </Group>
            {((fetching || empresaLoading) && cajas.length === 0) ? (
                <AppLoader py={100} size="xl" message="Cargando tus cajas..." />
            ) : (
                <div style={{ position: 'relative' }}>
                    {fetching && cajas.length > 0 && <AppLoader variant="bar" />}
                    {cajas.length === 0 ? (
                        <Paper p="xl" withBorder radius="md" ta="center">
                            <Text c="dimmed">No hay cajas {filter === 'abiertas' ? 'abiertas' : 'cerradas'}</Text>
                        </Paper>
                    ) : (
                        <Stack gap="xl" align="center">
                            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" w="100%">
                                {cajas.map((caja: Caja) => (
                                    <CajaCard
                                        key={caja.id}
                                        caja={caja}
                                        alertThreshold={alertThreshold}
                                        onSelectCaja={onSelectCaja}
                                        onDelete={() => queryClient.invalidateQueries({ queryKey: ['cajas'] })}
                                        isReadOnly={isReadOnly}
                                    />
                                ))}
                            </SimpleGrid>
                            
                            {cajas.length >= limit && (
                                <Button 
                                    variant="subtle" 
                                    color="gray" 
                                    onClick={() => setLimit(prev => prev + 12)}
                                    loading={fetching}
                                >
                                    Cargar más cajas
                                </Button>
                            )}
                        </Stack>
                    )}
                </div>
            )}

            <AperturaCajaModal opened={opened} close={close} />
        </Stack>
    );
}
