-- =============================================================================
-- Migración 020: Corrección de Acceso a auth.users en RLS
-- Reemplaza consultas directas a auth.users por el uso de auth.jwt()
-- =============================================================================

-- 1. Limpiar políticas previas que causan error
DROP POLICY IF EXISTS "invitaciones_select_empresa" ON public.invitaciones;
DROP POLICY IF EXISTS "invitaciones_update_all" ON public.invitaciones;
DROP POLICY IF EXISTS "Usuarios ven sus propias invitaciones" ON public.invitaciones;
DROP POLICY IF EXISTS "Usuarios aceptan su invitacion" ON public.invitaciones;

-- 2. Crear nuevas políticas usando auth.jwt() para obtener el email de forma segura
-- Nota: auth.jwt() ->> 'email' es la forma estándar de obtener el email del usuario actual sin consultar la tabla auth.users directamente.

CREATE POLICY "invitaciones_select_auth"
ON public.invitaciones FOR SELECT
TO authenticated
USING (
  empresa_id IN (
    SELECT eu.empresa_id FROM public.empresa_usuarios eu WHERE eu.user_id = auth.uid()
  )
  OR 
  email = (auth.jwt() ->> 'email')
);

CREATE POLICY "invitaciones_update_auth"
ON public.invitaciones FOR UPDATE
TO authenticated
USING (
  empresa_id IN (
    SELECT eu.empresa_id FROM public.empresa_usuarios eu WHERE eu.user_id = auth.uid() AND eu.role IN ('owner', 'admin')
  )
  OR
  email = (auth.jwt() ->> 'email')
);

-- Asegurar que la política de INSERT de la migración 019 sigue siendo válida (esta no usaba auth.users)
-- (Ya está en la migración 019, pero la reforzamos aquí si es necesario)
