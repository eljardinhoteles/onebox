-- =============================================================================
-- Migración 027: Desactivación de Miembros
-- Añade columna 'activo' y actualiza get_user_empresa_id para filtrar inactivos.
-- =============================================================================

-- 1. Añadir columna activo a empresa_usuarios
ALTER TABLE public.empresa_usuarios 
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true NOT NULL;

-- 2. Actualizar la función helper para que solo devuelva el empresa_id si el usuario está activo
--    Esto bloquea automáticamente el acceso mediante todas las políticas RLS existentes
--    que dependen de public.get_user_empresa_id().
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id FROM public.empresa_usuarios
  WHERE user_id = auth.uid()
  AND activo = true
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
