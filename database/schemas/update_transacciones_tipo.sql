-- Añadir columna tipo_documento a la tabla transacciones
alter table public.transacciones 
add column tipo_documento text not null default 'factura';

-- Comentario para explicar los valores posibles: 'factura', 'nota_venta', 'sin_factura'
comment on column public.transacciones.tipo_documento is 'Tipo de comprobante: factura, nota_venta o sin_factura';
