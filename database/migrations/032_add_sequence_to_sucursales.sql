-- Agregar columna secuencia_inicial a la tabla sucursales
ALTER TABLE public.sucursales ADD COLUMN IF NOT EXISTS secuencia_inicial INTEGER DEFAULT 0;

-- Actualizar la función para usar el mayor valor entre el historial y la secuencia inicial
CREATE OR REPLACE FUNCTION public.set_caja_number()
RETURNS TRIGGER AS $$
DECLARE
  max_existing INTEGER;
  min_start INTEGER;
BEGIN
  -- Obtener el número máximo existente para la sucursal
  SELECT COALESCE(MAX(numero), 0)
  INTO max_existing
  FROM public.cajas
  WHERE sucursal = NEW.sucursal;

  -- Obtener la secuencia inicial configurada para la sucursal
  -- Se asume que NEW.sucursal coincide con sucursales.nombre
  SELECT COALESCE(secuencia_inicial, 0)
  INTO min_start
  FROM public.sucursales
  WHERE nombre = NEW.sucursal
  LIMIT 1;

  -- El nuevo número será el máximo entre (historial, secuencia_inicial) + 1
  NEW.numero := GREATEST(max_existing, min_start) + 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
