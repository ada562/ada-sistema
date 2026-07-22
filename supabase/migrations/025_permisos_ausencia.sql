-- 025_permisos_ausencia.sql
-- Proposito: modulo "Permisos" (solicitud de ausencia) -- el empleado solicita
-- con minimo 15 dias de anticipacion; solo admin aprueba/rechaza. Al aprobar,
-- se autocompleta el rango como bloque "Permiso" en registro_horas (mismo
-- mecanismo de nota-prefix "[Permiso:Salud|Personal]" que ya usa
-- BitacoraSemanaGrid.jsx desde la sesion anterior), para que el empleado no
-- tenga que cargarlo de nuevo a mano.
--
-- Ubicacion en el sidebar: departamento "Gestion Humana" (src/data/departments.js,
-- modulo id 'permisos') -- por eso, ademas de admin (aprobar) y empleado (su
-- propia solicitud), se agrega tambien lectura para rrhh (visibilidad del
-- estado de las solicitudes de todo el equipo, consistente con que 'reportes'
-- y 'tareas' ya le dan lectura a rrhh sobre datos de todos los empleados).
--
-- Dependencias: auth_rol() (002), fn_empleado_id() (013), fn_audit_trigger()
-- (004), registro_horas (011, con proyecto_id nullable desde 014).

BEGIN;

CREATE TABLE public.permisos_ausencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL CHECK (fecha_fin >= fecha_inicio),
  motivo text NOT NULL CHECK (motivo IN ('Salud', 'Personal')),
  descripcion text,
  estado text NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Aprobado', 'Rechazado')),
  notas_admin text,
  resuelto_por uuid REFERENCES auth.users(id),
  resuelto_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_permisos_ausencia_empleado_id ON public.permisos_ausencia (empleado_id);
CREATE INDEX idx_permisos_ausencia_estado ON public.permisos_ausencia (estado);

ALTER TABLE public.permisos_ausencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY claude_readonly_select_permisos_ausencia ON public.permisos_ausencia
  FOR SELECT TO claude_readonly USING (true);

CREATE POLICY permisos_ausencia_select_propio ON public.permisos_ausencia
  FOR SELECT TO authenticated
  USING (auth_rol() = 'empleado' AND empleado_id = fn_empleado_id());

CREATE POLICY permisos_ausencia_select_admin ON public.permisos_ausencia
  FOR SELECT TO authenticated USING (auth_rol() IN ('admin', 'rrhh'));

-- El empleado solo puede crear su propia solicitud, y solo si respeta el
-- minimo de 15 dias de anticipacion (ademas de la validacion espejo en el
-- cliente, para dar feedback inmediato antes de golpear la RLS).
CREATE POLICY permisos_ausencia_insert_propio ON public.permisos_ausencia
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_rol() = 'empleado' AND empleado_id = fn_empleado_id()
    AND fecha_inicio >= CURRENT_DATE + INTERVAL '15 days'
  );

-- Sin politica de UPDATE directa a proposito -- aprobar/rechazar pasa por
-- fn_resolver_permiso_ausencia() (SECURITY DEFINER) para poder autocompletar
-- registro_horas atomicamente en el mismo cambio de estado.
REVOKE UPDATE ON public.permisos_ausencia FROM authenticated;

CREATE TRIGGER trg_audit_permisos_ausencia
  AFTER INSERT OR UPDATE OR DELETE ON public.permisos_ausencia
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE FUNCTION public.fn_resolver_permiso_ausencia(
  p_id uuid, p_estado text, p_notas text DEFAULT NULL
) RETURNS public.permisos_ausencia LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_permiso public.permisos_ausencia; v_fecha date;
BEGIN
  IF auth_rol() <> 'admin' THEN
    RAISE EXCEPTION 'permiso denegado' USING ERRCODE = '42501';
  END IF;
  IF p_estado NOT IN ('Aprobado', 'Rechazado') THEN
    RAISE EXCEPTION 'estado invalido: %', p_estado;
  END IF;

  UPDATE public.permisos_ausencia SET
    estado = p_estado, notas_admin = p_notas,
    resuelto_por = auth.uid(), resuelto_at = now()
  WHERE id = p_id AND estado = 'Pendiente'
  RETURNING * INTO v_permiso;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'solicitud no encontrada o ya resuelta';
  END IF;

  -- Autocompleta registro_horas como bloque "Permiso" en cada dia del rango
  -- (mismo mecanismo de nota-prefix que BitacoraSemanaGrid.jsx). dias=8 es un
  -- supuesto de jornada completa por dia de permiso -- ajustable a futuro sin
  -- romper nada mas si se prefiere calcular contra tipo_horario del empleado.
  IF p_estado = 'Aprobado' THEN
    v_fecha := v_permiso.fecha_inicio;
    WHILE v_fecha <= v_permiso.fecha_fin LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.registro_horas
        WHERE empleado_id = v_permiso.empleado_id AND fecha = v_fecha AND proyecto_id IS NULL
      ) THEN
        INSERT INTO public.registro_horas (tenant_id, empleado_id, proyecto_id, fecha, dias, nota)
        VALUES (
          'ada', v_permiso.empleado_id, NULL, v_fecha, 8,
          '[Permiso:' || v_permiso.motivo || ']' ||
            CASE WHEN v_permiso.descripcion IS NOT NULL AND btrim(v_permiso.descripcion) <> ''
              THEN ' ' || v_permiso.descripcion ELSE '' END
        );
      END IF;
      v_fecha := v_fecha + 1;
    END LOOP;
  END IF;

  RETURN v_permiso;
END $$;

GRANT EXECUTE ON FUNCTION public.fn_resolver_permiso_ausencia TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.permisos_ausencia;

INSERT INTO public.permisos (rol, modulo, accion) VALUES
  ('empleado', 'permisos', 'leer'), ('empleado', 'permisos', 'escribir'),
  ('admin', 'permisos', 'leer'), ('admin', 'permisos', 'escribir'),
  ('rrhh', 'permisos', 'leer');

COMMIT;
