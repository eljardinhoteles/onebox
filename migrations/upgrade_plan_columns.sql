-- Migración: columnas para flujo de upgrade de plan sin interrumpir suscripción activa
-- Ejecutar en Supabase SQL Editor

ALTER TABLE suscripciones
  ADD COLUMN IF NOT EXISTS upgrade_pendiente boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS upgrade_plan text DEFAULT null,
  ADD COLUMN IF NOT EXISTS upgrade_comprobante_url text DEFAULT null;

COMMENT ON COLUMN suscripciones.upgrade_pendiente IS 'true cuando el cliente tiene activa la suscripción pero solicita cambio de plan';
COMMENT ON COLUMN suscripciones.upgrade_plan IS 'Plan solicitado en el upgrade (mensual, anual)';
COMMENT ON COLUMN suscripciones.upgrade_comprobante_url IS 'URL del comprobante de pago del upgrade';
