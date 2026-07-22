-- 026_tarea_reportes.sql
-- Proposito: reportes de avance por tarea con adjunto multimedia (foto,
-- audio o video) -- pedido explicito del usuario ("Tareas que sea como
-- item nuevo y de ahi van reportes que se pueda enviar un audio o video o
-- imagenes"). Se aclaro con el usuario: cada tarea (calendario mensual,
-- tabla 'tareas' de la migracion 024) tiene su propio detalle con un feed
-- de reportes (texto + adjunto opcional); visibles para el propio
-- empleado dueño de la tarea y para admin/rrhh (mismo criterio de
-- supervision ya usado en 'tareas'/'acceso_diario').
--
-- Se crea una tabla separada (no se extiende 'tareas', que es
-- intencionalmente simple: solo titulo + completada) y un bucket de
-- Storage privado nuevo, siguiendo el mismo patron de
-- 018_empleado_documentos.sql (signed URLs, sin URLs publicas).
--
-- Dependencias: 002 (auth_rol), 004 (fn_audit_trigger), 013 (fn_empleado_id),
-- 024 (tabla tareas).

BEGIN;

CREATE TABLE public.tarea_reportes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  tarea_id uuid NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  descripcion text,
  tipo_adjunto text CHECK (tipo_adjunto IN ('imagen', 'audio', 'video')),
  storage_path text UNIQUE,
  nombre_archivo text,
  tamano_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (tipo_adjunto IS NULL AND storage_path IS NULL)
    OR (tipo_adjunto IS NOT NULL AND storage_path IS NOT NULL)
  ),
  CHECK (descripcion IS NOT NULL OR storage_path IS NOT NULL)
);

CREATE INDEX idx_tarea_reportes_tarea ON public.tarea_reportes (tarea_id);

ALTER TABLE public.tarea_reportes ENABLE ROW LEVEL SECURITY;

CREATE POLICY claude_readonly_select_tarea_reportes ON public.tarea_reportes
  FOR SELECT TO claude_readonly USING (true);

-- Empleado: solo los reportes de sus propias tareas.
CREATE POLICY tarea_reportes_select_propio ON public.tarea_reportes
  FOR SELECT TO authenticated
  USING (auth_rol() = 'empleado' AND empleado_id = fn_empleado_id());

CREATE POLICY tarea_reportes_insert_propio ON public.tarea_reportes
  FOR INSERT TO authenticated
  WITH CHECK (auth_rol() = 'empleado' AND empleado_id = fn_empleado_id());

CREATE POLICY tarea_reportes_delete_propio ON public.tarea_reportes
  FOR DELETE TO authenticated
  USING (auth_rol() = 'empleado' AND empleado_id = fn_empleado_id());

-- admin/rrhh: ven los reportes de cualquier empleado (supervision), mismo
-- criterio que 'tareas'/'acceso_diario'. Sin insert/delete -- el reporte
-- de avance lo carga el empleado, admin/rrhh solo lo consultan.
CREATE POLICY tarea_reportes_select_admin ON public.tarea_reportes
  FOR SELECT TO authenticated USING (auth_rol() IN ('admin', 'rrhh'));

-- Sin UPDATE: un reporte se reemplaza borrando y creando uno nuevo, no se
-- edita in-place (evita desincronizar storage_path con el archivo real).

CREATE TRIGGER trg_audit_tarea_reportes
  AFTER INSERT OR UPDATE OR DELETE ON public.tarea_reportes
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

ALTER PUBLICATION supabase_realtime ADD TABLE public.tarea_reportes;

-- Bucket privado -- todo acceso de lectura pasa por URLs firmadas de corta
-- duracion (createSignedUrl), nunca URLs publicas.
INSERT INTO storage.buckets (id, name, public)
VALUES ('tarea-reportes', 'tarea-reportes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY tarea_reportes_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'tarea-reportes' AND auth_rol() IN ('empleado', 'admin', 'rrhh'));

CREATE POLICY tarea_reportes_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tarea-reportes' AND auth_rol() = 'empleado');

CREATE POLICY tarea_reportes_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'tarea-reportes' AND auth_rol() = 'empleado');

-- No se agregan filas nuevas a 'permisos': el modulo 'tareas' ya tiene
-- leer/escribir sembrados para empleado/admin/rrhh desde la migracion 024,
-- y cubren tambien el acceso a los reportes de cada tarea (mismo modulo).

COMMIT;
