-- =============================================================================
-- Migración 024: Completar estructura de perfiles y agregar teléfono
-- =============================================================================

-- 1. Asegurar que todas las columnas existan
ALTER TABLE public.perfiles 
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.perfiles 
ADD COLUMN IF NOT EXISTS telefono TEXT;

-- 2. Actualizar la función del trigger para incluir todos los campos
CREATE OR REPLACE FUNCTION public.handle_new_user_profile() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles (id, nombre, apellido, email, telefono)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'nombre', ''), 
        COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
        NEW.email,
        NEW.phone
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Sincronizar datos existentes (todos los campos)
INSERT INTO public.perfiles (id, nombre, apellido, email, telefono)
SELECT id, raw_user_meta_data->>'nombre', raw_user_meta_data->>'apellido', email, phone
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    apellido = EXCLUDED.apellido,
    email = EXCLUDED.email,
    telefono = EXCLUDED.telefono;
