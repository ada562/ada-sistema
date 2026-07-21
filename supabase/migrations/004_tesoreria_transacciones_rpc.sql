-- 004_tesoreria_transacciones_rpc.sql
-- Proposito: Fase 4 del plan de migracion a Supabase. Tabla `transacciones`
-- (el libro mayor de Tesoreria), con RPCs atomicas para registrar movimientos
-- y traslados entre cuentas, tabla de auditoria general (`audit_log`,
-- reutilizada por las fases siguientes: contratistas, empleados/nomina) y una
-- vista de saldos por cuenta. Reemplaza el almacenamiento en localStorage de
-- `src/lib/dbTesoreria.js` (clave `ada_transactions`), causa raiz confirmada
-- de la perdida de datos reportada por el usuario (pestañas viejas pisando
-- datos nuevos sin aviso, sin sincronizacion entre pestañas).
--
-- Dependencias: auth_rol() (migracion 002); cuentas, categorias, configuracion
-- (migracion 003, ya ejecutada y verificada 2026-07-18).

CREATE TABLE public.transacciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  fecha date NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('ingreso','gasto')),
  cuenta text,
  monto numeric(14,2) NOT NULL CHECK (monto > 0),
  categoria_id uuid REFERENCES public.categorias(id),
  descripcion text,
  gba_movimiento text CHECK (gba_movimiento IN ('prestamo_otorgado','prestamo_recibido','pago_prestamo','cobro_prestamo')),
  facturado boolean NOT NULL DEFAULT false,
  proyecto_id text,
  servicio_id text,
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_transacciones_cuenta FOREIGN KEY (tenant_id, cuenta) REFERENCES public.cuentas (tenant_id, codigo)
);
-- proyecto_id/servicio_id son `text` (sin FK) a proposito: `proyectos`/`servicios`
-- todavia viven en localStorage con ids tipo 'id_xxxxx' (no uuid), migracion
-- prevista para Fase 8-9. Necesarios YA porque ProyectoDetalle.jsx filtra
-- transacciones por proyecto/servicio (vista financiera de cada proyecto) --
-- omitirlos rompe esa funcionalidad hoy mismo. Cuando Fase 8-9 migre
-- proyectos/servicios a Supabase con uuid reales, una migracion correctiva
-- debe: (1) remapear estos valores text a los nuevos uuid, (2) convertir el
-- tipo de columna a uuid, (3) agregar las FK reales.
-- contratista_id, pago_contratista_id, nomina_payment_id se agregan via
-- ALTER TABLE en fases posteriores (5, 6-7) con FK real (esas tablas nacen ya en Supabase).

CREATE INDEX idx_transacciones_tenant_id ON public.transacciones (tenant_id);
CREATE INDEX idx_transacciones_fecha ON public.transacciones (fecha);
CREATE INDEX idx_transacciones_cuenta ON public.transacciones (cuenta);
CREATE INDEX idx_transacciones_categoria_id ON public.transacciones (categoria_id);
CREATE INDEX idx_transacciones_created_by ON public.transacciones (created_by);
CREATE INDEX idx_transacciones_proyecto_id ON public.transacciones (proyecto_id);
CREATE INDEX idx_transacciones_servicio_id ON public.transacciones (servicio_id);

ALTER TABLE public.transacciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY transacciones_select ON public.transacciones
  FOR SELECT TO authenticated
  USING (auth_rol() IN ('admin','gerencia','contabilidad'));

CREATE POLICY transacciones_update ON public.transacciones
  FOR UPDATE TO authenticated
  USING (auth_rol() IN ('admin','contabilidad'))
  WITH CHECK (auth_rol() IN ('admin','contabilidad'));

CREATE POLICY transacciones_delete ON public.transacciones
  FOR DELETE TO authenticated
  USING (auth_rol() IN ('admin','contabilidad'));

CREATE POLICY claude_readonly_select_transacciones ON public.transacciones
  FOR SELECT TO claude_readonly USING (true);

-- Todo insert nuevo debe pasar por las RPC de abajo (disciplina de bloqueo
-- FOR UPDATE NOWAIT); nunca INSERT directo desde el cliente.
REVOKE INSERT ON public.transacciones FROM authenticated;

-- Auditoria general -- se crea una sola vez aqui, se reutiliza en fases siguientes
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  tabla text NOT NULL,
  registro_id uuid NOT NULL,
  accion text NOT NULL CHECK (accion IN ('insert','update','delete')),
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  actor_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_tabla_registro ON public.audit_log (tabla, registro_id);
CREATE INDEX idx_audit_log_actor_id ON public.audit_log (actor_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_select_admin ON public.audit_log
  FOR SELECT TO authenticated USING (auth_rol() = 'admin');

CREATE POLICY claude_readonly_select_audit_log ON public.audit_log
  FOR SELECT TO claude_readonly USING (true);

CREATE FUNCTION public.fn_audit_trigger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log(tenant_id, tabla, registro_id, accion, datos_anteriores, datos_nuevos, actor_id)
  VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id), TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id), lower(TG_OP),
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_audit_transacciones
  AFTER INSERT OR UPDATE OR DELETE ON public.transacciones
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- RPC: registrar un movimiento simple (ingreso o gasto)
CREATE FUNCTION public.fn_registrar_transaccion(
  p_fecha date, p_tipo text, p_cuenta text, p_monto numeric,
  p_categoria_id uuid, p_descripcion text,
  p_proyecto_id text DEFAULT NULL, p_servicio_id text DEFAULT NULL
) RETURNS public.transacciones LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.transacciones;
BEGIN
  IF auth_rol() NOT IN ('admin','contabilidad','gerencia') THEN
    RAISE EXCEPTION 'permiso denegado' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.cuentas WHERE codigo = p_cuenta AND tenant_id = 'ada' FOR UPDATE NOWAIT;
  INSERT INTO public.transacciones (tenant_id, fecha, tipo, cuenta, monto, categoria_id, descripcion, proyecto_id, servicio_id)
  VALUES ('ada', p_fecha, p_tipo, p_cuenta, p_monto, p_categoria_id, p_descripcion, p_proyecto_id, p_servicio_id)
  RETURNING * INTO v_row;
  RETURN v_row;
END $$;

GRANT EXECUTE ON FUNCTION public.fn_registrar_transaccion TO authenticated;

-- RPC: traslado entre cuentas -- crea 2 filas atomicamente (gasto en origen, ingreso en destino)
CREATE FUNCTION public.fn_registrar_traslado_entre_cuentas(
  p_fecha date, p_cuenta_origen text, p_cuenta_destino text, p_monto numeric, p_descripcion text
) RETURNS SETOF public.transacciones LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_first text; v_second text;
BEGIN
  IF auth_rol() NOT IN ('admin','contabilidad') THEN
    RAISE EXCEPTION 'permiso denegado' USING ERRCODE = '42501';
  END IF;
  SELECT LEAST(p_cuenta_origen, p_cuenta_destino), GREATEST(p_cuenta_origen, p_cuenta_destino) INTO v_first, v_second;
  PERFORM 1 FROM public.cuentas WHERE codigo = v_first FOR UPDATE NOWAIT;
  PERFORM 1 FROM public.cuentas WHERE codigo = v_second FOR UPDATE NOWAIT;

  RETURN QUERY
  INSERT INTO public.transacciones (tenant_id, fecha, tipo, cuenta, monto, categoria_id, descripcion)
  VALUES
    ('ada', p_fecha, 'gasto', p_cuenta_origen, p_monto,
      (SELECT id FROM public.categorias WHERE nombre = 'TRASLADO ENTRE CUENTAS' AND tipo = 'gasto' AND tenant_id = 'ada' LIMIT 1),
      p_descripcion),
    ('ada', p_fecha, 'ingreso', p_cuenta_destino, p_monto,
      (SELECT id FROM public.categorias WHERE nombre = 'TRASLADO ENTRE CUENTAS' AND tipo = 'ingreso' AND tenant_id = 'ada' LIMIT 1),
      p_descripcion)
  RETURNING *;
END $$;

GRANT EXECUTE ON FUNCTION public.fn_registrar_traslado_entre_cuentas TO authenticated;

-- Vista de saldos por cuenta: saldo inicial (de `configuracion`) + suma de movimientos
CREATE VIEW public.vw_saldos_cuentas
WITH (security_invoker = true) AS
SELECT c.tenant_id, c.codigo, c.nombre,
  (CASE c.codigo
     WHEN 'banco' THEN cfg.saldo_inicial_banco
     WHEN 'efectivo' THEN cfg.saldo_inicial_efectivo
     WHEN 'nequi' THEN cfg.saldo_inicial_nequi
     ELSE 0
   END)
  + COALESCE(SUM(CASE WHEN t.tipo = 'ingreso' THEN t.monto WHEN t.tipo = 'gasto' THEN -t.monto END), 0) AS saldo
FROM public.cuentas c
JOIN public.configuracion cfg ON cfg.tenant_id = c.tenant_id
LEFT JOIN public.transacciones t ON t.cuenta = c.codigo AND t.tenant_id = c.tenant_id
GROUP BY c.tenant_id, c.codigo, c.nombre, cfg.saldo_inicial_banco, cfg.saldo_inicial_efectivo, cfg.saldo_inicial_nequi;

GRANT SELECT ON public.vw_saldos_cuentas TO authenticated;
GRANT SELECT ON public.vw_saldos_cuentas TO claude_readonly;
