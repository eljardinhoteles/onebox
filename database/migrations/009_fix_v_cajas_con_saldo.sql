-- Reemplazar la vista v_cajas_con_saldo con una versión más robusta usando subqueries
-- para evitar problemas de duplicidad en JOINs y asegurar el cálculo correcto.

DROP VIEW IF EXISTS v_cajas_con_saldo;

CREATE OR REPLACE VIEW v_cajas_con_saldo WITH (security_invoker = true) AS
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
    -- Total facturado: Suma de transacciones principales (sin parent_id)
    COALESCE((
        SELECT SUM(t.total_factura)
        FROM transacciones t
        WHERE t.caja_id = c.id AND t.parent_id IS NULL
    ), 0) as total_facturado,
    -- Total retenido: Suma de retenciones asociadas a transacciones de esta caja
    COALESCE((
        SELECT SUM(r.total_retenido)
        FROM transacciones t
        JOIN retenciones r ON r.transaccion_id = t.id
        WHERE t.caja_id = c.id AND t.parent_id IS NULL
    ), 0) as total_retenido,
    -- Saldo actual = Monto Inicial - (Total Facturas - Total Retenciones)
    c.monto_inicial - (
        COALESCE((
            SELECT SUM(t.total_factura)
            FROM transacciones t
            WHERE t.caja_id = c.id AND t.parent_id IS NULL
        ), 0)
        -
        COALESCE((
            SELECT SUM(r.total_retenido)
            FROM transacciones t
            JOIN retenciones r ON r.transaccion_id = t.id
            WHERE t.caja_id = c.id AND t.parent_id IS NULL
        ), 0)
    ) as saldo_actual
FROM cajas c;
