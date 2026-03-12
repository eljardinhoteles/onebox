import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Subscription } from '../hooks/useSubscription';
import dayjs from 'dayjs';

export type EmpresaRole = 'owner' | 'admin' | 'operador';

export interface Empresa {
    id: string;
    nombre: string;
    ruc: string | null;
    direccion?: string | null;
    email?: string | null;
    contacto_nombre?: string | null;
    ciudad?: string | null;
    created_at: string;
}

export interface Perfil {
    id: string;
    nombre: string | null;
    apellido: string | null;
}

interface EmpresaContextType {
    empresa: Empresa | null;
    role: EmpresaRole | null;
    perfil: Perfil | null;
    loading: boolean;
    isSuperAdmin: boolean;
    subscription: Subscription | null;
    isReadOnly: boolean;
    subscriptionLoading: boolean;
    refreshSubscription: () => Promise<void>;
    /** Refresca la empresa (útil después de crear o unirse a una). */
    configs: Record<string, string>;
    refresh: () => Promise<void>;
}

const EmpresaContext = createContext<EmpresaContextType>({
    empresa: null,
    role: null,
    perfil: null,
    loading: true,
    configs: {},
    isSuperAdmin: false,
    subscription: null,
    isReadOnly: false,
    subscriptionLoading: true,
    refreshSubscription: async () => { },
    refresh: async () => { },
});

export function EmpresaProvider({ children }: { children: ReactNode }) {
    const [empresa, setEmpresa] = useState<Empresa | null>(null);
    const [role, setRole] = useState<EmpresaRole | null>(null);
    const [perfil, setPerfil] = useState<Perfil | null>(null);
    const [loading, setLoading] = useState(true);
    const [configs, setConfigs] = useState<Record<string, string>>({});
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    // Eliminamos el hook useSubscription ya que ahora traemos todo unificado en fetchEmpresa


    // Ref para acceder al estado actual dentro de closures sin dependencias
    const empresaLoadedRef = useRef(false);

    useEffect(() => {
        if (empresa) empresaLoadedRef.current = true;
        else empresaLoadedRef.current = false;
    }, [empresa]);

    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [subscriptionLoading, setSubscriptionLoading] = useState(true);

    const fetchEmpresa = async () => {
        // Solo mostrar loading si no tenemos datos cargados previamente
        if (!empresaLoadedRef.current) {
            setLoading(true);
            setSubscriptionLoading(true);
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setEmpresa(null);
                setRole(null);
                setPerfil(null);
                setSubscription(null);
                setLoading(false);
                setSubscriptionLoading(false);
                return;
            }

            // PETICIÓN ÚNICA: Perfil, membresía, empresa, configuración Y suscripción en un solo viaje
            const { data: profileData, error: profileError } = await supabase
                .from('perfiles')
                .select(`
                    *,
                    membresia:empresa_usuarios (
                        role,
                        empresa_id,
                        empresas (
                            *,
                            configuracion ( clave, valor ),
                            suscripciones (*)
                        )
                    )
                `)
                .eq('id', user.id)
                .maybeSingle();

            if (profileError) throw profileError;

            if (!profileData) {
                setEmpresa(null);
                setRole(null);
                setSubscription(null);
                setLoading(false);
                setSubscriptionLoading(false);
                return;
            }

            // 1. Perfil y SuperAdmin
            setPerfil({
                id: profileData.id,
                nombre: profileData.nombre,
                apellido: profileData.apellido
            });
            setIsSuperAdmin(profileData.is_superadmin === true);

            // 2. Membresía, Empresa y Suscripción
            const membershipRaw = profileData.membresia;
            const membership = Array.isArray(membershipRaw) ? membershipRaw[0] : membershipRaw;

            if (membership) {
                const empresaObj = Array.isArray(membership.empresas) ? membership.empresas[0] : membership.empresas;
                if (empresaObj) {
                    setEmpresa(empresaObj);
                    setRole(membership.role as EmpresaRole);

                    // Configuración
                    const configMap: Record<string, string> = {};
                    const configsRaw = (empresaObj as any).configuracion as any[];
                    configsRaw?.forEach(item => { configMap[item.clave] = item.valor; });
                    setConfigs(configMap);

                    // Suscripción (unificada)
                    const subRaw = (empresaObj as any).suscripciones;
                    const sub = Array.isArray(subRaw) ? subRaw[0] : subRaw;
                    setSubscription(sub || null);
                }
            } else {
                setEmpresa(null);
                setRole(null);
                setSubscription(null);
            }
        } catch (err) {
            console.error('Error in EmpresaProvider:', err);
            setEmpresa(null);
            setRole(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmpresa();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                fetchEmpresa();
            } else {
                setEmpresa(null);
                setRole(null);
                setPerfil(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Lógica derivada de suscripción (antes estaba en el hook)
    const now = dayjs();
    const sub = subscription;
    const fechaFin = sub ? dayjs(sub.fecha_fin) : now;
    const isExpired = sub ? now.isAfter(fechaFin) && sub.estado !== 'activa' : false;
    const isReadOnly = isExpired || (sub?.estado === 'vencida');

    const refreshSubscription = async () => {
        await fetchEmpresa();
    };

    return (
        <EmpresaContext.Provider value={{
            empresa, role, perfil, loading, configs, isSuperAdmin,
            subscription, isReadOnly, subscriptionLoading, refreshSubscription,
            refresh: fetchEmpresa
        }}>
            {children}
        </EmpresaContext.Provider>
    );
}

export function useEmpresa() {
    const ctx = useContext(EmpresaContext);
    if (!ctx) throw new Error('useEmpresa debe usarse dentro de EmpresaProvider');
    return ctx;
}
