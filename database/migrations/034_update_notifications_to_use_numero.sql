-- =============================================================================
-- Migración 034: Actualizar Notificaciones para usar Numero de Caja
-- =============================================================================

-- 1. Actualizar check_low_balance
CREATE OR REPLACE FUNCTION public.check_low_balance()
RETURNS trigger AS $$
DECLARE
    v_caja_id bigint;
    v_caja_numero integer;
    v_monto_inicial numeric;
    v_saldo_actual numeric;
    v_porcentaje_alerta integer;
    v_limite_alerta numeric;
    v_porcentaje_actual numeric;
BEGIN
    v_caja_id := NEW.caja_id;

    -- Obtener info de la caja y saldo actual desde la vista
    -- Ahora también obtenemos el "numero" (secuencia por sucursal)
    SELECT 
        monto_inicial, 
        saldo_actual,
        numero
    INTO 
        v_monto_inicial, 
        v_saldo_actual,
        v_caja_numero
    FROM v_cajas_con_saldo
    WHERE id = v_caja_id;

    IF v_monto_inicial IS NULL THEN
        RETURN NEW;
    END IF;

    -- Configuración de porcentaje
    SELECT COALESCE(valor::integer, 15) INTO v_porcentaje_alerta 
    FROM configuracion WHERE clave = 'porcentaje_alerta_caja';

    v_limite_alerta := v_monto_inicial * (v_porcentaje_alerta::numeric / 100);

    -- Si el saldo es bajo, generar notificación
    IF v_saldo_actual < v_limite_alerta THEN
        v_porcentaje_actual := (v_saldo_actual / v_monto_inicial) * 100;
        
        INSERT INTO notificaciones (titulo, mensaje, tipo)
        VALUES (
            'Saldo Bajo en Caja #' || COALESCE(v_caja_numero::text, v_caja_id::text),
            'El saldo actual ($' || round(v_saldo_actual, 2) || ') es el ' || round(v_porcentaje_actual, 1) || '% del monto inicial. (Mínimo: ' || v_porcentaje_alerta || '%)',
            'warning'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Actualizar check_large_movement
CREATE OR REPLACE FUNCTION public.check_large_movement()
RETURNS trigger AS $$
DECLARE
    v_caja_numero integer;
BEGIN
    -- Obtener el número de caja para el mensaje
    SELECT numero INTO v_caja_numero FROM cajas WHERE id = NEW.caja_id;

    -- Umbral de movimiento grande
    IF NEW.total_factura > 1000 THEN
        INSERT INTO notificaciones (titulo, mensaje, tipo)
        VALUES (
            'Movimiento Grande Registrado',
            'Se ha registrado una transacción de $' || NEW.total_factura || ' en la Caja #' || COALESCE(v_caja_numero::text, NEW.caja_id::text),
            'info'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
