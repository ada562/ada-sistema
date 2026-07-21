-- 015_arqueo_caja.sql
-- Proposito: "arqueo de caja" -- comparar el saldo que calcula el sistema
-- (vw_saldos_cuentas, migracion 004) contra el conteo fisico real de la
-- cuenta (normalmente 'efectivo') y dejar registro historico de cada
-- conteo con la diferencia (sobrante/faltante). Pedido por el usuario para
-- poder cuadrar caja al final del dia.
--
-- No mueve dinero (no toca 'transacciones') -- es un snapshot de
-- reconciliacion, por eso no requiere una RPC con FOR UPDATE NOWAIT como
-- las operaciones de dinero (004/005/006/008). Se audita igual via
-- fn_audit_trigger() (migracion 004) por tratarse de un registro contable.
--
-- Dependencias: auth_rol() (002), cuentas (003), fn_audit_trigger() (004).

BEGIN;

CREATE TABLE public.arqueo_caja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  cuenta text NOT NULL,
  saldo_sistema numeric(14,2) NOT NULL,
  saldo_contado numeric(14,2) NOT NULL CHECK (saldo_contado >= 0),
  diferencia numeric(14,2) GENERATED ALWAYS AS (saldo_contado - saldo_sistema) STORED,
  notas text,
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_arqueo_caja_cuenta FOREIGN KEY (tenant_id, cuenta) REFERENCES public.cuentas (tenant_id, codigo)
);

CREATE INDEX idx_arqueo_caja_tenant_fecha ON public.arqueo_caja (tenant_id, fecha DESC);
CREATE INDEX idx_arqueo_caja_cuenta ON public.arqueo_caja (cuenta);

ALTER TABLE public.arqueo_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY claude_readonly_select_arqueo_caja ON public.arqueo_caja
  FOR SELECT TO claude_readonly USING (true);

CREATE POLICY arqueo_caja_select ON public.arqueo_caja
  FOR SELECT TO authenticated
  USING (auth_rol() IN ('admin', 'contabilidad', 'gerencia'));

-- Solo se inserta (historial inmutable, igual que pagos_nomina/pagos
-- prima) -- si un arqueo se hizo mal, se corrige con un arqueo nuevo, no
-- editando el anterior.
CREATE POLICY arqueo_caja_insert ON public.arqueo_caja
  FOR INSERT TO authenticated
  WITH CHECK (auth_rol() IN ('admin', 'contabilidad'));

CREATE TRIGGER trg_audit_arqueo_caja
  AFTER INSERT OR UPDATE OR DELETE ON public.arqueo_caja
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

COMMIT;
