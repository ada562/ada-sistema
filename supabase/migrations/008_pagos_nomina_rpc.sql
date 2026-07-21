-- 008_pagos_nomina_rpc.sql
-- Proposito: Fase 7 del plan de migracion a Supabase. Tabla `pagos_nomina`
-- (pagos de salario/prima a empleados) y RPC atomica que registra el pago
-- Y crea el gasto correspondiente en `transacciones` en una sola transaccion
-- -- mismo patron que fn_registrar_abono_contratista (migracion 006).
-- Reemplaza el almacenamiento en localStorage de `src/lib/dbNomina.js`
-- (clave `ada_payroll`) -- una de las 3 fuentes de perdida de datos
-- reportadas originalmente por el usuario (sueldos de Equipo/nomina).
--
-- Dependencias: auth_rol() (migracion 002); transacciones, audit_log,
-- fn_audit_trigger() (migracion 004, ejecutada y verificada); categorias
-- (migracion 003, categoria 'NOMINA'); empleados (migracion 007).

CREATE TABLE public.pagos_nomina (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  empleado_id uuid NOT NULL REFERENCES public.empleados(id),
  fecha date NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('legal','no_constitutivo','prima_legal','prima_no_constitutivo')),
  quincena smallint CHECK (quincena IN (1,2)),
  periodo_inicio date,
  periodo_fin date,
  semestre smallint CHECK (semestre IN (1,2)),
  monto numeric(12,2) NOT NULL CHECK (monto > 0),
  metodo text NOT NULL DEFAULT 'banco',
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pagos_nomina_tenant_id ON public.pagos_nomina (tenant_id);
CREATE INDEX idx_pagos_nomina_empleado_id ON public.pagos_nomina (empleado_id);

ALTER TABLE public.pagos_nomina ENABLE ROW LEVEL SECURITY;

CREATE POLICY pagos_nomina_select ON public.pagos_nomina
  FOR SELECT TO authenticated
  USING (auth_rol() IN ('admin','rrhh','gerencia'));

-- Sin INSERT/UPDATE/DELETE directo para authenticated -- todo pago de nomina
-- se crea exclusivamente via fn_registrar_pago_nomina (historial practicamente
-- inmutable; correcciones puntuales quedan fuera de este corte).
REVOKE INSERT, UPDATE, DELETE ON public.pagos_nomina FROM authenticated;

CREATE POLICY claude_readonly_select_pagos_nomina ON public.pagos_nomina
  FOR SELECT TO claude_readonly USING (true);

CREATE TRIGGER trg_audit_pagos_nomina
  AFTER INSERT OR UPDATE OR DELETE ON public.pagos_nomina
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- transacciones gana la relacion hacia el pago de nomina (no existia en la
-- migracion 004 -- esta tabla no existia todavia).
ALTER TABLE public.transacciones
  ADD COLUMN nomina_payment_id uuid REFERENCES public.pagos_nomina(id);

CREATE INDEX idx_transacciones_nomina_payment_id ON public.transacciones (nomina_payment_id);

-- RPC: registrar un pago de nomina. Bloquea la fila del empleado, inserta el
-- pago y crea el gasto correspondiente en transacciones -- todo en una
-- transaccion atomica (o se aplican los 2 cambios o ninguno).
CREATE FUNCTION public.fn_registrar_pago_nomina(
  p_empleado_id uuid, p_fecha date, p_tipo text, p_quincena smallint,
  p_periodo_inicio date, p_periodo_fin date, p_semestre smallint,
  p_monto numeric, p_metodo text, p_notas text
) RETURNS public.pagos_nomina LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pago public.pagos_nomina; v_nombre text; v_cargo text; v_cat uuid; v_label text; v_periodo_info text;
BEGIN
  IF auth_rol() NOT IN ('admin','rrhh') THEN
    RAISE EXCEPTION 'permiso denegado' USING ERRCODE = '42501';
  END IF;

  IF p_monto <= 0 THEN
    RAISE EXCEPTION 'el monto del pago debe ser mayor a 0';
  END IF;

  PERFORM 1 FROM public.empleados WHERE id = p_empleado_id FOR UPDATE NOWAIT;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'empleado no encontrado';
  END IF;

  SELECT nombre, cargo INTO v_nombre, v_cargo FROM public.empleados WHERE id = p_empleado_id;

  INSERT INTO public.pagos_nomina (
    tenant_id, empleado_id, fecha, tipo, quincena, periodo_inicio, periodo_fin,
    semestre, monto, metodo, notas
  ) VALUES (
    'ada', p_empleado_id, p_fecha, p_tipo, p_quincena, p_periodo_inicio, p_periodo_fin,
    p_semestre, p_monto, COALESCE(p_metodo, 'banco'), p_notas
  ) RETURNING * INTO v_pago;

  SELECT id INTO v_cat FROM public.categorias WHERE nombre = 'NOMINA' AND tipo = 'gasto' AND tenant_id = 'ada' LIMIT 1;

  v_label := CASE p_tipo
    WHEN 'legal' THEN 'Salario Legal'
    WHEN 'no_constitutivo' THEN 'Salario No Constitutivo'
    WHEN 'prima_legal' THEN 'Prima Legal'
    WHEN 'prima_no_constitutivo' THEN 'Prima No Constitutivo'
    ELSE p_tipo
  END;
  v_periodo_info := CASE WHEN p_semestre IS NOT NULL THEN 'Semestre ' || p_semestre ELSE 'Q' || COALESCE(p_quincena::text, '?') END;

  INSERT INTO public.transacciones (tenant_id, fecha, tipo, cuenta, monto, categoria_id, nomina_payment_id, descripcion)
  VALUES ('ada', p_fecha, 'gasto', COALESCE(p_metodo, 'banco'), p_monto, v_cat, v_pago.id,
          v_label || ' — ' || COALESCE(v_nombre, 'Empleado') || COALESCE(' (' || v_cargo || ')', '') || ' — ' || v_periodo_info);

  RETURN v_pago;
END $$;

GRANT EXECUTE ON FUNCTION public.fn_registrar_pago_nomina TO authenticated;
