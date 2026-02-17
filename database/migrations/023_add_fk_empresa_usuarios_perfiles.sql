-- =============================================================================
-- Migración 023: Relación empresa_usuarios -> perfiles
-- Permite que PostgREST (Supabase) realice el join automáticamente
-- =============================================================================

-- Agregamos la llave foránea que falta
ALTER TABLE public.empresa_usuarios
ADD CONSTRAINT fk_empresa_usuarios_perfiles
FOREIGN KEY (user_id) REFERENCES public.perfiles(id)
ON DELETE CASCADE;

-- Comentario explicativo para la base de datos
COMMENT ON CONSTRAINT fk_empresa_usuarios_perfiles ON public.empresa_usuarios IS 'Relación necesaria para unir miembros con sus perfiles de nombre/apellido';
