-- Migración 037: Agregar método de reposición (cheque/transferencia) a la tabla cajas
ALTER TABLE public.cajas
  ADD COLUMN IF NOT EXISTS metodo_reposicion text DEFAULT 'cheque';

-- Actualizar registros existentes para que tengan el valor por defecto
UPDATE public.cajas
  SET metodo_reposicion = 'cheque'
  WHERE metodo_reposicion IS NULL;
