-- Tabla para configuraciones globales de la aplicación
CREATE TABLE IF NOT EXISTS configuracion (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    descripcion TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuración por defecto para el porcentaje de alerta (15% por defecto)
INSERT INTO configuracion (clave, valor, descripcion)
VALUES ('porcentaje_alerta_caja', '15', 'Porcentaje de saldo restante para activar la alerta de caja')
ON CONFLICT (clave) DO NOTHING;
