CREATE OR REPLACE FUNCTION check_large_movement() RETURNS trigger AS $$
BEGIN
    -- Threshold hardcoded to 1000 for now, can be moved to config later
    IF NEW.total_factura > 1000 THEN
        INSERT INTO notificaciones (titulo, mensaje, tipo)
        VALUES (
            'Movimiento Grande Registrado',
            'Se ha registrado una transacción de ' || NEW.total_factura || ' en la Caja #' || NEW.caja_id,
            'info'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_low_balance() RETURNS trigger AS $$
DECLARE
    v_caja_id bigint;
    v_monto_inicial numeric;
    v_total_egresos numeric;
    v_saldo_actual numeric;
    v_porcentaje_alerta integer;
    v_limite_alerta numeric;
BEGIN
    v_caja_id := NEW.caja_id;

    -- Get caja info
    SELECT monto_inicial INTO v_monto_inicial FROM cajas WHERE id = v_caja_id;

    -- Get configuration percentage (default to 15 if not set)
    SELECT coalesce(valor::integer, 15) INTO v_porcentaje_alerta 
    FROM configuracion WHERE clave = 'porcentaje_alerta_caja';

    -- Calculate current balance (simplified: Initial - Sum of Transactions)
    -- Using total_factura instead of invalid 'monto' column
    SELECT coalesce(sum(total_factura), 0) INTO v_total_egresos 
    FROM transacciones WHERE caja_id = v_caja_id;

    v_saldo_actual := v_monto_inicial - v_total_egresos;
    v_limite_alerta := v_monto_inicial * (v_porcentaje_alerta::numeric / 100);

    -- If balance is below limit, trigger notification
    IF v_saldo_actual < v_limite_alerta THEN
        INSERT INTO notificaciones (titulo, mensaje, tipo)
        VALUES (
            'Saldo Bajo en Caja #' || v_caja_id,
            'El saldo actual (' || v_saldo_actual || ') es inferior al ' || v_porcentaje_alerta || '% del monto inicial.',
            'warning'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
