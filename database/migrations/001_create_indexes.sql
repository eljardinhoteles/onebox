-- Create index on caja_id for faster transaction lookups
CREATE INDEX IF NOT EXISTS idx_transacciones_caja_id ON transacciones(caja_id);

-- Create index on foreign keys commonly used in joins
CREATE INDEX IF NOT EXISTS idx_transacciones_proveedor_id ON transacciones(proveedor_id);

-- Optional: Composite index if you frequently filter by caja_id AND order by created_at
CREATE INDEX IF NOT EXISTS idx_transacciones_caja_created ON transacciones(caja_id, created_at DESC);
