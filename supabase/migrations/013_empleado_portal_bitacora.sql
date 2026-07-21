-- 013_empleado_portal_bitacora.sql
-- Proposito: fundacion de base de datos para el "portal de empleado" (login
-- individual + Mi Bitacora) pedido por el usuario: cada empleado activo
-- tendra su propia cuenta de Supabase Auth, vera solo sus propios registros
-- de horas/visitas, y no podra editar registros de semanas ya cerradas
-- (bloqueo blando: admin/coordinador siempre pueden editar cualquier fila).
-- Tambien agrega tema estructurado a 'visitas' (interiorismo/iluminacion/
-- arquitectura/otro) pedido para clasificar el tipo de visita.
--
-- No crea ninguna cuenta de Supabase Auth (eso se hace despues, via Admin
-- API, vinculando cada 'empleados.user_id' una vez el usuario confirme la
-- lista final de correos) -- esta migracion solo prepara el esquema/RLS.
--
-- Dependencias: 002 (perfiles/auth_rol), 007 (empleados), 010 (proyectos),
-- 011 (visitas/visita_asistentes/registro_horas) -- todas ya ejecutadas.

BEGIN;

-- ============================================================
-- 1) perfiles.rol gana el valor 'empleado'
-- ============================================================
DO $$
DECLARE v_conname text;
BEGIN
  -- Se busca el CHECK constraint por la columna real (conkey/pg_attribute),
  -- no por texto: Postgres reescribe internamente 'rol IN (...)' como
  -- 'rol = ANY (ARRAY[...])' en pg_get_constraintdef(), asi que un LIKE
  -- '%IN%' nunca hace match -- causo el error P0001 al intentar correr
  -- esta migracion la primera vez.
  SELECT con.conname INTO v_conname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY (con.conkey)
  WHERE rel.relname = 'perfiles' AND con.contype = 'c' AND att.attname = 'rol';
  IF v_conname IS NULL THEN
    RAISE EXCEPTION 'No se encontro el CHECK constraint de perfiles.rol -- revisar antes de continuar';
  END IF;
  EXECUTE format('ALTER TABLE public.perfiles DROP CONSTRAINT %I', v_conname);
END $$;

ALTER TABLE public.perfiles ADD CONSTRAINT perfiles_rol_check
  CHECK (rol IN ('admin','gerencia','contabilidad','rrhh','coordinador','marketing','empleado','sin_rol'));

-- ============================================================
-- 2) empleados.user_id -- vinculo 1:1 con auth.users (login individual)
-- ============================================================
ALTER TABLE public.empleados ADD COLUMN user_id uuid UNIQUE REFERENCES auth.users(id);

-- Un empleado puede leer su propia fila completa (nombre, cargo, tarifa,
-- etc. -- lo necesita su propio portal). Antes de esto, 'empleado' no tenia
-- ninguna politica de SELECT sobre 'empleados'.
CREATE POLICY empleados_select_propio ON public.empleados
  FOR SELECT TO authenticated
  USING (auth_rol() = 'empleado' AND user_id = auth.uid());

-- ============================================================
-- 3) Funciones helper
-- ============================================================

-- fn_empleado_id(): resuelve el empleado.id vinculado al usuario actual de
-- Supabase Auth. Mismo patron que auth_rol() (migracion 002) -- SECURITY
-- DEFINER para no depender de que la propia RLS de 'empleados' se lo
-- permita al caller.
CREATE FUNCTION public.fn_empleado_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.empleados WHERE user_id = auth.uid();
$$;

-- fn_semana_actual_inicio(): lunes de la semana calendario actual. Base del
-- "bloqueo blando" de cierre semanal -- un empleado no puede crear/editar/
-- eliminar registros propios con fecha anterior a este valor; admin y
-- coordinador no estan sujetos a esta funcion (sus politicas ya existentes
-- de la migracion 011 no la usan).
CREATE FUNCTION public.fn_semana_actual_inicio() RETURNS date
LANGUAGE sql STABLE AS $$
  SELECT date_trunc('week', current_date)::date;
$$;

-- ============================================================
-- 4) RLS adicional: registro_horas (Mi Bitacora, rol 'empleado')
-- ============================================================
CREATE POLICY registro_horas_select_propio ON public.registro_horas
  FOR SELECT TO authenticated
  USING (auth_rol() = 'empleado' AND empleado_id = fn_empleado_id());

CREATE POLICY registro_horas_write_propio ON public.registro_horas
  FOR ALL TO authenticated
  USING (
    auth_rol() = 'empleado'
    AND empleado_id = fn_empleado_id()
    AND fecha >= fn_semana_actual_inicio()
  )
  WITH CHECK (
    auth_rol() = 'empleado'
    AND empleado_id = fn_empleado_id()
    AND fecha >= fn_semana_actual_inicio()
  );

-- ============================================================
-- 5) RLS adicional: visitas + visita_asistentes (rol 'empleado')
-- ============================================================

-- Un empleado ve las visitas donde figura como asistente.
CREATE POLICY visitas_select_propio ON public.visitas
  FOR SELECT TO authenticated
  USING (
    auth_rol() = 'empleado'
    AND EXISTS (
      SELECT 1 FROM public.visita_asistentes va
      WHERE va.visita_id = visitas.id AND va.empleado_id = fn_empleado_id()
    )
  );

-- Puede crear visitas nuevas (fecha semana actual o futura); solo puede
-- editar/eliminar visitas donde ya es asistente y siguen dentro del
-- bloqueo blando. La comprobacion EXISTS no aplica en INSERT porque
-- 'visita_asistentes' se inserta despues (mismo flujo que hoy en
-- dbVisitas.js: primero la visita, luego setAsistentes()).
CREATE POLICY visitas_write_propio ON public.visitas
  FOR ALL TO authenticated
  USING (
    auth_rol() = 'empleado'
    AND fecha >= fn_semana_actual_inicio()
    AND EXISTS (
      SELECT 1 FROM public.visita_asistentes va
      WHERE va.visita_id = visitas.id AND va.empleado_id = fn_empleado_id()
    )
  )
  WITH CHECK (auth_rol() = 'empleado' AND fecha >= fn_semana_actual_inicio());

-- Un empleado solo puede ver/insertar/eliminar su PROPIA fila de asistencia
-- (no puede anotar a otros empleados como asistentes de una visita).
CREATE POLICY visita_asistentes_select_propio ON public.visita_asistentes
  FOR SELECT TO authenticated
  USING (auth_rol() = 'empleado' AND empleado_id = fn_empleado_id());

CREATE POLICY visita_asistentes_write_propio ON public.visita_asistentes
  FOR ALL TO authenticated
  USING (auth_rol() = 'empleado' AND empleado_id = fn_empleado_id())
  WITH CHECK (auth_rol() = 'empleado' AND empleado_id = fn_empleado_id());

-- ============================================================
-- 6) visitas.tema -- clasificacion estructurada + libre "Otro"
-- ============================================================
-- Datos reales verificados antes de escribir esta migracion (produccion,
-- migracion 011): 28 visitas con tema NULL, 2 con 'Arquitectura'
-- (id_mr6nqitz4p0sy, id_2w7imiz22mrmk0lah), 1 con 'Interiorismo'
-- (id_mr6nxu55vqcnb). Se normalizan a minuscula (ya validas dentro del
-- nuevo CHECK) antes de agregar la restriccion -- NULL sigue permitido
-- para no romper las 28 filas historicas sin tema.
UPDATE public.visitas SET tema = lower(tema) WHERE tema IS NOT NULL;

ALTER TABLE public.visitas ADD COLUMN tema_otro text;

ALTER TABLE public.visitas ADD CONSTRAINT visitas_tema_check
  CHECK (tema IS NULL OR tema IN ('interiorismo','iluminacion','arquitectura','otro'));

-- ============================================================
-- 7) Vistas de directorio (columnas minimas, sin datos financieros/
-- sensibles) -- permiten que 'empleado' llene su bitacora/visita sin
-- necesitar acceso de lectura a las tablas completas 'proyectos'/
-- 'empleados' (que si tienen datos sensibles: valor_contrato, tarifa,
-- cedula, etc. restringidos a admin/gerencia/contabilidad/rrhh/coordinador).
-- security_invoker = false (por defecto) a proposito: corren con el
-- privilegio del owner de la vista, no con la RLS de las tablas base --
-- es el mismo mecanismo de "columna segura" usado para exponer datos no
-- sensibles sin heredar las politicas restrictivas de la tabla completa.
-- ============================================================
CREATE VIEW public.vw_proyectos_directorio AS
SELECT id, tenant_id, nombre, estado
FROM public.proyectos;

CREATE VIEW public.vw_empleados_directorio AS
SELECT id, tenant_id, nombre, cargo
FROM public.empleados
WHERE estado = 'Activo';

GRANT SELECT ON public.vw_proyectos_directorio TO authenticated, claude_readonly;
GRANT SELECT ON public.vw_empleados_directorio TO authenticated, claude_readonly;

-- ============================================================
-- 8) Semilla de permisos -- nuevo modulo 'mi-bitacora' (rol 'empleado')
-- Se registra el id de modulo aqui; falta agregarlo a
-- src/data/departments.js + Sidebar para que aparezca (tarea de frontend).
-- ============================================================
INSERT INTO public.permisos (rol, modulo, accion) VALUES
  ('empleado', 'mi-bitacora', 'leer'),
  ('empleado', 'mi-bitacora', 'escribir');

COMMIT;
