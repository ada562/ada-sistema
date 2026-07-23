-- 028_conciliacion_transacciones.sql
-- Proposito: nuevo modulo "Conciliacion" (Contabilidad) pedido por el
-- usuario tras el descuadre de efectivo detectado en Tesoreria: una
-- pantalla para revisar, movimiento por movimiento, todos los registros de
-- una cuenta (efectivo/banco/nequi) hasta que el monto "por revisar" llegue
-- a $0 -- asi encuentra mas facil cual movimiento esta mal sin repasar los
-- 69+ registros a ojo cada vez.
--
-- Se agrega `conciliado` (boolean) a `transacciones`: marca si el usuario ya
-- verifico ese movimiento contra su registro fisico/bancario real. No mueve
-- dinero ni afecta vw_saldos_cuentas -- es metadata de revision, se
-- actualiza con UPDATE directo (ya permitido por la policy
-- transacciones_update de la migracion 004 para admin/contabilidad).
--
-- Dependencias: transacciones (004), permisos/auth_rol() (002).

BEGIN;

ALTER TABLE public.transacciones
  ADD COLUMN IF NOT EXISTS conciliado boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_transacciones_conciliado
  ON public.transacciones (tenant_id, cuenta, conciliado);

INSERT INTO public.permisos (rol, modulo, accion) VALUES
  ('contabilidad', 'conciliacion', 'leer'),
  ('contabilidad', 'conciliacion', 'escribir'),
  ('gerencia', 'conciliacion', 'leer');

COMMIT;
