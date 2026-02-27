-- =============================================================================
-- Migración 039: Actualizar Vista para calcular efectivo con retenciones recaudadas
-- =============================================================================

DROP VIEW IF EXISTS v_cajas_con_saldo;

CREATE OR REPLACE VIEW v_cajas_con_saldo WITH (security_invoker = true) AS
WITH totals AS (
    -- Agregamos todo en un solo paso por caja
    SELECT 
        t.caja_id,
        -- Total de todos los gastos (excluyendo depósitos)
        SUM(CASE WHEN t.tipo_documento != 'deposito' THEN t.total_factura ELSE 0 END) as total_gastos,
        
        -- Total de retenciones solo si están recaudadas
        SUM(CASE 
            WHEN t.tipo_documento != 'deposito' AND r.recaudada = true THEN r.total_retenido 
            ELSE 0 
        END) as total_retenido_recaudado,
        
        -- Total de depósitos a banco
        SUM(CASE WHEN t.tipo_documento = 'deposito' THEN t.total_factura ELSE 0 END) as total_depositos
        
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
    c.numero,
    COALESCE(to_agg.total_gastos, 0) as total_gastos,
    COALESCE(to_agg.total_depositos, 0) as total_depositos,
    COALESCE(to_agg.total_retenido_recaudado, 0) as total_retenido_recaudado,
    
    -- Saldo actual = Monto Inicial - (Total Gastos - Retenciones Recaudadas) - Depositos
    c.monto_inicial 
        - (COALESCE(to_agg.total_gastos, 0) - COALESCE(to_agg.total_retenido_recaudado, 0)) 
        - COALESCE(to_agg.total_depositos, 0) as saldo_actual
        
FROM cajas c
LEFT JOIN totals to_agg ON to_agg.caja_id = c.id;
