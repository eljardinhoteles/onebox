-- ============================================
-- Sistema de Suscripciones - Migraciones SQL (Versión Idempotente)
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Campo is_superadmin en perfiles
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- 2. Tabla de suscripciones
CREATE TABLE IF NOT EXISTS suscripciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
  plan TEXT NOT NULL DEFAULT 'trial',
  estado TEXT NOT NULL DEFAULT 'trial',
  fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_fin TIMESTAMPTZ NOT NULL,
  metodo_pago TEXT,
  comprobante_url TEXT,
  notas_admin TEXT,
  factura_emitida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de configuración de plataforma
CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Datos iniciales de configuración bancaria
INSERT INTO platform_config (key, value) VALUES
  ('banco_nombre', ''),
  ('banco_titular', ''),
  ('banco_cuenta', ''),
  ('banco_tipo_cuenta', ''),
  ('banco_cedula', '')
ON CONFLICT (key) DO NOTHING;

-- 4. RLS Policies para SUSCRIPCIONES
ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Miembros pueden ver su suscripción" ON suscripciones;
CREATE POLICY "Miembros pueden ver su suscripción" ON suscripciones
  FOR SELECT USING (
    empresa_id IN (
      SELECT empresa_id FROM empresa_usuarios WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners pueden actualizar su suscripción" ON suscripciones;
CREATE POLICY "Owners pueden actualizar su suscripción" ON suscripciones
  FOR UPDATE USING (
    empresa_id IN (
      SELECT empresa_id FROM empresa_usuarios WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Owners pueden crear su suscripción si no existe" ON suscripciones;
CREATE POLICY "Owners pueden crear su suscripción si no existe" ON suscripciones
  FOR INSERT WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM empresa_usuarios WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Superadmins acceso total a suscripciones" ON suscripciones;
CREATE POLICY "Superadmins acceso total a suscripciones" ON suscripciones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND is_superadmin = true)
  );

-- 4.2 RLS Policies para PLATFORM_CONFIG
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden leer platform_config" ON platform_config;
CREATE POLICY "Todos pueden leer platform_config" ON platform_config
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Superadmins pueden modificar platform_config" ON platform_config;
CREATE POLICY "Superadmins pueden modificar platform_config" ON platform_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND is_superadmin = true)
  );

-- 4.3 RLS Policies para EMPRESAS (Superadmin)
DROP POLICY IF EXISTS "Superadmins pueden ver todas las empresas" ON empresas;
CREATE POLICY "Superadmins pueden ver todas las empresas" ON empresas
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND is_superadmin = true)
  );

DROP POLICY IF EXISTS "Superadmins pueden eliminar empresas" ON empresas;
CREATE POLICY "Superadmins pueden eliminar empresas" ON empresas
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND is_superadmin = true)
  );

-- 4.4 RLS Policies para Tablas Relacionadas (Superadmin)
DROP POLICY IF EXISTS "Superadmins acceso total empresa_usuarios" ON empresa_usuarios;
CREATE POLICY "Superadmins acceso total empresa_usuarios" ON empresa_usuarios
  FOR ALL USING ( EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND is_superadmin = true) );

DROP POLICY IF EXISTS "Superadmins acceso total sucursales" ON sucursales;
CREATE POLICY "Superadmins acceso total sucursales" ON sucursales
  FOR ALL USING ( EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND is_superadmin = true) );

DROP POLICY IF EXISTS "Superadmins acceso total bitacora" ON bitacora;
CREATE POLICY "Superadmins acceso total bitacora" ON bitacora
  FOR ALL USING ( EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND is_superadmin = true) );

DROP POLICY IF EXISTS "Superadmins acceso total notificaciones" ON notificaciones;
CREATE POLICY "Superadmins acceso total notificaciones" ON notificaciones
  FOR ALL USING ( EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND is_superadmin = true) );

DROP POLICY IF EXISTS "Superadmins acceso total invitaciones" ON invitaciones;
CREATE POLICY "Superadmins acceso total invitaciones" ON invitaciones
  FOR ALL USING ( EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND is_superadmin = true) );

DROP POLICY IF EXISTS "Superadmins acceso total cajas" ON cajas;
CREATE POLICY "Superadmins acceso total cajas" ON cajas
  FOR SELECT USING ( EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND is_superadmin = true) );

DROP POLICY IF EXISTS "Superadmins acceso total transacciones" ON transacciones;
CREATE POLICY "Superadmins acceso total transacciones" ON transacciones
  FOR SELECT USING ( EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND is_superadmin = true) );

-- 5. Storage bucket para comprobantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Cualquiera puede ver comprobantes publicamente" ON storage.objects;
CREATE POLICY "Cualquiera puede ver comprobantes publicamente" ON storage.objects
  FOR SELECT USING ( bucket_id = 'comprobantes' );

DROP POLICY IF EXISTS "Owners pueden subir su propio comprobante" ON storage.objects;
CREATE POLICY "Owners pueden subir su propio comprobante" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'comprobantes' AND
    auth.uid() IS NOT NULL
  );

-- 6. Agregar campos de facturación a la tabla empresas
ALTER TABLE empresas 
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS contacto_nombre TEXT,
  ADD COLUMN IF NOT EXISTS ciudad TEXT;
