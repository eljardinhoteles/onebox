-- =============================================================================
-- Migración 016: Migrar datos existentes a una empresa
-- EJECUTAR MANUALMENTE después de 014 y 015
-- =============================================================================

-- =====================
-- Paso 1: Crear empresas para todos los usuarios con datos
-- =====================
DO $$
DECLARE
  r RECORD;
  new_empresa_id UUID;
BEGIN
  FOR r IN (
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM public.cajas WHERE empresa_id IS NULL
      UNION
      SELECT user_id FROM public.transacciones WHERE empresa_id IS NULL
      UNION
      SELECT user_id FROM public.proveedores WHERE empresa_id IS NULL
      UNION
      SELECT user_id FROM public.retenciones WHERE empresa_id IS NULL
      UNION
      SELECT user_id FROM public.sucursales WHERE empresa_id IS NULL
      UNION
      SELECT user_id FROM public.bancos WHERE empresa_id IS NULL
    ) AS todos
  )
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.empresa_usuarios WHERE user_id = r.user_id
    ) THEN
      INSERT INTO public.empresas (nombre, created_by)
      VALUES ('Mi Comercio', r.user_id)
      RETURNING id INTO new_empresa_id;

      INSERT INTO public.empresa_usuarios (empresa_id, user_id, role)
      VALUES (new_empresa_id, r.user_id, 'owner');
    ELSE
      SELECT empresa_id INTO new_empresa_id
      FROM public.empresa_usuarios WHERE user_id = r.user_id LIMIT 1;
    END IF;

    UPDATE public.cajas SET empresa_id = new_empresa_id WHERE user_id = r.user_id AND empresa_id IS NULL;
    UPDATE public.transacciones SET empresa_id = new_empresa_id WHERE user_id = r.user_id AND empresa_id IS NULL;
    UPDATE public.proveedores SET empresa_id = new_empresa_id WHERE user_id = r.user_id AND empresa_id IS NULL;
    UPDATE public.retenciones SET empresa_id = new_empresa_id WHERE user_id = r.user_id AND empresa_id IS NULL;
    UPDATE public.sucursales SET empresa_id = new_empresa_id WHERE user_id = r.user_id AND empresa_id IS NULL;
    UPDATE public.bancos SET empresa_id = new_empresa_id WHERE user_id = r.user_id AND empresa_id IS NULL;
    UPDATE public.regimenes SET empresa_id = new_empresa_id WHERE user_id = r.user_id AND empresa_id IS NULL;
    UPDATE public.bitacora SET empresa_id = new_empresa_id WHERE user_id = r.user_id AND empresa_id IS NULL;

    RAISE NOTICE 'Empresa asignada para user_id: %, empresa_id: %', r.user_id, new_empresa_id;
  END LOOP;
END $$;

-- =====================
-- Paso 2: Migrar configuración — copiar config global a cada empresa
-- =====================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT id FROM public.empresas)
  LOOP
    INSERT INTO public.configuracion (clave, valor, descripcion, empresa_id)
    SELECT clave, valor, descripcion, r.id
    FROM public.configuracion
    WHERE empresa_id IS NULL
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- =====================
-- Paso 3: Eliminar filas globales (sin empresa) y cambiar PK
-- Ahora que cada empresa tiene su copia, eliminamos las originales NULL
-- =====================
DELETE FROM public.configuracion WHERE empresa_id IS NULL;

ALTER TABLE public.configuracion DROP CONSTRAINT IF EXISTS configuracion_pkey;
ALTER TABLE public.configuracion ADD PRIMARY KEY (clave, empresa_id);
