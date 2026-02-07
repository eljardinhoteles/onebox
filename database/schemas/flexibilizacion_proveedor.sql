-- Hacer opcional el proveedor_id para permitir gastos sin un proveedor registrado en el sistema
alter table public.transacciones alter column proveedor_id drop not null;

comment on column public.transacciones.proveedor_id is 'Opcional para gastos sin factura o donde no se requiera tracking de proveedor formal.';
