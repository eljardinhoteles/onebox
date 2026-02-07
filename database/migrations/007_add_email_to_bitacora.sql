-- Add user_email column to bitacora table for easier access
ALTER TABLE public.bitacora
ADD COLUMN IF NOT EXISTS user_email text;
