-- Fix Foreign Key Constraint for retencion_items to allow Cascade Delete from transaccion_items

ALTER TABLE public.retencion_items
DROP CONSTRAINT IF EXISTS retencion_items_transaccion_item_id_fkey;

ALTER TABLE public.retencion_items
ADD CONSTRAINT retencion_items_transaccion_item_id_fkey
FOREIGN KEY (transaccion_item_id)
REFERENCES public.transaccion_items(id)
ON DELETE CASCADE;
