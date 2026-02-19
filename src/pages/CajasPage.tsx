import { useState, useEffect, useMemo } from 'react';
import { Paper, Text, SimpleGrid, Title, Stack, SegmentedControl, Group, Menu } from '@mantine/core';
import { IconChevronDown, IconMapPin } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAppConfig } from '../hooks/useAppConfig';
import { CajaCard } from '../components/caja/CajaCard';
import { AperturaCajaModal } from '../components/caja/AperturaCajaModal';
import { useQueryClient } from '@tanstack/react-query';

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
    numero?: number;
}

export function CajasPage({ opened, close, onSelectCaja }: CajasPageProps) {
    const queryClient = useQueryClient();
    const { configs } = useAppConfig();
    const alertThreshold = parseInt(configs.porcentaje_alerta_caja || '15');
    const [filter, setFilter] = useState('abiertas');
    const [filterSucursal, setFilterSucursal] = useState<string | null>(null);

    // PERSISTENCIA: Cargar filtros desde la URL al montar
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlFilter = params.get('estado');
        const urlSucursal = params.get('sucursal');

        if (urlFilter && ['abiertas', 'cerradas'].includes(urlFilter)) {
            setFilter(urlFilter);
        }
        if (urlSucursal) {
            setFilterSucursal(urlSucursal);
        }
    }, []);

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

    const { data: cajas = [], isLoading: fetching } = useQuery({
        queryKey: ['cajas'],
        queryFn: async () => {
            try {
                const { data, error } = await supabase
                    .from('v_cajas_con_saldo')
                    .select('*')
                    .order('id', { ascending: false });

                if (error) {
                    console.warn('Fallback a tabla base + cálculo manual:', error);
                    const { data: baseData, error: baseError } = await supabase
                        .from('cajas')
                        .select('*')
                        .order('id', { ascending: false });

                    if (baseError) throw baseError;

                    // Fetch transactions for manual calculation
                    const { data: transData } = await supabase
                        .from('transacciones')
                        .select('caja_id, tipo_documento, total_factura')
                        .in('caja_id', (baseData || []).map(c => c.id));


                    // Map retentions if needed, but for now we just need totals

                    return (baseData || []).map(c => {
                        const cTrans = transData?.filter(t => t.caja_id === c.id) || [];

                        const total_depositos = cTrans
                            .filter(t => t.tipo_documento === 'deposito')
                            .reduce((sum, t) => sum + t.total_factura, 0);

                        const gastosTrans = cTrans.filter(t => t.tipo_documento !== 'deposito');
                        const total_gastos = gastosTrans.reduce((sum, t) => sum + t.total_factura, 0);

                        // Simplified calculations for fallback
                        const saldo_actual = c.monto_inicial - total_gastos - total_depositos;

                        return {
                            ...c,
                            total_gastos,
                            total_depositos,
                            saldo_actual
                        };
                    });
                }
                return data || [];
            } catch (error) {
                console.error('Error in cajas query:', error);
                throw error;
            }
        }
    });

    const cajasFiltradasPorSucursal = useMemo(() =>
        filterSucursal ? cajas.filter((c: Caja) => c.sucursal === filterSucursal) : cajas
        , [cajas, filterSucursal]);

    const activasCount = useMemo(() =>
        cajasFiltradasPorSucursal.filter((c: Caja) => c.estado === 'abierta').length
        , [cajasFiltradasPorSucursal]);

    const cerradasCount = useMemo(() =>
        cajasFiltradasPorSucursal.filter((c: Caja) => c.estado === 'cerrada').length
        , [cajasFiltradasPorSucursal]);

    const filteredCajas = useMemo(() =>
        cajas.filter((c: Caja) => {
            const matchesEstado = filter === 'abiertas' ? c.estado === 'abierta' : c.estado === 'cerrada';
            const matchesSucursal = !filterSucursal || c.sucursal === filterSucursal;
            return matchesEstado && matchesSucursal;
        })
        , [cajas, filter, filterSucursal]);

    const sucursalesUnicas = useMemo(() =>
        Array.from(new Set(cajas.map((c: Caja) => c.sucursal))).sort()
        , [cajas]);

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="center" wrap="wrap">
                <Menu shadow="md" width={200} trigger="click" withinPortal transitionProps={{ transition: 'pop-top-left' }}>
                    <Menu.Target>
                        <Group gap={8} style={{ cursor: 'pointer' }} className="hover:opacity-80 transition-opacity">
                            <Title order={2} size="h3" fw={700} c={(filterSucursal || filter !== 'abiertas') ? 'blue.7' : undefined} visibleFrom="sm">
                                {filterSucursal
                                    ? (filter !== 'abiertas' ? `${filterSucursal} (${filter === 'abiertas' ? 'Abiertas' : 'Cerradas'})` : `${filterSucursal} (Abiertas)`)
                                    : (filter === 'abiertas' ? 'Cajas Abiertas' : 'Cajas Cerradas')
                                }
                            </Title>
                            <Title order={2} size="h5" fw={700} c={(filterSucursal || filter !== 'abiertas') ? 'blue.7' : undefined} hiddenFrom="sm">
                                {filterSucursal
                                    ? (filter !== 'abiertas' ? `${filterSucursal} (${filter === 'abiertas' ? 'Abiertas' : 'Cerradas'})` : `${filterSucursal} (Abiertas)`)
                                    : (filter === 'abiertas' ? 'Cajas Abiertas' : 'Cajas Cerradas')
                                }
                            </Title>
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
                        {sucursalesUnicas.map(suc => (
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
                        { value: 'abiertas', label: `Abiertas ${activasCount}` },
                        { value: 'cerradas', label: `Cerradas ${cerradasCount}` },
                    ]}
                />
            </Group>
            {fetching ? (
                <Text ta="center" py="xl" c="dimmed">Cargando cajas...</Text>
            ) : filteredCajas.length === 0 ? (
                <Paper p="xl" withBorder radius="md" ta="center">
                    <Text c="dimmed">No hay cajas {filter === 'abiertas' ? 'abiertas' : 'cerradas'}</Text>
                </Paper>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                    {filteredCajas.map((caja: Caja) => (
                        <CajaCard
                            key={caja.id}
                            caja={caja}
                            alertThreshold={alertThreshold}
                            onSelectCaja={onSelectCaja}
                            onDelete={() => queryClient.invalidateQueries({ queryKey: ['cajas'] })}
                        />
                    ))}
                </SimpleGrid>
            )}

            <AperturaCajaModal opened={opened} close={close} />
        </Stack>
    );
}
