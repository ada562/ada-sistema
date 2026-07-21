-- 006_contratistas_pagos_rpc.sql
-- Proposito: Fase 5 del plan de migracion a Supabase. Tablas `contratistas` y
-- `pagos_contratistas` (cuentas de cobro con abonos parciales), RPC atomica
-- para registrar un abono (actualiza el saldo pagado Y crea el gasto
-- correspondiente en `transacciones` en una sola transaccion), y vista de
-- resumen financiero por contratista. Reemplaza el almacenamiento en
-- localStorage de `src/lib/dbContratistas.js` (claves `ada_contractors`,
-- `ada_contractor_payments`) -- una de las 3 fuentes de perdida de datos
-- reportadas originalmente por el usuario (pagos a contratistas).
--
-- Dependencias: auth_rol() (migracion 002); transacciones, audit_log,
-- fn_audit_trigger() (migracion 004, ejecutada y verificada); categorias
-- (migracion 003, para la categoria 'CONTRATISTAS' que usa la RPC de abono).

CREATE TABLE public.contratistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  nombre text NOT NULL,
  telefono text,
  email text,
  activo boolean NOT NULL DEFAULT true,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contratistas_tenant_id ON public.contratistas (tenant_id);

ALTER TABLE public.contratistas ENABLE ROW LEVEL SECURITY;

CREATE POLICY contratistas_select ON public.contratistas
  FOR SELECT TO authenticated
  USING (auth_rol() IN ('admin','gerencia','contabilidad'));

CREATE POLICY contratistas_write ON public.contratistas
  FOR ALL TO authenticated
  USING (auth_rol() IN ('admin','contabilidad'))
  WITH CHECK (auth_rol() IN ('admin','contabilidad'));

CREATE POLICY claude_readonly_select_contratistas ON public.contratistas
  FOR SELECT TO claude_readonly USING (true);

-- Cuentas de cobro / pagos a contratistas. Crear/editar el registro (monto
-- facturado, descripcion) no mueve dinero -- permitido directo. El abono
-- (monto_pagado) SIEMPRE pasa por fn_registrar_abono_contratista, nunca por
-- UPDATE directo del cliente, para mantener el gasto en Tesoreria en sync.
CREATE TABLE public.pagos_contratistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  contratista_id uuid NOT NULL REFERENCES public.contratistas(id),
  fecha date NOT NULL,
  fecha_abono date,
  fecha_pago_total date,
  monto numeric(12,2) NOT NULL CHECK (monto > 0),
  monto_pagado numeric(12,2) NOT NULL DEFAULT 0 CHECK (monto_pagado >= 0),
  descripcion text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pagos_contratistas_tenant_id ON public.pagos_contratistas (tenant_id);
CREATE INDEX idx_pagos_contratistas_contratista_id ON public.pagos_contratistas (contratista_id);

ALTER TABLE public.pagos_contratistas ENABLE ROW LEVEL SECURITY;

CREATE POLICY pagos_contratistas_select ON public.pagos_contratistas
  FOR SELECT TO authenticated
  USING (auth_rol() IN ('admin','gerencia','contabilidad'));

CREATE POLICY pagos_contratistas_insert ON public.pagos_contratistas
  FOR INSERT TO authenticated
  WITH CHECK (auth_rol() IN ('admin','contabilidad'));

CREATE POLICY pagos_contratistas_update ON public.pagos_contratistas
  FOR UPDATE TO authenticated
  USING (auth_rol() IN ('admin','contabilidad'))
  WITH CHECK (auth_rol() IN ('admin','contabilidad'));

CREATE POLICY pagos_contratistas_delete ON public.pagos_contratistas
  FOR DELETE TO authenticated
  USING (auth_rol() IN ('admin','contabilidad'));

CREATE POLICY claude_readonly_select_pagos_contratistas ON public.pagos_contratistas
  FOR SELECT TO claude_readonly USING (true);

CREATE TRIGGER trg_audit_pagos_contratistas
  AFTER INSERT OR UPDATE OR DELETE ON public.pagos_contratistas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- transacciones gana la relacion hacia contratista/pago (no existia en la
-- migracion 004 -- estas tablas no existian todavia).
ALTER TABLE public.transacciones
  ADD COLUMN contratista_id uuid REFERENCES public.contratistas(id),
  ADD COLUMN pago_contratista_id uuid REFERENCES public.pagos_contratistas(id);

CREATE INDEX idx_transacciones_contratista_id ON public.transacciones (contratista_id);
CREATE INDEX idx_transacciones_pago_contratista_id ON public.transacciones (pago_contratista_id);

-- RPC: registrar abono a una cuenta de cobro. Bloquea la fila del pago,
-- suma el abono a monto_pagado, marca fecha_pago_total si queda saldado, y
-- crea el gasto correspondiente en transacciones -- todo en una transaccion
-- atomica (o se aplican los 2 cambios o ninguno).
CREATE FUNCTION public.fn_registrar_abono_contratista(
  p_pago_id uuid, p_monto numeric, p_fecha date, p_metodo text
) RETURNS public.pagos_contratistas LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pago public.pagos_contratistas; v_nombre text; v_cat uuid;
BEGIN
  IF auth_rol() NOT IN ('admin','contabilidad') THEN
    RAISE EXCEPTION 'permiso denegado' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pago FROM public.pagos_contratistas WHERE id = p_pago_id FOR UPDATE NOWAIT;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pago no encontrado';
  END IF;

  IF p_monto <= 0 THEN
    RAISE EXCEPTION 'el monto del abono debe ser mayor a 0';
  END IF;

  UPDATE public.pagos_contratistas SET
    monto_pagado = v_pago.monto_pagado + p_monto,
    fecha_abono = p_fecha,
    fecha_pago_total = CASE WHEN v_pago.monto_pagado + p_monto >= v_pago.monto THEN p_fecha ELSE fecha_pago_total END
  WHERE id = p_pago_id
  RETURNING * INTO v_pago;

  SELECT nombre INTO v_nombre FROM public.contratistas WHERE id = v_pago.contratista_id;
  SELECT id INTO v_cat FROM public.categorias WHERE nombre = 'CONTRATISTAS' AND tipo = 'gasto' AND tenant_id = 'ada' LIMIT 1;

  INSERT INTO public.transacciones (tenant_id, fecha, tipo, cuenta, monto, categoria_id, contratista_id, pago_contratista_id, descripcion)
  VALUES ('ada', p_fecha, 'gasto', p_metodo, p_monto, v_cat, v_pago.contratista_id, p_pago_id,
          'Pago a ' || COALESCE(v_nombre, 'Contratista') || COALESCE(' — ' || NULLIF(v_pago.descripcion, ''), ''));

  RETURN v_pago;
END $$;

GRANT EXECUTE ON FUNCTION public.fn_registrar_abono_contratista TO authenticated;

-- Vista resumen financiero por contratista: total facturado, total pagado, pendiente
CREATE VIEW public.vw_contratistas_resumen
WITH (security_invoker = true) AS
SELECT tenant_id, contratista_id,
  SUM(monto) AS total_facturado,
  SUM(monto_pagado) AS total_pagado,
  SUM(monto) - SUM(monto_pagado) AS pendiente,
  COUNT(*) AS total_cuentas
FROM public.pagos_contratistas
GROUP BY tenant_id, contratista_id;

GRANT SELECT ON public.vw_contratistas_resumen TO authenticated;
GRANT SELECT ON public.vw_contratistas_resumen TO claude_readonly;
