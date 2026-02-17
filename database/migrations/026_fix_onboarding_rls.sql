-- =============================================================================
-- Migración 026: Corregir visibilidad RLS para Onboarding
-- Permite que los usuarios vean las empresas que crearon y su propia membresía
-- incluso antes de que get_user_empresa_id() esté disponible.
-- =============================================================================

-- 1. Corregir política de visibilidad de empresas
DROP POLICY IF EXISTS "Usuarios ven su empresa" ON public.empresas;
CREATE POLICY "Usuarios ven su empresa"
  ON public.empresas FOR SELECT
  USING (id = public.get_user_empresa_id() OR created_by = auth.uid());

-- 2. Corregir política de visibilidad de miembros de empresa
-- Permite ver la propia membresía (necesario para el RETURNING del INSERT inicial)
DROP POLICY IF EXISTS "Usuarios ven miembros de su empresa" ON public.empresa_usuarios;
CREATE POLICY "Usuarios ven miembros de su empresa"
  ON public.empresa_usuarios FOR SELECT
  USING (empresa_id = public.get_user_empresa_id() OR user_id = auth.uid());
