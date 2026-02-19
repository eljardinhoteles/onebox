-- Migración 035: Extender tabla Bancos
-- Añade numero_cuenta y tipo_cuenta para mejor gestión de depósitos
ALTER TABLE public.bancos ADD COLUMN IF NOT EXISTS numero_cuenta TEXT;
ALTER TABLE public.bancos ADD COLUMN IF NOT EXISTS tipo_cuenta TEXT;
