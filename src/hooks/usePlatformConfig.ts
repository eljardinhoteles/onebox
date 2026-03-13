import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function usePlatformConfig() {
    const [config, setConfig] = useState({ 
        precios: { mensual: 20, anual: 204 },
        soporte: { whatsapp: '', correo: '' }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchConfig = async () => {
            const { data } = await supabase
                .from('platform_config')
                .select('*')
                .in('key', ['precio_mensual', 'precio_anual', 'soporte_whatsapp', 'soporte_correo']);

            if (data && isMounted) {
                const conf: any = {};
                data.forEach(r => { conf[r.key] = r.value; });
                setConfig({
                    precios: {
                        mensual: Number(conf.precio_mensual) || 20,
                        anual: Number(conf.precio_anual) || 204
                    },
                    soporte: {
                        whatsapp: conf.soporte_whatsapp || '',
                        correo: conf.soporte_correo || ''
                    }
                });
            }
            if (isMounted) setLoading(false);
        };
        fetchConfig();
        return () => { isMounted = false; };
    }, []);

    return { ...config, loading };
}
