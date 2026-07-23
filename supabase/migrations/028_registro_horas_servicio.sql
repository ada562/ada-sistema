-- 028_registro_horas_servicio.sql
-- Proposito: modificaciones a Bitacora pedidas por el usuario (sesion 2026-07-23):
-- dentro de un proyecto, las horas no siempre pertenecen al proyecto "madre"
-- sino a un servicio especifico del proyecto (ej. FACHADAS, ACABADOS). Se
-- agrega `servicio_id` opcional a `registro_horas` para etiquetar a que
-- servicio corresponde cada registro.
--
-- Explicitamente NO se agrega logica de descuento de presupuesto/matriz por
-- servicio -- eso queda para un modulo futuro (Mi Presupuesto). Esta
-- migracion solo permite seleccionar/guardar el servicio.
--
-- Dependencias: registro_horas (bitacora), servicios_proyecto.

BEGIN;

ALTER TABLE public.registro_horas
  ADD COLUMN IF NOT EXISTS servicio_id uuid REFERENCES public.servicios_proyecto(id);

CREATE INDEX IF NOT EXISTS idx_registro_horas_servicio_id ON public.registro_horas(servicio_id);

COMMIT;
