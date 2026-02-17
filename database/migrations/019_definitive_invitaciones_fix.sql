-- =============================================================================
-- Migración 019: Definitiva - Permisos y RLS para Invitaciones
-- Re-establece permisos desde cero para asegurar acceso
-- =============================================================================

-- 1. Deshabilitar RLS temporalmente para asegurar que no hay bloqueos de política durante el ajuste
ALTER TABLE public.invitaciones DISABLE ROW LEVEL SECURITY;

-- 2. Limpiar políticas existentes
DROP POLICY IF EXISTS "Empresa ve sus invitaciones" ON public.invitaciones;
DROP POLICY IF EXISTS "Empresa crea invitaciones" ON public.invitaciones;
DROP POLICY IF EXISTS "Empresa actualiza invitaciones" ON public.invitaciones;
DROP POLICY IF EXISTS "Empresa elimina invitaciones" ON public.invitaciones;
DROP POLICY IF EXISTS "Usuarios ven sus propias invitaciones" ON public.invitaciones;
DROP POLICY IF EXISTS "Usuarios aceptan su invitacion" ON public.invitaciones;
DROP POLICY IF EXISTS "Debug policy" ON public.invitaciones;

-- 3. Asegurar GRANTS (repetir por seguridad)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.invitaciones TO authenticated;
GRANT ALL ON TABLE public.invitaciones TO service_role;
GRANT ALL ON TABLE public.invitaciones TO postgres;
GRANT USAGE, SELECT ON SEQUENCE public.invitaciones_id_seq TO authenticated;

-- 4. Re-habilitar RLS
ALTER TABLE public.invitaciones ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas simplificadas y robustas
-- Nota: Usamos una subconsulta que ignora RLS de la tabla empresa_usuarios si fuera necesario, 
-- pero para SELECT lo haremos lo más simple posible.

-- Política de Lectura para la Empresa
CREATE POLICY "invitaciones_select_empresa"
ON public.invitaciones FOR SELECT
TO authenticated
USING (
  empresa_id IN (
    SELECT id FROM public.empresas
  )
);
-- Nota: La anterior es muy permisiva pero para debug. Vamos a hacerla correcta:
DROP POLICY IF EXISTS "invitaciones_select_empresa" ON public.invitaciones;
CREATE POLICY "invitaciones_select_empresa"
ON public.invitaciones FOR SELECT
TO authenticated
USING (
  empresa_id IN (
    SELECT eu.empresa_id FROM public.empresa_usuarios eu WHERE eu.user_id = auth.uid()
  )
  OR 
  email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

-- Política de Inserción
CREATE POLICY "invitaciones_insert_empresa"
ON public.invitaciones FOR INSERT
TO authenticated
WITH CHECK (
  empresa_id IN (
    SELECT eu.empresa_id FROM public.empresa_usuarios eu WHERE eu.user_id = auth.uid() AND eu.role IN ('owner', 'admin')
  )
);

-- Política de Borrado
CREATE POLICY "invitaciones_delete_empresa"
ON public.invitaciones FOR DELETE
TO authenticated
USING (
  empresa_id IN (
    SELECT eu.empresa_id FROM public.empresa_usuarios eu WHERE eu.user_id = auth.uid() AND eu.role IN ('owner', 'admin')
  )
);

-- Política de Update (para que el usuario acepte o el admin cancele)
CREATE POLICY "invitaciones_update_all"
ON public.invitaciones FOR UPDATE
TO authenticated
USING (
  empresa_id IN (
    SELECT eu.empresa_id FROM public.empresa_usuarios eu WHERE eu.user_id = auth.uid() AND eu.role IN ('owner', 'admin')
  )
  OR
  email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);
