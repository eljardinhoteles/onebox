import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAppConfig() {
    const [configs, setConfigs] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    const fetchConfigs = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('configuracion').select('clave, valor');
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
    }, []);

    const updateConfig = async (clave: string, valor: string) => {
        try {
            const { error } = await supabase
                .from('configuracion')
                .upsert({ clave, valor, updated_at: new Date().toISOString() });

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
