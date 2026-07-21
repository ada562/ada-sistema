-- 005_fn_registrar_transaccion_gba_facturado.sql
-- Proposito: migracion correctiva sobre la Fase 4. La tabla `transacciones`
-- (migracion 004) ya tiene las columnas `gba_movimiento` y `facturado`, pero
-- la RPC `fn_registrar_transaccion` nunca las expuso como parametros. Al
-- mapear el frontend real (`src/pages/contabilidad/GBA.jsx`) se confirmo que
-- el modulo GBA necesita setear ambos campos al crear un movimiento
-- (prestamo otorgado/recibido) -- sin esto, todo movimiento GBA quedaria
-- guardado con `gba_movimiento IS NULL`, indistinguible de un gasto/ingreso
-- normal e invisible para la logica de saldo de GBA.
--
-- Se usa DROP FUNCTION + CREATE FUNCTION (no CREATE OR REPLACE) porque
-- Postgres solo reemplaza una funcion con firma de argumentos identica --
-- agregar parametros nuevos exige recrearla. Seguro de ejecutar: `transacciones`
-- tiene 0 filas en produccion (verificado 2026-07-18 al validar la migracion 004).
--
-- Dependencias: 004_tesoreria_transacciones_rpc.sql (tabla `transacciones`,
-- funcion `fn_registrar_transaccion` con su firma original).

DROP FUNCTION public.fn_registrar_transaccion(date, text, text, numeric, uuid, text, text, text);

CREATE FUNCTION public.fn_registrar_transaccion(
  p_fecha date, p_tipo text, p_cuenta text, p_monto numeric,
  p_categoria_id uuid, p_descripcion text,
  p_proyecto_id text DEFAULT NULL, p_servicio_id text DEFAULT NULL,
  p_gba_movimiento text DEFAULT NULL, p_facturado boolean DEFAULT false
) RETURNS public.transacciones LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.transacciones;
BEGIN
  IF auth_rol() NOT IN ('admin','contabilidad','gerencia') THEN
    RAISE EXCEPTION 'permiso denegado' USING ERRCODE = '42501';
  END IF;
  IF p_cuenta IS NOT NULL THEN
    PERFORM 1 FROM public.cuentas WHERE codigo = p_cuenta AND tenant_id = 'ada' FOR UPDATE NOWAIT;
  END IF;
  INSERT INTO public.transacciones (
    tenant_id, fecha, tipo, cuenta, monto, categoria_id, descripcion,
    proyecto_id, servicio_id, gba_movimiento, facturado
  )
  VALUES (
    'ada', p_fecha, p_tipo, p_cuenta, p_monto, p_categoria_id, p_descripcion,
    p_proyecto_id, p_servicio_id, p_gba_movimiento, p_facturado
  )
  RETURNING * INTO v_row;
  RETURN v_row;
END $$;

GRANT EXECUTE ON FUNCTION public.fn_registrar_transaccion TO authenticated;
