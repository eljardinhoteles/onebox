-- Renombrar columnas para reflejar la nueva terminología
alter table public.cajas rename column monto_inicial to saldo_anterior;
alter table public.cajas rename column monto_total to monto_inicial;
