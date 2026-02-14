-- Migration 012: Add has_manual_novedad to transacciones and setup trigger
-- Purpose: Denormalize novedades status for performance

-- 1. Agregar columna booleana a transacciones
ALTER TABLE public.transacciones ADD COLUMN IF NOT EXISTS has_manual_novedad BOOLEAN DEFAULT false;

-- 2. Función para actualizar el estado de novedades de una transacción específica
CREATE OR REPLACE FUNCTION public.update_transaction_novedad_status(p_transaccion_id BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.transacciones
    SET has_manual_novedad = EXISTS (
        SELECT 1 
        FROM public.bitacora 
        WHERE accion = 'ANOTACION_MANUAL' 
          AND (detalle->>'transaccion_id')::BIGINT = p_transaccion_id
          AND (detalle->>'anulado')::BOOLEAN IS NOT TRUE
    )
    WHERE id = p_transaccion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función del disparador (Trigger Function)
CREATE OR REPLACE FUNCTION public.fn_trigger_update_novedad_status()
RETURNS TRIGGER AS $$
DECLARE
    v_trans_id BIGINT;
BEGIN
    -- Procesar el NEW si es una anotación manual
    IF (NEW.accion = 'ANOTACION_MANUAL') THEN
        v_trans_id := (NEW.detalle->>'transaccion_id')::BIGINT;
        IF v_trans_id IS NOT NULL THEN
            PERFORM public.update_transaction_novedad_status(v_trans_id);
        END IF;
    END IF;
    
    -- Si es una actualización, también chequeamos el OLD por si se cambió el ID o se anuló
    IF (TG_OP = 'UPDATE' AND OLD.accion = 'ANOTACION_MANUAL') THEN
        v_trans_id := (OLD.detalle->>'transaccion_id')::BIGINT;
        IF v_trans_id IS NOT NULL THEN
            PERFORM public.update_transaction_novedad_status(v_trans_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear el disparador en la tabla bitacora
DROP TRIGGER IF EXISTS tr_bitacora_novedades ON public.bitacora;
CREATE TRIGGER tr_bitacora_novedades
AFTER INSERT OR UPDATE ON public.bitacora
FOR EACH ROW
EXECUTE FUNCTION public.fn_trigger_update_novedad_status();

-- 5. Sincronización inicial de datos existentes
DO $$ 
DECLARE 
    t_id BIGINT;
BEGIN
    FOR t_id IN SELECT id FROM public.transacciones LOOP
        PERFORM public.update_transaction_novedad_status(t_id);
    END LOOP;
END $$;
