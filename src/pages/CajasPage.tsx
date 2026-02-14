import { Paper, Text, SimpleGrid } from '@mantine/core';
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

    return (
        <>
            {fetching ? (
                <Text ta="center" py="xl" c="dimmed">Cargando cajas...</Text>
            ) : cajas.length === 0 ? (
                <Paper p="xl" withBorder radius="md" ta="center">
                    <Text c="dimmed">No hay cajas registradas</Text>
                </Paper>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                    {cajas.map((caja: Caja) => (
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
        </>
    );
}
