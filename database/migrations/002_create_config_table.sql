-- Migration to create the configuration table and initial settings
CREATE TABLE IF NOT EXISTS configuracion (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    descripcion TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO configuracion (clave, valor, descripcion)
VALUES ('porcentaje_alerta_caja', '15', 'Porcentaje de saldo restante para activar la alerta de caja')
ON CONFLICT (clave) DO NOTHING;
