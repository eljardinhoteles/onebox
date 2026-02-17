-- =============================================================================
-- Migración 018: Corrección de Permisos para Invitaciones
-- Asegura que el rol authenticated tenga permisos para operar sobre las invitaciones
-- =============================================================================

-- Asegurar permisos básicos
GRANT ALL ON TABLE public.invitaciones TO authenticated;
GRANT ALL ON TABLE public.invitaciones TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.invitaciones_id_seq TO authenticated;

-- Refinar política de SELECT por si el get_user_empresa_id() tiene problemas de cache
-- Vamos a usar una subconsulta directa en lugar de la función para probar si el 403 persiste
DROP POLICY IF EXISTS "Empresa ve sus invitaciones" ON public.invitaciones;
CREATE POLICY "Empresa ve sus invitaciones"
  ON public.invitaciones FOR SELECT
  USING (
    empresa_id IN (
      SELECT eu.empresa_id 
      FROM public.empresa_usuarios eu 
      WHERE eu.user_id = auth.uid()
    )
  );

-- Hacer lo mismo para INSERT por seguridad
DROP POLICY IF EXISTS "Empresa crea invitaciones" ON public.invitaciones;
CREATE POLICY "Empresa crea invitaciones"
  ON public.invitaciones FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT eu.empresa_id 
      FROM public.empresa_usuarios eu 
      WHERE eu.user_id = auth.uid()
      AND eu.role IN ('owner', 'admin')
    )
  );
