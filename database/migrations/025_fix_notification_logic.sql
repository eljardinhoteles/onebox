-- Fix check_low_balance function to use v_cajas_con_saldo view
-- This ensures that the balance check accounts for retentions and parent transactions correctly

CREATE OR REPLACE FUNCTION check_low_balance()
RETURNS trigger AS $$
DECLARE
    v_caja_id bigint;
    v_monto_inicial numeric;
    v_saldo_actual numeric;
    v_porcentaje_alerta integer;
    v_limite_alerta numeric;
    v_porcentaje_actual numeric;
BEGIN
    v_caja_id := NEW.caja_id;

    -- Get caja info and current balance directly from the view
    -- This ensures we use the exact same logic as the dashboard
    SELECT 
        monto_inicial, 
        saldo_actual 
    INTO 
        v_monto_inicial, 
        v_saldo_actual
    FROM v_cajas_con_saldo
    WHERE id = v_caja_id;

    -- Handle case where view might not return a row (shouldn't happen for active caja but good for safety)
    IF v_monto_inicial IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get configuration percentage (default to 15 if not set)
    SELECT COALESCE(valor::integer, 15) INTO v_porcentaje_alerta 
    FROM configuracion WHERE clave = 'porcentaje_alerta_caja';

    -- Calculate alert limit
    v_limite_alerta := v_monto_inicial * (v_porcentaje_alerta::numeric / 100);

    -- If balance is below limit, trigger notification
    IF v_saldo_actual < v_limite_alerta THEN
        -- Calculate current percentage for better info
        v_porcentaje_actual := (v_saldo_actual / v_monto_inicial) * 100;
        
        insert into notificaciones (titulo, mensaje, tipo)
        values (
            'Saldo Bajo en Caja #' || v_caja_id,
            'El saldo actual ($' || round(v_saldo_actual, 2) || ') es el ' || round(v_porcentaje_actual, 1) || '% del monto inicial. (Mínimo: ' || v_porcentaje_alerta || '%)',
            'warning'
        );
    END IF;

    RETURN NEW;
END;
$$ language plpgsql;
