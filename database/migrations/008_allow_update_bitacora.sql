-- Política para permitir que los usuarios actualicen sus propios registros en la bitácora (necesario para anular notas)
CREATE POLICY "Usuarios pueden actualizar su propia bitacora" 
ON public.bitacora 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
