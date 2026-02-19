import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

export type EmpresaRole = 'owner' | 'admin' | 'operador';

export interface Empresa {
    id: string;
    nombre: string;
    ruc: string | null;
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
    /** Refresca la empresa (útil después de crear o unirse a una). */
    refresh: () => Promise<void>;
}

const EmpresaContext = createContext<EmpresaContextType>({
    empresa: null,
    role: null,
    perfil: null,
    loading: true,
    refresh: async () => { },
});

export function EmpresaProvider({ children }: { children: ReactNode }) {
    const [empresa, setEmpresa] = useState<Empresa | null>(null);
    const [role, setRole] = useState<EmpresaRole | null>(null);
    const [perfil, setPerfil] = useState<Perfil | null>(null);
    const [loading, setLoading] = useState(true);

    // Ref para acceder al estado actual dentro de closures sin dependencias
    const empresaLoadedRef = useRef(false);

    useEffect(() => {
        if (empresa) empresaLoadedRef.current = true;
        else empresaLoadedRef.current = false;
    }, [empresa]);

    const fetchEmpresa = async () => {
        // Solo mostrar loading si no tenemos datos cargados previamente
        if (!empresaLoadedRef.current) {
            setLoading(true);
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setEmpresa(null);
                setRole(null);
                setPerfil(null);
                setLoading(false);
                return;
            }

            // Obtener perfil siempre que haya usuario
            const { data: perfilData } = await supabase
                .from('perfiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (perfilData) {
                setPerfil(perfilData);
            }

            // Obtener la empresa y el rol del usuario
            const { data: membership, error: memberError } = await supabase
                .from('empresa_usuarios')
                .select('empresa_id, role')
                .eq('user_id', user.id)
                .maybeSingle();

            if (memberError) {
                console.error('Error fetching empresa membership:', memberError);
                setEmpresa(null);
                setRole(null);
                setLoading(false);
                return;
            }

            if (!membership) {
                setEmpresa(null);
                setRole(null);
                setLoading(false);
                return;
            }

            // Obtener datos de la empresa
            const { data: empresaData, error: empresaError } = await supabase
                .from('empresas')
                .select('*')
                .eq('id', membership.empresa_id)
                .single();

            if (empresaError) {
                console.error('Error fetching empresa:', empresaError);
                setEmpresa(null);
                setRole(null);
            } else {
                setEmpresa(empresaData);
                setRole(membership.role as EmpresaRole);
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

    return (
        <EmpresaContext.Provider value={{ empresa, role, perfil, loading, refresh: fetchEmpresa }}>
            {children}
        </EmpresaContext.Provider>
    );
}

export function useEmpresa() {
    const ctx = useContext(EmpresaContext);
    if (!ctx) throw new Error('useEmpresa debe usarse dentro de EmpresaProvider');
    return ctx;
}
