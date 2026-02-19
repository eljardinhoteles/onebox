-- =============================================================================
-- Migración 033: Actualizar Vista para incluir numero de caja
-- =============================================================================

DROP VIEW IF EXISTS v_cajas_con_saldo;

CREATE OR REPLACE VIEW v_cajas_con_saldo WITH (security_invoker = true) AS
WITH totals AS (
    -- Agregamos todo en un solo paso por caja
    SELECT 
        t.caja_id,
        SUM(t.total_factura) as total_facturado,
        SUM(COALESCE(r.total_retenido, 0)) as total_retenido
    FROM transacciones t
    LEFT JOIN retenciones r ON r.transaccion_id = t.id
    WHERE t.parent_id IS NULL
    GROUP BY t.caja_id
)
SELECT 
    c.id,
    c.user_id,
    c.monto_inicial,
    c.sucursal,
    c.responsable,
    c.fecha_apertura,
    c.fecha_cierre,
    c.estado,
    c.reposicion,
    c.empresa_id,
    c.numero, -- COLUMNA AGREGADA
    COALESCE(to_agg.total_facturado, 0) as total_facturado,
    COALESCE(to_agg.total_retenido, 0) as total_retenido,
    -- Saldo actual = Monto Inicial - (Total Facturado - Total Retenido)
    c.monto_inicial - (COALESCE(to_agg.total_facturado, 0) - COALESCE(to_agg.total_retenido, 0)) as saldo_actual
FROM cajas c
LEFT JOIN totals to_agg ON to_agg.caja_id = c.id;
