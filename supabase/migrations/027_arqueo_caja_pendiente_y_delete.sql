-- 027_arqueo_caja_pendiente_y_delete.sql
-- Proposito: dos pedidos del usuario sobre Arqueo de Caja tras revisar un
-- descuadre de $190.935 en el efectivo (sesion 2026-07-23):
--
-- 1) Permitir borrar un arqueo mal registrado. La tabla (015) solo tenia
--    SELECT/INSERT ("historial inmutable"), pero el usuario pidio poder
--    eliminar filas cargadas por error. Se agrega policy DELETE solo para
--    'admin' (mas restrictivo que insert, que tambien permite
--    'contabilidad') porque borrar es mas sensible que corregir con un
--    arqueo nuevo.
--
-- 2) Registrar efectivo que el usuario recibe pero no tiene fisicamente
--    (lo maneja un tercero) -- uso personal, para que el conteo fisico no
--    quede "descuadrado" por plata que en teoria existe pero no esta en la
--    caja. Se agregan `pendiente_monto` y `pendiente_concepto`: es solo
--    informativo/anotacion, NO crea transacciones ni afecta
--    vw_saldos_cuentas (mismo criterio de desacople de 015/023).
--
-- Dependencias: arqueo_caja (015), denominaciones (023).

BEGIN;

ALTER TABLE public.arqueo_caja
  ADD COLUMN IF NOT EXISTS pendiente_monto numeric(14,2),
  ADD COLUMN IF NOT EXISTS pendiente_concepto text;

ALTER TABLE public.arqueo_caja
  ADD CONSTRAINT chk_arqueo_caja_pendiente_monto CHECK (pendiente_monto IS NULL OR pendiente_monto >= 0);

CREATE POLICY arqueo_caja_delete ON public.arqueo_caja
  FOR DELETE TO authenticated
  USING (auth_rol() = 'admin');

COMMIT;
