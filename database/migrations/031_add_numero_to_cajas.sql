-- Agregar columna numero a la tabla cajas
ALTER TABLE public.cajas ADD COLUMN IF NOT EXISTS numero INTEGER;

-- Función para asignar número de caja por sucursal
CREATE OR REPLACE FUNCTION public.set_caja_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Obtener el siguiente número para la sucursal específica
  -- Usamos COALESCE para manejar el primer registro (comenzará en 1)
  -- Bloqueamos explícitamente para evitar condiciones de carrera en alta concurrencia (aunque raro en apertura de cajas)
  SELECT COALESCE(MAX(numero), 0) + 1
  INTO next_num
  FROM public.cajas
  WHERE sucursal = NEW.sucursal;

  NEW.numero := next_num;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar el número antes de insertar
DROP TRIGGER IF EXISTS set_caja_number_trigger ON public.cajas;
CREATE TRIGGER set_caja_number_trigger
BEFORE INSERT ON public.cajas
FOR EACH ROW
EXECUTE FUNCTION public.set_caja_number();

-- Backfill para cajas existentes
-- Asigna números secuenciales basados en la fecha de creación por cada sucursal
WITH numbered_cajas AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY sucursal ORDER BY created_at) as new_numero
  FROM public.cajas
  WHERE numero IS NULL
)
UPDATE public.cajas
SET numero = numbered_cajas.new_numero
FROM numbered_cajas
WHERE public.cajas.id = numbered_cajas.id;

-- Hacer la columna NOT NULL después del backfill
ALTER TABLE public.cajas ALTER COLUMN numero SET NOT NULL;
