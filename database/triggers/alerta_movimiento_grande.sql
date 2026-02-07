-- Trigger function to check large movements
create or replace function check_large_movement()
returns trigger as $$
begin
    -- Threshold hardcoded to 1000 for now, can be moved to config later
    if NEW.monto > 1000 then
        insert into notificaciones (titulo, mensaje, tipo)
        values (
            'Movimiento Grande Registrado',
            'Se ha registrado una transacción de ' || NEW.monto || ' en la Caja #' || NEW.caja_id,
            'info'
        );
    end if;
    return NEW;
end;
$$ language plpgsql;

create trigger trigger_check_large_movement
after insert on transacciones
for each row execute function check_large_movement();
