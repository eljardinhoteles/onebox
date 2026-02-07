-- Trigger function to check low balance
create or replace function check_low_balance()
returns trigger as $$
declare
    v_caja_id bigint;
    v_monto_inicial numeric;
    v_total_ingresos numeric;
    v_total_egresos numeric;
    v_saldo_actual numeric;
    v_porcentaje_alerta integer;
    v_limite_alerta numeric;
begin
    -- Only check on INSERT of 'gasto' transaction type
    if NEW.tipo = 'gasto' then
        v_caja_id := NEW.caja_id;

        -- Get caja info
        select monto_inicial into v_monto_inicial from cajas where id = v_caja_id;

        -- Get configuration percentage (default to 15 if not set)
        select coalesce(valor::integer, 15) into v_porcentaje_alerta 
        from configuracion where clave = 'porcentaje_alerta_caja';

        -- Calculate current balance (simplified for trigger speed, ideally use view or materialized view)
        -- NOTE: This is an estimation query, for precise balance we rely on the application state or view.
        -- For the trigger, we'll recalculate just specifically for this check.
        
        select coalesce(sum(monto), 0) into v_total_ingresos 
        from transacciones where caja_id = v_caja_id and tipo = 'ingreso';
        
        select coalesce(sum(monto), 0) into v_total_egresos 
        from transacciones where caja_id = v_caja_id and tipo = 'gasto';

        v_saldo_actual := v_monto_inicial + v_total_ingresos - v_total_egresos;
        v_limite_alerta := v_monto_inicial * (v_porcentaje_alerta::numeric / 100);

        -- If balance is below limit, trigger notification
        if v_saldo_actual < v_limite_alerta then
            insert into notificaciones (titulo, mensaje, tipo)
            values (
                'Saldo Bajo en Caja #' || v_caja_id,
                'El saldo actual (' || v_saldo_actual || ') es inferior al ' || v_porcentaje_alerta || '% del monto inicial.',
                'warning'
            );
        end if;
    end if;
    return NEW;
end;
$$ language plpgsql;

create trigger trigger_check_low_balance
after insert on transacciones
for each row execute function check_low_balance();
