import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useEmpresa } from '../context/EmpresaContext';

export function useAppConfig() {
    const [configs, setConfigs] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const { empresa } = useEmpresa();

    const fetchConfigs = useCallback(async () => {
        if (!empresa) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('configuracion')
                .select('clave, valor')
                .eq('empresa_id', empresa.id);

            if (error) throw error;

            const configMap: Record<string, string> = {};
            data?.forEach(item => {
                configMap[item.clave] = item.valor;
            });
            setConfigs(configMap);
        } catch (error) {
            console.error('Error fetching app config:', error);
        } finally {
            setLoading(false);
        }
    }, [empresa]);

    const updateConfig = async (clave: string, valor: string) => {
        if (!empresa) return { success: false, error: 'No empresa selected' };
        try {
            const { error } = await supabase
                .from('configuracion')
                .upsert(
                    { clave, valor, empresa_id: empresa.id, updated_at: new Date().toISOString() },
                    { onConflict: 'clave,empresa_id' }
                );

            if (error) throw error;

            setConfigs(prev => ({ ...prev, [clave]: valor }));
            return { success: true };
        } catch (error) {
            console.error('Error updating app config:', error);
            return { success: false, error };
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, [fetchConfigs]);

    return { configs, loading, updateConfig, refresh: fetchConfigs };
}
