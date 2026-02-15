-- Migración para añadir control de recaudación en retenciones
ALTER TABLE public.retenciones 
ADD COLUMN IF NOT EXISTS recaudada BOOLEAN DEFAULT false;

-- Comentario para documentación
COMMENT ON COLUMN public.retenciones.recaudada IS 'Indica si la retención ya ha sido recaudada físicamente.';
