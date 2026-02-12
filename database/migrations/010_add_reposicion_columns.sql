-- Add columns for caja closing details
ALTER TABLE cajas
ADD COLUMN IF NOT EXISTS banco_reposicion TEXT,
ADD COLUMN IF NOT EXISTS numero_cheque_reposicion TEXT,
ADD COLUMN IF NOT EXISTS fecha_cierre_real TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS datos_cierre JSONB;
