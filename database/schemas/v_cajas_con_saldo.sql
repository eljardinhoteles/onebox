-- Vista para obtener el saldo actual de cada caja calculado desde las transacciones
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
    COALESCE(SUM(t.total_factura) FILTER (WHERE t.parent_id IS NULL), 0) as total_facturado,
    COALESCE(SUM(r.total_retenido), 0) as total_retenido,
    COALESCE(SUM(t.total_factura - COALESCE(r.total_retenido, 0)) FILTER (WHERE t.parent_id IS NULL), 0) as total_neto,
    c.monto_inicial - COALESCE(SUM(t.total_factura - COALESCE(r.total_retenido, 0)) FILTER (WHERE t.parent_id IS NULL), 0) as saldo_actual
FROM cajas c
LEFT JOIN transacciones t ON t.caja_id = c.id
LEFT JOIN retenciones r ON r.transaccion_id = t.id
GROUP BY c.id;
