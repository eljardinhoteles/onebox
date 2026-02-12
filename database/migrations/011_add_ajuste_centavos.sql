-- Add ajuste_centavos column to retenciones for rounding adjustments
ALTER TABLE retenciones
ADD COLUMN IF NOT EXISTS ajuste_centavos numeric(12, 4) NOT NULL DEFAULT 0;
