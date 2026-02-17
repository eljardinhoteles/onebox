-- =============================================================================
-- Migración 028: Corregir permisos de actualización de miembros
-- Permite que administradores y dueños cambien el estado 'activo' de sus miembros.
-- =============================================================================

-- 1. Asegurar que la columna existe (en caso de que la migración 027 se haya omitido por error)
ALTER TABLE public.empresa_usuarios 
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true NOT NULL;

-- 2. Añadir política de UPDATE
DROP POLICY IF EXISTS "Usuarios actualizan miembros de su empresa" ON public.empresa_usuarios;
CREATE POLICY "Usuarios actualizan miembros de su empresa"
  ON public.empresa_usuarios FOR UPDATE
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());

-- 3. Refrescar la función helper para asegurar el filtrado de activos
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id FROM public.empresa_usuarios
  WHERE user_id = auth.uid()
  AND activo = true
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
