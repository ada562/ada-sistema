-- 018_empleado_documentos.sql
-- Proposito: subida real de documentos por empleado (cedula, hoja de vida,
-- contrato firmado en PDF, certificados, otros) -- pedido explicito del
-- usuario ("en contratos necesito subir los contratos en pdf y cedulas y
-- documentos"). Hasta ahora empleados.doc_cedula/doc_hoja_vida/doc_contrato/
-- doc_certificados (migracion 007) eran flags booleanos marcados a mano,
-- sin archivo real detras (documentado asi en esa misma migracion).
--
-- Se reemplazan por una tabla de documentos + bucket de Storage privado.
-- Las 4 columnas booleanas de empleados NO se eliminan (evitar drop
-- destructivo sobre datos de produccion ya capturados) pero dejan de
-- leerse/escribirse desde el frontend a partir de este commit -- quedan
-- huerfanas a proposito, ver dbEmpleados.js.
--
-- Alcance confirmado con el usuario: biblioteca de documentos POR EMPLEADO
-- (no por version especifica de contrato), visible/editable solo por
-- admin y rrhh. Un empleado puede tener varios archivos por categoria
-- (ej. varios certificados), por eso no hay UNIQUE(empleado_id, tipo).
--
-- Dependencias: 002 (auth_rol), 004 (fn_audit_trigger), 007 (empleados).

BEGIN;

CREATE TABLE public.empleado_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('cedula','hoja_vida','contrato','certificados','otro')),
  nombre_archivo text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  tamano_bytes bigint,
  subido_por uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_empleado_documentos_empleado ON public.empleado_documentos (empleado_id);

ALTER TABLE public.empleado_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY claude_readonly_select_empleado_documentos ON public.empleado_documentos
  FOR SELECT TO claude_readonly USING (true);

CREATE POLICY empleado_documentos_select ON public.empleado_documentos
  FOR SELECT TO authenticated
  USING (auth_rol() IN ('admin','rrhh'));

CREATE POLICY empleado_documentos_insert ON public.empleado_documentos
  FOR INSERT TO authenticated
  WITH CHECK (auth_rol() IN ('admin','rrhh'));

CREATE POLICY empleado_documentos_delete ON public.empleado_documentos
  FOR DELETE TO authenticated
  USING (auth_rol() IN ('admin','rrhh'));

-- Sin UPDATE: un documento se reemplaza borrando y subiendo de nuevo, no
-- se edita in-place (evita desincronizar storage_path con el archivo real).

CREATE TRIGGER trg_audit_empleado_documentos
  AFTER INSERT OR UPDATE OR DELETE ON public.empleado_documentos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- Bucket privado (public=false) -- todo acceso de lectura pasa por URLs
-- firmadas de corta duracion (createSignedUrl), nunca URLs publicas.
INSERT INTO storage.buckets (id, name, public)
VALUES ('empleados-documentos', 'empleados-documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Politicas sobre storage.objects: solo admin/rrhh pueden subir, listar/
-- descargar (via signed URL, que igual respeta RLS de SELECT) y borrar
-- archivos de este bucket. No se agrega politica para claude_readonly aqui
-- -- storage.objects es una tabla compartida entre TODOS los buckets del
-- proyecto (no solo este), administrada por Supabase; solo contiene
-- metadata (nombre/ruta), nunca el contenido del archivo, y no aporta
-- valor a las lecturas de solo-diagnostico de Claude Code.
CREATE POLICY empleados_documentos_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'empleados-documentos' AND auth_rol() IN ('admin','rrhh'));

CREATE POLICY empleados_documentos_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'empleados-documentos' AND auth_rol() IN ('admin','rrhh'));

CREATE POLICY empleados_documentos_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'empleados-documentos' AND auth_rol() IN ('admin','rrhh'));

COMMIT;
