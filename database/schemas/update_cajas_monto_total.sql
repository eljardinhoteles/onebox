-- Añadir la columna monto_total a la tabla de cajas
alter table public.cajas 
add column monto_total numeric(12, 2) not null default 0;

-- Actualizar registros existentes para que el monto_total sea la suma de inicial + reposicion
update public.cajas 
set monto_total = monto_inicial + reposicion;
