-- =============================================================================
-- Migración 030: Habilitar Depósitos Bancarios
-- Agrega columna banco_id a transacciones para registrar el destino del efectivo
-- =============================================================================

-- 1. Agregar columna banco_id (nullable, porque no todas las trasacciones son depósitos)
ALTER TABLE public.transacciones
ADD COLUMN IF NOT EXISTS banco_id BIGINT REFERENCES public.bancos(id);

-- 2. Crear índice para búsquedas rápidas por banco
CREATE INDEX IF NOT EXISTS idx_transacciones_banco ON public.transacciones(banco_id);

-- 3. Actualizar constraint de tipo_documento para permitir 'deposito'
-- Primero verificamos si existe un check constraint explícito
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'transacciones_tipo_documento_check'
    ) THEN
        ALTER TABLE public.transacciones DROP CONSTRAINT transacciones_tipo_documento_check;
        ALTER TABLE public.transacciones ADD CONSTRAINT transacciones_tipo_documento_check
        CHECK (tipo_documento IN ('factura', 'nota_venta', 'liquidacion_compra', 'sin_factura', 'deposito'));
    END IF;
END $$;
