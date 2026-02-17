-- =============================================================================
-- Script de Corrección: Sincronización de Perfiles Faltantes
-- Ejecuta esto en el Editor SQL de Supabase para asegurar que todos los usuarios tengan perfil
-- =============================================================================

INSERT INTO public.perfiles (id, nombre, apellido, email)
SELECT id, raw_user_meta_data->>'nombre', raw_user_meta_data->>'apellido', email
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    apellido = EXCLUDED.apellido,
    email = EXCLUDED.email;

-- Verificación (debería mostrar todos los usuarios con sus perfiles)
SELECT p.id, p.email, p.nombre, p.apellido 
FROM public.perfiles p;
