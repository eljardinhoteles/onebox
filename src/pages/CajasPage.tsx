import { useState, useEffect } from 'react';
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
}

export function CajasPage({ opened, close, onSelectCaja }: CajasPageProps) {
    const queryClient = useQueryClient();
    const { configs } = useAppConfig();
    const alertThreshold = parseInt(configs.porcentaje_alerta_caja || '15');
    const [filter, setFilter] = useState('todas');
    const [filterSucursal, setFilterSucursal] = useState<string | null>(null);

    // PERSISTENCIA: Cargar filtros desde la URL al montar
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlFilter = params.get('estado');
        const urlSucursal = params.get('sucursal');

        if (urlFilter && ['todas', 'activas', 'cerradas'].includes(urlFilter)) {
            setFilter(urlFilter);
        }
        if (urlSucursal) {
            setFilterSucursal(urlSucursal);
        }
    }, []);

    // PERSISTENCIA: Sincronizar filtros con la URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        if (filter !== 'todas') {
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
                    console.warn('Fallback a tabla base:', error);
                    const { data: baseData, error: baseError } = await supabase
                        .from('cajas')
                        .select('*')
                        .order('id', { ascending: false });

                    if (baseError) throw baseError;
                    return (baseData || []).map(c => ({ ...c, saldo_actual: c.monto_inicial }));
                }
                return data || [];
            } catch (error) {
                console.error('Error in cajas query:', error);
                throw error;
            }
        }
    });

    const cajasFiltradasPorSucursal = filterSucursal
        ? cajas.filter((c: Caja) => c.sucursal === filterSucursal)
        : cajas;

    const activasCount = cajasFiltradasPorSucursal.filter((c: Caja) => c.estado === 'abierta').length;
    const cerradasCount = cajasFiltradasPorSucursal.filter((c: Caja) => c.estado === 'cerrada').length;
    const todasCount = cajasFiltradasPorSucursal.length;

    const filteredCajas = cajas.filter((c: Caja) => {
        const matchesEstado = filter === 'activas' ? c.estado === 'abierta' :
            filter === 'cerradas' ? c.estado === 'cerrada' : true;
        const matchesSucursal = !filterSucursal || c.sucursal === filterSucursal;
        return matchesEstado && matchesSucursal;
    });

    const sucursalesUnicas = Array.from(new Set(cajas.map((c: Caja) => c.sucursal))).sort();

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="center" wrap="wrap">
                <Menu shadow="md" width={200} trigger="click" withinPortal transitionProps={{ transition: 'pop-top-left' }}>
                    <Menu.Target>
                        <Group gap={8} style={{ cursor: 'pointer' }} className="hover:opacity-80 transition-opacity">
                            <Title order={2} fw={700} c={(filterSucursal || filter !== 'todas') ? 'blue.7' : undefined}>
                                {filterSucursal
                                    ? (filter !== 'todas' ? `${filterSucursal} (${filter === 'activas' ? 'Activas' : 'Cerradas'})` : filterSucursal)
                                    : (filter === 'activas' ? 'Cajas Activas' : filter === 'cerradas' ? 'Cajas Cerradas' : 'Cajas Chicas')
                                }
                            </Title>
                            <IconChevronDown
                                size={20}
                                className={(filterSucursal || filter !== 'todas') ? 'text-blue-500' : 'text-gray-400'}
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
                    size="xs"
                    color="blue"
                    data={[
                        { value: 'todas', label: `Todas ${todasCount}` },
                        { value: 'activas', label: `Activas ${activasCount}` },
                        { value: 'cerradas', label: `Cerradas ${cerradasCount}` },
                    ]}
                />
            </Group>
            {fetching ? (
                <Text ta="center" py="xl" c="dimmed">Cargando cajas...</Text>
            ) : filteredCajas.length === 0 ? (
                <Paper p="xl" withBorder radius="md" ta="center">
                    <Text c="dimmed">No hay cajas {filter !== 'todas' ? filter : 'registradas'}</Text>
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
