-- =============================================================================
-- Migración 042: Agregar asignación de sucursales a usuarios (operadores)
-- =============================================================================

-- Añadir array de texto para guardar las sucursales asignadas a un usuario dentro de una empresa.
-- Se usa array porque una empresa tiene 'n' sucursales gestionadas por texto, no por ID actualmente.
ALTER TABLE public.empresa_usuarios
  ADD COLUMN IF NOT EXISTS sucursales text[] DEFAULT '{}'::text[];

-- Crear un índice GIN para las búsquedas eficientes en arrays si alguna vez es necesario
-- (Opcional, pero recomendado si crecen los datos y se consulta usando el operador ANY)
CREATE INDEX IF NOT EXISTS idx_empresa_usuarios_sucursales ON public.empresa_usuarios USING GIN (sucursales);
