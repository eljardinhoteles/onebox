-- =============================================================================
-- Migración 041: Corrección Definitiva de Bucle Infinito en RLS
-- Reemplaza el uso de la función get_user_empresa_id() por subconsultas directas
-- y simplifica la lógica de Onboarding para evitar Recursión 500.
-- =============================================================================

-- 1. Limpiamos las políticas actuales
DROP POLICY IF EXISTS "Usuarios ven miembros de su empresa" ON public.empresa_usuarios;
DROP POLICY IF EXISTS "Usuarios agregan miembros a su empresa" ON public.empresa_usuarios;
DROP POLICY IF EXISTS "Usuarios actualizan miembros de su empresa" ON public.empresa_usuarios;
DROP POLICY IF EXISTS "Usuarios eliminan miembros de su empresa" ON public.empresa_usuarios;

-- 2. Política de Lectura (SELECT)
CREATE POLICY "Usuarios ven miembros de su empresa"
  ON public.empresa_usuarios FOR SELECT
  USING (
    user_id = auth.uid() 
    OR 
    empresa_id IN (SELECT e.empresa_id FROM public.empresa_usuarios e WHERE e.user_id = auth.uid() AND e.activo = true)
  );

-- 3. Política de Inserción (INSERT)
CREATE POLICY "Usuarios agregan miembros a su empresa"
  ON public.empresa_usuarios FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    OR 
    empresa_id IN (SELECT e.empresa_id FROM public.empresa_usuarios e WHERE e.user_id = auth.uid() AND e.role IN ('owner', 'admin'))
  );

-- 4. Política de Actualización (UPDATE)
CREATE POLICY "Usuarios actualizan miembros de su empresa"
  ON public.empresa_usuarios FOR UPDATE
  USING (empresa_id IN (SELECT e.empresa_id FROM public.empresa_usuarios e WHERE e.user_id = auth.uid() AND e.role IN ('owner', 'admin')))
  WITH CHECK (empresa_id IN (SELECT e.empresa_id FROM public.empresa_usuarios e WHERE e.user_id = auth.uid() AND e.role IN ('owner', 'admin')));

-- 5. Política de Eliminación (DELETE)
CREATE POLICY "Usuarios eliminan miembros de su empresa"
  ON public.empresa_usuarios FOR DELETE
  USING (empresa_id IN (SELECT e.empresa_id FROM public.empresa_usuarios e WHERE e.user_id = auth.uid() AND e.role IN ('owner', 'admin')));
