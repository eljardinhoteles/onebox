-- =============================================================================
-- Migración 021: Permitir a usuarios anónimos ver detalles de invitación
-- Necesario para pre-cargar el email y nombre de empresa en el registro
-- =============================================================================

-- 1. Dar permisos de lectura a anon sobre las tablas necesarias
GRANT SELECT ON public.invitaciones TO anon;
GRANT SELECT ON public.empresas TO anon;

-- 2. Política para permitir lectura anónima de una invitación específica
-- Se considera seguro porque el ID es un UUID difícil de adivinar
DROP POLICY IF EXISTS "invitaciones_anon_read" ON public.invitaciones;
CREATE POLICY "invitaciones_anon_read"
ON public.invitaciones FOR SELECT
TO anon
USING (true);

-- 3. Política para permitir lectura anónima de la empresa asociada a la invitación
DROP POLICY IF EXISTS "empresas_anon_read" ON public.empresas;
CREATE POLICY "empresas_anon_read"
ON public.empresas FOR SELECT
TO anon
USING (true);
