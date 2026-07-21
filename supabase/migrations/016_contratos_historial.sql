-- 016_contratos_historial.sql
-- Proposito: modulo "Contratos" (hoy placeholder en src/pages/rrhh/Contratos.jsx).
-- empleados.tipo_contrato/contrato_hasta (migracion 007) solo guardan el
-- contrato VIGENTE -- al renovar, se pisaba el dato anterior sin dejar
-- rastro. Esta migracion agrega un historial completo (una fila por
-- contrato/renovacion) y una RPC que registra una renovacion de forma
-- atomica, sincronizando empleados.tipo_contrato/contrato_hasta para que
-- las alertas de "vencen pronto" ya existentes en Equipo.jsx
-- (getExpiringContracts, dbEmpleados.js) sigan funcionando sin cambios.
--
-- Dependencias: 002 (auth_rol), 004 (fn_audit_trigger), 007 (empleados).

BEGIN;

CREATE TABLE public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  empleado_id uuid NOT NULL REFERENCES public.empleados(id),
  tipo_contrato text NOT NULL CHECK (tipo_contrato IN
    ('Término fijo','Término indefinido','Prestación de servicios','Obra o labor','Aprendizaje')),
  fecha_inicio date NOT NULL,
  fecha_fin date,                       -- NULL = término indefinido, no vence
  salario_mensual numeric(12,2) NOT NULL DEFAULT 0 CHECK (salario_mensual >= 0),
  salario_no_constitutivo numeric(12,2) NOT NULL DEFAULT 0 CHECK (salario_no_constitutivo >= 0),
  estado text NOT NULL DEFAULT 'Vigente'
    CHECK (estado IN ('Vigente','Renovado','Vencido','Terminado')),
  notas text,
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_contratos_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE INDEX idx_contratos_empleado ON public.contratos (empleado_id, fecha_inicio DESC);
CREATE INDEX idx_contratos_vigentes ON public.contratos (tenant_id, fecha_fin) WHERE estado = 'Vigente';

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY claude_readonly_select_contratos ON public.contratos
  FOR SELECT TO claude_readonly USING (true);

CREATE POLICY contratos_select ON public.contratos
  FOR SELECT TO authenticated
  USING (auth_rol() IN ('admin','rrhh','gerencia'));

-- Igual que pagos_contratistas (migracion 006): se permite editar/borrar
-- directo para corregir errores de captura (fecha mal tipeada, nota, etc)
-- -- la creacion de una renovacion real pasa por la RPC de abajo porque
-- necesita sincronizar 2 tablas de forma atomica.
CREATE POLICY contratos_write ON public.contratos
  FOR UPDATE TO authenticated
  USING (auth_rol() IN ('admin','rrhh'))
  WITH CHECK (auth_rol() IN ('admin','rrhh'));

CREATE POLICY contratos_delete ON public.contratos
  FOR DELETE TO authenticated
  USING (auth_rol() IN ('admin','rrhh'));

-- Toda creacion pasa por fn_registrar_contrato (abajo) -- no se permite
-- INSERT directo, evita dejar un historial desincronizado de
-- empleados.tipo_contrato/contrato_hasta.
REVOKE INSERT ON public.contratos FROM authenticated;

CREATE TRIGGER trg_audit_contratos
  AFTER INSERT OR UPDATE OR DELETE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- fn_registrar_contrato(): registra un contrato nuevo (alta o renovacion)
-- para un empleado. Marca como 'Renovado' cualquier contrato que siguiera
-- 'Vigente' del mismo empleado, inserta el nuevo como 'Vigente', y
-- sincroniza empleados.tipo_contrato/contrato_hasta -- todo en una sola
-- transaccion (atomicidad implicita de la funcion).
CREATE FUNCTION public.fn_registrar_contrato(
  p_empleado_id uuid,
  p_tipo_contrato text,
  p_fecha_inicio date,
  p_fecha_fin date,
  p_salario_mensual numeric,
  p_salario_no_constitutivo numeric,
  p_notas text
) RETURNS public.contratos
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.contratos;
BEGIN
  IF auth_rol() NOT IN ('admin','rrhh') THEN
    RAISE EXCEPTION 'permiso denegado' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM public.empleados WHERE id = p_empleado_id FOR UPDATE NOWAIT;

  UPDATE public.contratos SET estado = 'Renovado'
    WHERE empleado_id = p_empleado_id AND estado = 'Vigente';

  INSERT INTO public.contratos (
    tenant_id, empleado_id, tipo_contrato, fecha_inicio, fecha_fin,
    salario_mensual, salario_no_constitutivo, estado, notas
  ) VALUES (
    'ada', p_empleado_id, p_tipo_contrato, p_fecha_inicio, p_fecha_fin,
    p_salario_mensual, p_salario_no_constitutivo, 'Vigente', p_notas
  ) RETURNING * INTO v_row;

  UPDATE public.empleados
    SET tipo_contrato = p_tipo_contrato, contrato_hasta = p_fecha_fin
    WHERE id = p_empleado_id;

  RETURN v_row;
END $$;

GRANT EXECUTE ON FUNCTION public.fn_registrar_contrato TO authenticated;

COMMIT;
