-- 019_fix_fn_registrar_transaccion_uuid.sql
-- Proposito: correctiva. La migracion 010 cambio `transacciones.proyecto_id`
-- y `transacciones.servicio_id` de `text` a `uuid` (FK real hacia `proyectos`
-- y `servicios_proyecto`), pero nunca actualizo la firma de la RPC
-- `fn_registrar_transaccion` (creada en 005 con `p_proyecto_id text`,
-- `p_servicio_id text`) -- quedo desalineada con la tabla.
--
-- Efecto en produccion: TODA llamada a `fn_registrar_transaccion` (agregar
-- cualquier transaccion nueva en Tesoreria, incluidas las de GBA) fallaba con
-- "column proyecto_id is of type uuid but expression is of type text",
-- porque Postgres valida los tipos del INSERT en tiempo de plan -- no hay
-- cast implicito/assignment de un parametro PL/pgSQL tipado `text` hacia una
-- columna `uuid` (a diferencia de un literal SQL sin tipo, que si se resuelve
-- contra el tipo destino). Pasaba incluso con `p_proyecto_id`/`p_servicio_id`
-- en NULL, ya que el error es de tipos, no de valor.
--
-- Dependencias: 005_fn_registrar_transaccion_gba_facturado.sql (firma actual
-- de la funcion), 010_proyectos_servicios.sql (tipos reales de columna).
--
-- Se usa DROP FUNCTION + CREATE FUNCTION (no CREATE OR REPLACE) porque
-- Postgres solo reemplaza una funcion con firma de argumentos identica --
-- cambiar el tipo de un parametro exige recrearla.

DROP FUNCTION public.fn_registrar_transaccion(date, text, text, numeric, uuid, text, text, text, text, boolean);

CREATE FUNCTION public.fn_registrar_transaccion(
  p_fecha date, p_tipo text, p_cuenta text, p_monto numeric,
  p_categoria_id uuid, p_descripcion text,
  p_proyecto_id uuid DEFAULT NULL, p_servicio_id uuid DEFAULT NULL,
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
