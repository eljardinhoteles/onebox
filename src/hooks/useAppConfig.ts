import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useEmpresa } from '../context/EmpresaContext';

export function useAppConfig() {
    const { empresa, configs: contextConfigs, refresh: refreshEmpresa } = useEmpresa();
    const [localConfigs, setLocalConfigs] = useState<Record<string, string>>({});

    // Sincronizar con el contexto cuando cambie
    useEffect(() => {
        setLocalConfigs(contextConfigs);
    }, [contextConfigs]);

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

            setLocalConfigs(prev => ({ ...prev, [clave]: valor }));
            // Opcionalmente refrescar el contexto global para asegurar consistencia
            refreshEmpresa();
            return { success: true };
        } catch (error) {
            console.error('Error updating app config:', error);
            return { success: false, error };
        }
    };

    return { 
        configs: localConfigs, 
        loading: false, // Ahora es instantáneo desde el contexto 
        updateConfig, 
        refresh: refreshEmpresa 
    };
}
