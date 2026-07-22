-- 024_tareas_calendario.sql
-- Proposito: modulo "Tareas" del portal empleado -- pedido explicito del
-- usuario: "deber ser en otro item lo mismo que los reportes debe llamarse
-- tareas hay iria calendario y reportes". Dos piezas:
--
-- 1) tareas: calendario mensual estilo Asana (tareas cortas por dia,
--    marcables como completadas) -- confirmado explicitamente "calendario
--    mensual estilo Asana", distinto de BitacoraSemanaGrid (esa es de horas
--    por proyecto, esta es de pendientes/agenda).
--
-- 2) acceso_diario: hora de llegada capturada automaticamente al iniciar
--    sesion (primera vez del dia), para comparar contra empleados.
--    tipo_horario (src/lib/horarios.js) y mostrar puntual/tarde en la vista
--    "Tareas > Reportes" (solo admin/rrhh, NO el propio empleado -- pedido
--    explicito via AskUserQuestion). El UNIQUE (tenant_id, empleado_id,
--    fecha) es lo que hace atomica la captura "primera vez del dia".
--
-- Dependencias: auth_rol() (002), fn_empleado_id() (013), empleados (001).

BEGIN;

CREATE TABLE public.tareas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  titulo text NOT NULL,
  completada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tareas_tenant_empleado_fecha ON public.tareas (tenant_id, empleado_id, fecha);

ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;

CREATE POLICY claude_readonly_select_tareas ON public.tareas
  FOR SELECT TO claude_readonly USING (true);

-- Empleado: solo su propia agenda.
CREATE POLICY tareas_select_propio ON public.tareas
  FOR SELECT TO authenticated
  USING (auth_rol() = 'empleado' AND empleado_id = fn_empleado_id());
CREATE POLICY tareas_write_propio ON public.tareas
  FOR ALL TO authenticated
  USING (auth_rol() = 'empleado' AND empleado_id = fn_empleado_id())
  WITH CHECK (auth_rol() = 'empleado' AND empleado_id = fn_empleado_id());

-- admin/rrhh: ven y gestionan la agenda de cualquier empleado (soporte +
-- vista "Reportes").
CREATE POLICY tareas_select_admin ON public.tareas
  FOR SELECT TO authenticated USING (auth_rol() IN ('admin', 'rrhh'));
CREATE POLICY tareas_write_admin ON public.tareas
  FOR ALL TO authenticated
  USING (auth_rol() IN ('admin', 'rrhh')) WITH CHECK (auth_rol() IN ('admin', 'rrhh'));

CREATE TABLE public.acceso_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora_llegada timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, empleado_id, fecha)
);

ALTER TABLE public.acceso_diario ENABLE ROW LEVEL SECURITY;

CREATE POLICY claude_readonly_select_acceso_diario ON public.acceso_diario
  FOR SELECT TO claude_readonly USING (true);

CREATE POLICY acceso_diario_select_propio ON public.acceso_diario
  FOR SELECT TO authenticated
  USING (auth_rol() = 'empleado' AND empleado_id = fn_empleado_id());

-- admin/rrhh leen el reporte de todos (modulo Tareas > Reportes).
CREATE POLICY acceso_diario_select_admin ON public.acceso_diario
  FOR SELECT TO authenticated USING (auth_rol() IN ('admin', 'rrhh'));

-- Sin politica de INSERT directa a proposito -- la captura pasa por
-- fn_registrar_acceso_diario() (SECURITY DEFINER) para resolver
-- empleado_id server-side y no depender de que el cliente lo mande.
CREATE FUNCTION public.fn_registrar_acceso_diario()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth_rol() <> 'empleado' THEN
    RETURN;
  END IF;

  INSERT INTO public.acceso_diario (tenant_id, empleado_id)
  VALUES ('ada', fn_empleado_id())
  ON CONFLICT (tenant_id, empleado_id, fecha) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_registrar_acceso_diario TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.tareas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.acceso_diario;

INSERT INTO public.permisos (rol, modulo, accion) VALUES
  ('empleado', 'tareas', 'leer'),
  ('empleado', 'tareas', 'escribir'),
  ('admin', 'tareas', 'leer'),
  ('admin', 'tareas', 'escribir'),
  ('rrhh', 'tareas', 'leer');

COMMIT;
