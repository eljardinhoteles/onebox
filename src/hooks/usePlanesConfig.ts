import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function usePlanesConfig() {
    const [precios, setPrecios] = useState({ mensual: 20, anual: 204 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchPrecios = async () => {
            const { data } = await supabase
                .from('platform_config')
                .select('*')
                .in('key', ['precio_mensual', 'precio_anual']);

            if (data && isMounted) {
                const conf: any = {};
                data.forEach(r => { conf[r.key] = r.value; });
                setPrecios({
                    mensual: Number(conf.precio_mensual) || 20,
                    anual: Number(conf.precio_anual) || 204
                });
            }
            if (isMounted) setLoading(false);
        };
        fetchPrecios();
        return () => { isMounted = false; };
    }, []);

    return { precios, loading };
}
