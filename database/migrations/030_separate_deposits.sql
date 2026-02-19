-- =============================================================================
-- Migración 030: Separar Depósitos de Gastos en Vista de Cajas
-- Objetivo: Permitir al frontend distinguir entre gastos operativos y movimientos bancarios.
-- =============================================================================

DROP VIEW IF EXISTS v_cajas_con_saldo;

CREATE OR REPLACE VIEW v_cajas_con_saldo WITH (security_invoker = true) AS
WITH totals AS (
    -- Agregamos por caja, separando depositos de otros gastos
    SELECT 
        t.caja_id,
        -- Total Facturado (Gastos reales): Todo lo que NO sea deposito
        SUM(CASE 
            WHEN t.tipo_documento != 'deposito' THEN t.total_factura 
            ELSE 0 
        END) as total_gastos,
        
        -- Total Depositado: Solo lo que SEA deposito
        SUM(CASE 
            WHEN t.tipo_documento = 'deposito' THEN t.total_factura 
            ELSE 0 
        END) as total_depositos,

        -- Retenciones (Solo aplican a gastos, asumimos que depositos no tienen retencion)
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
    COALESCE(to_agg.total_gastos, 0) as total_gastos,
    COALESCE(to_agg.total_depositos, 0) as total_depositos,
    COALESCE(to_agg.total_retenido, 0) as total_retenido,
    
    -- Saldo actual = Monto Inicial - (Gastos - Retenciones) - Depositos
    -- Nota: Al pagar una factura de $100 con retencion de $10, sale $90 de caja.
    -- Gasto efectivo = Gasto Total - Retenido.
    -- Deposito efectivo = Total Deposito (sale integro).
    c.monto_inicial 
    - (COALESCE(to_agg.total_gastos, 0) - COALESCE(to_agg.total_retenido, 0)) 
    - COALESCE(to_agg.total_depositos, 0) as saldo_actual

FROM cajas c
LEFT JOIN totals to_agg ON to_agg.caja_id = c.id;
