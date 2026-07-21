-- 012_calendario_tributario.sql
-- Proposito: ultima fase pendiente del plan de migracion a Supabase. Tabla
-- 'calendario_tributario', reemplazando 'src/lib/dbCalendario.js'
-- (localStorage, clave 'ada_calendario_tributario'). No viene de un export de
-- Firebase -- son datos reales de la empresa ya escritos a mano en el mock
-- (Movistar, Planillas, Leasing, Industria y Comercio, Primas de servicios),
-- consumidos hoy solo desde la seccion "00 CALENDARIO TRIBUTARIO" de
-- ResumenGerencia.jsx (no tiene pagina/modulo propio en departments.js).
--
-- Fuente de datos: src/lib/dbCalendario.js (defaultItems, 5 registros).
--
-- Decisiones tomadas para no perder ni inventar datos:
-- 1) Se preservan los 5 registros tal cual existen hoy en el mock, incluidos
--    los montos en 0 (Movistar, Planillas, Industria y Comercio, Primas) --
--    no se inventa un valor donde el usuario nunca lo cargo.
-- 2) Sin modulo propio en el RBAC (departments.js no tiene un id 'calendario'
--    -- vive embebido en 'resumen-gerencia', que ya tiene permisos sembrados
--    en la migracion 002 para gerencia leer/escribir). Las politicas RLS de
--    esta tabla siguen ese mismo criterio; si en el futuro se separa en su
--    propio modulo, se debe agregar la fila correspondiente a 'permisos' y
--    ajustar estas politicas.

BEGIN;

CREATE TABLE public.calendario_tributario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  nombre text NOT NULL,
  frecuencia text NOT NULL CHECK (frecuencia IN ('mensual','bimestral','semestral')),
  dia_del_mes smallint NOT NULL CHECK (dia_del_mes BETWEEN 1 AND 31),
  monto numeric(12,2) NOT NULL DEFAULT 0,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendario_tributario_tenant_id ON public.calendario_tributario (tenant_id);

CREATE TRIGGER trg_calendario_tributario_updated_at
  BEFORE UPDATE ON public.calendario_tributario
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.calendario_tributario ENABLE ROW LEVEL SECURITY;

CREATE POLICY claude_readonly_select ON public.calendario_tributario
  FOR SELECT TO claude_readonly USING (true);

CREATE POLICY calendario_tributario_select ON public.calendario_tributario
  FOR SELECT TO authenticated
  USING (auth_rol() IN ('admin','gerencia','contabilidad'));

CREATE POLICY calendario_tributario_write ON public.calendario_tributario
  FOR ALL TO authenticated
  USING (auth_rol() IN ('admin','gerencia'))
  WITH CHECK (auth_rol() IN ('admin','gerencia'));

-- ============================================================
-- Seed: 5 registros reales (src/lib/dbCalendario.js, defaultItems)
-- ============================================================
INSERT INTO public.calendario_tributario (tenant_id, nombre, frecuencia, dia_del_mes, monto, notas) VALUES
  ('ada', 'Movistar', 'mensual', 25, 0, NULL),
  ('ada', 'Planillas (seguridad social)', 'mensual', 5, 0, NULL),
  ('ada', 'Leasing', 'mensual', 11, 1906000, NULL),
  ('ada', 'Industria y Comercio', 'bimestral', 10, 0, 'Sep, Nov, Ene, Mar, May, Jul'),
  ('ada', 'Primas de servicios', 'semestral', 30, 0, 'Junio y Diciembre');

DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.calendario_tributario; RAISE NOTICE 'calendario_tributario: %', v_count;
END $$;

COMMIT;
