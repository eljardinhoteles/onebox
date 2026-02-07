-- Añadir soporte para justificación de gastos
alter table public.transacciones 
add column parent_id bigint references public.transacciones(id) on delete set null,
add column es_justificacion boolean not null default false;

-- Índices para mejorar el performance
create index idx_transacciones_parent_id on public.transacciones(parent_id);

-- Comentarios
comment on column public.transacciones.parent_id is 'Referencia a la factura que justifica este gasto';
comment on column public.transacciones.es_justificacion is 'Indica si esta transacción es una factura que agrupa otros gastos';
