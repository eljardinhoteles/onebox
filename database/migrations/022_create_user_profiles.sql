-- =============================================================================
-- Migración 022: Perfiles de Usuario
-- Almacena nombre y apellido para una mejor experiencia de usuario
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    nombre TEXT,
    apellido TEXT,
    email TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- 1. Políticas RLS
-- Cualquiera autenticado puede ver perfiles (para ver nombres en listas de miembros)
CREATE POLICY "Perfiles son visibles para usuarios autenticados" 
ON public.perfiles FOR SELECT 
TO authenticated 
USING (true);

-- Usuarios pueden editar solo su propio perfil
CREATE POLICY "Usuarios pueden editar su propio perfil" 
ON public.perfiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Usuarios pueden insertar su propio perfil
CREATE POLICY "Usuarios pueden insertar su propio perfil" 
ON public.perfiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- 2. Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user_profile() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles (id, nombre, apellido, email)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'nombre', ''), 
        COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- 3. Migrar usuarios existentes
INSERT INTO public.perfiles (id, nombre, apellido, email)
SELECT id, raw_user_meta_data->>'nombre', raw_user_meta_data->>'apellido', email
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    apellido = EXCLUDED.apellido,
    email = EXCLUDED.email;

-- 4. Grants
GRANT ALL ON TABLE public.perfiles TO authenticated;
GRANT ALL ON TABLE public.perfiles TO service_role;
