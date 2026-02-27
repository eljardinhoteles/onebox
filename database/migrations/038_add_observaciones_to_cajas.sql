-- Migración: Añadir campo de observaciones a las cajas
ALTER TABLE public.cajas
  ADD COLUMN IF NOT EXISTS observaciones text;
