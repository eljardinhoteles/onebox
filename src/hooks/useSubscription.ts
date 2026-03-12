import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import dayjs from 'dayjs';

export interface Subscription {
    id: string;
    empresa_id: string;
    plan: 'trial' | 'mensual' | 'anual';
    estado: 'trial' | 'activa' | 'vencida' | 'pendiente_pago' | 'suspendida';
    fecha_inicio: string;
    fecha_fin: string;
    metodo_pago: string | null;
    comprobante_url: string | null;
    notas_admin: string | null;
    upgrade_pendiente?: boolean;
    upgrade_plan?: string | null;
    upgrade_comprobante_url?: string | null;
}

export interface SubscriptionState {
    subscription: Subscription | null;
    loading: boolean;
    daysRemaining: number;
    isExpired: boolean;
    isReadOnly: boolean;
    isPendingPayment: boolean;
    refresh: () => Promise<void>;
}

export function useSubscription(empresaId: string | undefined): SubscriptionState {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchSubscription = async () => {
        if (!empresaId) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('suscripciones')
                .select('*')
                .eq('empresa_id', empresaId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching subscription:', error);
            }

            setSubscription(data);
        } catch (err) {
            console.error('Error in useSubscription:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscription();
    }, [empresaId]);

    const now = dayjs();
    const fechaFin = subscription ? dayjs(subscription.fecha_fin) : now;
    const daysRemaining = Math.max(0, fechaFin.diff(now, 'day'));
    const isExpired = subscription ? now.isAfter(fechaFin) && subscription.estado !== 'activa' : false;
    const isPendingPayment = subscription?.estado === 'pendiente_pago';
    const isReadOnly = isExpired || (subscription?.estado === 'vencida');

    return {
        subscription,
        loading,
        daysRemaining,
        isExpired,
        isReadOnly,
        isPendingPayment,
        refresh: fetchSubscription,
    };
}
