-- =============================================================================
-- Migración 040: Corrección de recursión infinita en Políticas RLS
-- Problema: get_user_empresa_id() fue definido como LANGUAGE SQL. PostgreSQL "inlinea"
-- (evalúa directamente) las funciones SQL estables, lo que hace que pierdan
-- el contexto de SECURITY DEFINER y apliquen RLS de nuevo, causando un ciclo infinito (Status 500).
-- Solución: Cambiar a LANGUAGE plpgsql para forzar la ejecución segura como superusuario.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT empresa_id 
    FROM public.empresa_usuarios
    WHERE user_id = auth.uid()
    AND activo = true
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;
