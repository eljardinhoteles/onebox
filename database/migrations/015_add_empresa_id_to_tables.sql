-- =============================================================================
-- Migración 015: Agregar empresa_id a todas las tablas existentes
-- Cambia RLS de user_id a empresa_id para compartir datos entre usuarios
-- =============================================================================

-- =====================
-- PASO 1: Agregar columna empresa_id a todas las tablas de datos
-- El DEFAULT usa la función get_user_empresa_id() para auto-asignar
-- =====================

ALTER TABLE public.cajas
  ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) DEFAULT public.get_user_empresa_id();

ALTER TABLE public.transacciones
  ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) DEFAULT public.get_user_empresa_id();

ALTER TABLE public.proveedores
  ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) DEFAULT public.get_user_empresa_id();

ALTER TABLE public.retenciones
  ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) DEFAULT public.get_user_empresa_id();

ALTER TABLE public.sucursales
  ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) DEFAULT public.get_user_empresa_id();

ALTER TABLE public.bancos
  ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) DEFAULT public.get_user_empresa_id();

ALTER TABLE public.regimenes
  ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) DEFAULT public.get_user_empresa_id();

ALTER TABLE public.notificaciones
  ADD COLUMN empresa_id UUID REFERENCES public.empresas(id);

ALTER TABLE public.bitacora
  ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) DEFAULT public.get_user_empresa_id();

-- Agregar empresa_id a la tabla de configuracion (ahora es por empresa)
ALTER TABLE public.configuracion
  ADD COLUMN empresa_id UUID REFERENCES public.empresas(id);

-- =====================
-- PASO 2: Actualizar políticas RLS — cajas
-- =====================
DROP POLICY IF EXISTS "Usuarios pueden gestionar sus propias cajas" ON public.cajas;
CREATE POLICY "Empresa gestiona cajas"
  ON public.cajas FOR ALL
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());

-- =====================
-- PASO 3: Actualizar políticas RLS — transacciones
-- =====================
DROP POLICY IF EXISTS "Usuarios gestionan sus propias transacciones" ON public.transacciones;
CREATE POLICY "Empresa gestiona transacciones"
  ON public.transacciones FOR ALL
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());

-- transaccion_items: hereda a través de la transacción
DROP POLICY IF EXISTS "Usuarios gestionan items de sus transacciones" ON public.transaccion_items;
CREATE POLICY "Empresa gestiona items de transacciones"
  ON public.transaccion_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM transacciones
      WHERE transacciones.id = transaccion_items.transaccion_id
      AND transacciones.empresa_id = public.get_user_empresa_id()
    )
  );

-- =====================
-- PASO 4: Actualizar políticas RLS — proveedores
-- =====================
DROP POLICY IF EXISTS "Usuarios pueden gestionar sus propios proveedores" ON public.proveedores;
CREATE POLICY "Empresa gestiona proveedores"
  ON public.proveedores FOR ALL
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());

-- =====================
-- PASO 5: Actualizar políticas RLS — retenciones
-- =====================
DROP POLICY IF EXISTS "Usuarios gestionan sus propias retenciones" ON public.retenciones;
CREATE POLICY "Empresa gestiona retenciones"
  ON public.retenciones FOR ALL
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());

DROP POLICY IF EXISTS "Usuarios gestionan items de sus retenciones" ON public.retencion_items;
CREATE POLICY "Empresa gestiona items de retenciones"
  ON public.retencion_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM retenciones
      WHERE retenciones.id = retencion_items.retencion_id
      AND retenciones.empresa_id = public.get_user_empresa_id()
    )
  );

-- =====================
-- PASO 6: Actualizar políticas RLS — sucursales
-- =====================
DROP POLICY IF EXISTS "Usuarios pueden gestionar sus propias sucursales" ON public.sucursales;
CREATE POLICY "Empresa gestiona sucursales"
  ON public.sucursales FOR ALL
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());

-- =====================
-- PASO 7: Actualizar políticas RLS — bancos
-- =====================
DROP POLICY IF EXISTS "Usuarios pueden gestionar sus propios bancos" ON public.bancos;
CREATE POLICY "Empresa gestiona bancos"
  ON public.bancos FOR ALL
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());

-- =====================
-- PASO 8: Actualizar políticas RLS — regimenes
-- =====================
DROP POLICY IF EXISTS "Usuarios pueden gestionar sus propios regimenes" ON public.regimenes;
CREATE POLICY "Empresa gestiona regimenes"
  ON public.regimenes FOR ALL
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());

-- =====================
-- PASO 9: Actualizar políticas RLS — notificaciones
-- =====================
DROP POLICY IF EXISTS "Usuarios pueden ver sus notificaciones" ON public.notificaciones;
CREATE POLICY "Empresa ve notificaciones"
  ON public.notificaciones FOR SELECT
  USING (
    empresa_id = public.get_user_empresa_id()
    OR empresa_id IS NULL
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Usuarios pueden actualizar sus notificaciones" ON public.notificaciones;
CREATE POLICY "Usuarios actualizan sus notificaciones"
  ON public.notificaciones FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================
-- PASO 10: Índices para performance con empresa_id
-- =====================
CREATE INDEX IF NOT EXISTS idx_cajas_empresa ON public.cajas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_empresa ON public.transacciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_empresa ON public.proveedores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_retenciones_empresa ON public.retenciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sucursales_empresa ON public.sucursales(empresa_id);
CREATE INDEX IF NOT EXISTS idx_bancos_empresa ON public.bancos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_regimenes_empresa ON public.regimenes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_empresa ON public.bitacora(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_usuarios_user ON public.empresa_usuarios(user_id);
CREATE INDEX IF NOT EXISTS idx_empresa_usuarios_empresa ON public.empresa_usuarios(empresa_id);
