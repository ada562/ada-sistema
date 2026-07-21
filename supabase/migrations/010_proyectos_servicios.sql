-- 010_proyectos_servicios.sql
-- Proposito: Fase 8-9 del plan de migracion a Supabase. Tablas 'proyectos' y
-- 'servicios_proyecto' (sub-contratos dentro de un proyecto), reemplazando
-- 'src/lib/dbProyectos.js' / 'src/lib/dbServicios.js' (localStorage, claves
-- 'ada_projects' / 'ada_services'). Incluye migracion correctiva de
-- 'transacciones.proyecto_id' / '.servicio_id' de 'text' (ids legado
-- 'id_xxxxx', ver nota en migracion 004) a 'uuid' con FK real, y la tabla
-- puente 'proyecto_equipo' (vacia por ahora, preparada para el filtrado RLS
-- por fila del rol 'coordinador' cuando se implemente asignacion de equipo a
-- proyectos).
--
-- Fuente de datos: firebase_export/projects.json (42 registros reales,
-- corrige el conteo de 39 anotado en docs/modelo-datos/entidades.md #2.1,
-- que estaba desactualizado) y firebase_export/services.json (2 registros
-- reales, ambos bajo el proyecto 'ALEJANDRA CASTILLO').
--
-- Dependencias: 004 (transacciones, ejecutada), 009 (seed historico,
-- ejecutada y confirmada 2026-07-18 -- los 129 registros de transacciones ya
-- tienen proyecto_id poblado como texto legado para varias filas).
--
-- Decisiones tomadas para no perder ni inventar datos:
-- 1) IDs legado se mapean a nuevos uuid via tablas temporales (mismo patron
--    de la migracion 009), solo viven durante esta sesion del SQL Editor.
-- 2) Se verifico previamente (cruce programatico contra el JSON fuente) que
--    los 42 proyectos y 2 servicios no tienen ids duplicados, y que los
--    valores de texto encontrados en 'transacciones.proyecto_id' hoy
--    (id_mqtlkegidhxxk, id_mqtllc2vm60fb, id_mqtljegt2g4mx, id_mqtlm5zem9lod,
--    id_mqtlb51wzncc4, id_mqtlf5eev9fq0) hacen match exacto con un proyecto
--    real de projects.json -- ninguno queda huerfano.
-- 3) Campos vacios en el JSON ('client', 'serviceType', 'notes' = '') se
--    preservan como NULL, no como string vacio, siguiendo la convencion ya
--    usada en las migraciones anteriores.
-- 4) 'proyecto_equipo' se crea sin semilla (el frontend no tiene todavia una
--    UI de asignacion de equipo a proyecto) -- estructura lista para la fase
--    de RBAC de 'coordinador', no bloquea esta migracion.

BEGIN;

-- ============================================================
-- 1) proyectos
-- ============================================================
CREATE TABLE public.proyectos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  legacy_id text UNIQUE,
  nombre text NOT NULL,
  cliente text,
  tipo_servicio text,
  estado text NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo','Pausado','Finalizado')),
  fecha_inicio date,
  valor_contrato numeric(14,2) NOT NULL DEFAULT 0,
  iva_pct numeric(5,2) NOT NULL DEFAULT 0,
  notas text,
  es_gba boolean NOT NULL DEFAULT false,
  paquete_visitas jsonb NOT NULL DEFAULT '{"visita_obra":0,"reunion_diseno":0,"obsequio":0}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_proyectos_tenant_estado ON public.proyectos (tenant_id, estado);
CREATE INDEX idx_proyectos_tenant_es_gba ON public.proyectos (tenant_id, es_gba);

ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;

CREATE POLICY claude_readonly_select ON public.proyectos
  FOR SELECT TO claude_readonly USING (true);

CREATE POLICY proyectos_select ON public.proyectos
  FOR SELECT TO authenticated
  USING (auth_rol() IN ('admin','gerencia','contabilidad','coordinador'));

CREATE POLICY proyectos_write ON public.proyectos
  FOR ALL TO authenticated
  USING (auth_rol() IN ('admin','gerencia'))
  WITH CHECK (auth_rol() IN ('admin','gerencia'));

-- ============================================================
-- 2) servicios_proyecto
-- ============================================================
CREATE TABLE public.servicios_proyecto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  legacy_id text UNIQUE,
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  estado text NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo','Pausado','Finalizado')),
  fecha_inicio date,
  valor_contrato numeric(14,2) NOT NULL DEFAULT 0,
  iva_pct numeric(5,2) NOT NULL DEFAULT 0,
  cuenta_cobro text,
  es_principal boolean NOT NULL DEFAULT false,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_servicios_proyecto_id ON public.servicios_proyecto (proyecto_id);

ALTER TABLE public.servicios_proyecto ENABLE ROW LEVEL SECURITY;

CREATE POLICY claude_readonly_select ON public.servicios_proyecto
  FOR SELECT TO claude_readonly USING (true);

CREATE POLICY servicios_proyecto_select ON public.servicios_proyecto
  FOR SELECT TO authenticated
  USING (auth_rol() IN ('admin','gerencia','contabilidad','coordinador'));

CREATE POLICY servicios_proyecto_write ON public.servicios_proyecto
  FOR ALL TO authenticated
  USING (auth_rol() IN ('admin','gerencia'))
  WITH CHECK (auth_rol() IN ('admin','gerencia'));

-- ============================================================
-- 3) proyecto_equipo (tabla puente, sin semilla -- fase RBAC futura)
-- ============================================================
CREATE TABLE public.proyecto_equipo (
  tenant_id text NOT NULL DEFAULT 'ada',
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (proyecto_id, empleado_id)
);

ALTER TABLE public.proyecto_equipo ENABLE ROW LEVEL SECURITY;

CREATE POLICY claude_readonly_select ON public.proyecto_equipo
  FOR SELECT TO claude_readonly USING (true);

CREATE POLICY proyecto_equipo_select ON public.proyecto_equipo
  FOR SELECT TO authenticated
  USING (auth_rol() IN ('admin','gerencia','contabilidad','coordinador'));

CREATE POLICY proyecto_equipo_write ON public.proyecto_equipo
  FOR ALL TO authenticated
  USING (auth_rol() IN ('admin','gerencia'))
  WITH CHECK (auth_rol() IN ('admin','gerencia'));

-- ============================================================
-- Tablas temporales de mapeo id-legado -> uuid nuevo
-- ============================================================
CREATE TEMP TABLE _map_proyectos (old_id text PRIMARY KEY, new_id uuid NOT NULL DEFAULT gen_random_uuid());
CREATE TEMP TABLE _map_servicios (old_id text PRIMARY KEY, new_id uuid NOT NULL DEFAULT gen_random_uuid());

INSERT INTO _map_proyectos (old_id) VALUES
  ('id_mqtlb51wzncc4'),
  ('id_mqtlf5eev9fq0'),
  ('id_mqtljegt2g4mx'),
  ('id_mqtlkegidhxxk'),
  ('id_mqtllc2vm60fb'),
  ('id_mqtlm5zem9lod'),
  ('id_mr15l4jvrsepf'),
  ('id_mrdwna8srcqz0'),
  ('id_mrm3ryim5m8h1'),
  ('id_mrm3ryimza3of'),
  ('id_mrm3ryimj59ik'),
  ('id_mrm3ryimxd3x4'),
  ('id_mrm3ryimz220i'),
  ('id_mrm3ryimr54gp'),
  ('id_mrm3ryim5ymhj'),
  ('id_mrm3ryimibfdo'),
  ('id_mrm3ryim6a96n'),
  ('id_mrm3ryimd8eku'),
  ('id_mrm3ryimrq5m7'),
  ('id_mrm3ryimkfkdv'),
  ('id_mrm3ryim3lw67'),
  ('id_mrm3ryimdw1eq'),
  ('id_mrm3ryimy9jtp'),
  ('id_mrm3ryimexb1l'),
  ('id_mrm3ryimewla2'),
  ('id_mrm3ryimz4kfh'),
  ('id_mrm3ryimyi9n7'),
  ('id_mrm3ryim4hlo5'),
  ('id_mrm3ryimedn4j'),
  ('id_mrm3ryimn1lf8'),
  ('id_mrm3ryimpn9bw'),
  ('id_mrm3ryimmsqj0'),
  ('id_mrm3ryimnmqxh'),
  ('id_mrm3ryimsuu5w'),
  ('id_mrm3ryimjf1nt'),
  ('id_mrm3ryimt9izn'),
  ('id_mrm3ryimfbjtm'),
  ('id_mrm3ryim1xep4'),
  ('id_mrm3ryimm0fwy'),
  ('id_mrm3ryimxm2xm'),
  ('id_mrm3ryim7vw55'),
  ('id_mrm3ryim63nxy');

INSERT INTO _map_servicios (old_id) VALUES
  ('id_mrdzejhp1hxjo'),
  ('id_mrl4h5w2ivswq');

-- ============================================================
-- Seed: proyectos (42 registros, firebase_export/projects.json)
-- ============================================================
INSERT INTO public.proyectos (id, tenant_id, legacy_id, nombre, cliente, tipo_servicio, estado, fecha_inicio, valor_contrato, iva_pct, notas, es_gba)
SELECT m.new_id, 'ada', v.old_id, v.nombre, v.cliente, v.tipo_servicio, v.estado, v.fecha_inicio, v.valor_contrato, v.iva_pct, v.notas, v.es_gba
FROM (VALUES
  ('id_mqtlb51wzncc4', 'CASA AL REVES', 'GUSTAVO', 'DELUXE', 'Activo', '2025-05-01'::date, 10922000, 0, NULL, false),
  ('id_mqtlf5eev9fq0', 'CASA SACRO', 'DEIVER MACHADO', NULL, 'Activo', '2025-08-30'::date, 33173433, 0, NULL, false),
  ('id_mqtljegt2g4mx', 'GRAN RESORT 305', NULL, NULL, 'Pausado', '2025-03-01'::date, 0, 0, NULL, false),
  ('id_mqtlkegidhxxk', 'GRAN RESORT 405', NULL, NULL, 'Pausado', '2025-03-01'::date, 0, 0, NULL, false),
  ('id_mqtllc2vm60fb', 'PINAMAR', NULL, NULL, 'Activo', '2026-04-01'::date, 10000000, 0, NULL, false),
  ('id_mqtlm5zem9lod', 'ICONO 509', NULL, NULL, 'Activo', '2026-04-01'::date, 0, 19, NULL, false),
  ('id_mr15l4jvrsepf', 'HOTEL CALI', 'JUAN CARLOS VELASQUEZ', NULL, 'Pausado', '2025-08-15'::date, 74000000, 0, 'PAGO 106.000.000 MILLONES', false),
  ('id_mrdwna8srcqz0', 'ALEJANDRA CASTILLO', 'ALEJANDRA DURAN', 'DELUXE', 'Activo', '2026-07-09'::date, 130000000, 19, NULL, false),
  ('id_mrm3ryim5m8h1', 'ACAPULCO', NULL, NULL, 'Pausado', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryimza3of', 'ADA', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryimj59ik', 'ADA COMUNITY (CANAL DE VENTA)', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryimxd3x4', 'ADA LEARNING (CANAL DE APRENDIZAJE)', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryimz220i', 'ADA-OBRA PINAMAR', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryimr54gp', 'ADG (REDES)', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryim5ymhj', 'ADMINISTRATIVO', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryimibfdo', 'ALBURQUERQUE GBA', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', true),
  ('id_mrm3ryim6a96n', 'AP 9', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryimd8eku', 'AP 9 GBA', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', true),
  ('id_mrm3ryimrq5m7', 'BOSQUES DEL RIO-GBA', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', true),
  ('id_mrm3ryimkfkdv', 'CASA ROSA', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryim3lw67', 'CASA ROSA EXPRESS', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryimdw1eq', 'CASA SACRO FACHADAS', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryimy9jtp', 'CASA SACRO FACHADAS MONACO-GBA', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', true),
  ('id_mrm3ryimexb1l', 'CONSULTORIO ICONO 509', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryimewla2', 'DISEÑO ILUMINACION 103', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryimz4kfh', 'EL CAIRO GBA', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', true),
  ('id_mrm3ryimyi9n7', 'FARAON / MANHATHAN /DENTIS', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryim4hlo5', 'GBA', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', true),
  ('id_mrm3ryimedn4j', 'GBA (REDES)', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', true),
  ('id_mrm3ryimn1lf8', 'GR 302', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryimpn9bw', 'GR 305', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryimmsqj0', 'GR 405', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryimnmqxh', 'GRAND RESORT 103', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryimsuu5w', 'GRAND RESORT 103 - GBA', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', true),
  ('id_mrm3ryimjf1nt', 'HABITACION BEBE MONACO GBA', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', true),
  ('id_mrm3ryimt9izn', 'LA UNION GBA', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', true),
  ('id_mrm3ryimfbjtm', 'La Fontana GBA', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', true),
  ('id_mrm3ryim1xep4', 'MR15 GBA', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', true),
  ('id_mrm3ryimm0fwy', 'MR38 GBA', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', true),
  ('id_mrm3ryimxm2xm', 'OTROS', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryim7vw55', 'PINAMAR-ADA', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', false),
  ('id_mrm3ryim63nxy', 'PINAMAR-GBA', NULL, NULL, 'Activo', '2026-07-15'::date, 0, 19, 'Importado automáticamente desde Excel de bitácora', true)
) AS v(old_id, nombre, cliente, tipo_servicio, estado, fecha_inicio, valor_contrato, iva_pct, notas, es_gba)
JOIN _map_proyectos m ON m.old_id = v.old_id;

-- ============================================================
-- Seed: servicios_proyecto (2 registros, firebase_export/services.json)
-- ============================================================
INSERT INTO public.servicios_proyecto (id, tenant_id, legacy_id, proyecto_id, nombre, estado, fecha_inicio, valor_contrato, iva_pct, notas, es_principal)
SELECT ms.new_id, 'ada', v.old_id, mp.new_id, v.nombre, v.estado, v.fecha_inicio, v.valor_contrato, v.iva_pct, v.notas, v.es_principal
FROM (VALUES
  ('id_mrdzejhp1hxjo', 'id_mrdwna8srcqz0', 'LUXE', 'Activo', '2026-07-09'::date, 130000000, 19, NULL, true),
  ('id_mrl4h5w2ivswq', 'id_mrdwna8srcqz0', 'ACABADOS', 'Activo', '2026-07-14'::date, 135000, 19, NULL, false)
) AS v(old_id, old_proyecto_id, nombre, estado, fecha_inicio, valor_contrato, iva_pct, notas, es_principal)
JOIN _map_servicios ms ON ms.old_id = v.old_id
JOIN _map_proyectos mp ON mp.old_id = v.old_proyecto_id;

-- ============================================================
-- Correctiva: transacciones.proyecto_id/servicio_id de text a uuid FK
-- (deuda anotada explicitamente en la migracion 004, se salda aqui)
-- ============================================================
ALTER TABLE public.transacciones ADD COLUMN proyecto_id_new uuid;
ALTER TABLE public.transacciones ADD COLUMN servicio_id_new uuid;

UPDATE public.transacciones t
SET proyecto_id_new = m.new_id
FROM _map_proyectos m
WHERE t.proyecto_id = m.old_id;

UPDATE public.transacciones t
SET servicio_id_new = m.new_id
FROM _map_servicios m
WHERE t.servicio_id = m.old_id;

-- Verificacion defensiva: ningun proyecto_id/servicio_id de texto debe quedar
-- sin resolver (huerfano) antes de descartar la columna vieja.
DO $$
DECLARE v_huerfanos integer;
BEGIN
  SELECT count(*) INTO v_huerfanos FROM public.transacciones
    WHERE proyecto_id IS NOT NULL AND proyecto_id_new IS NULL;
  IF v_huerfanos > 0 THEN
    RAISE EXCEPTION 'Hay % transacciones con proyecto_id legado sin match en proyectos -- abortando para no perder el dato', v_huerfanos;
  END IF;
  SELECT count(*) INTO v_huerfanos FROM public.transacciones
    WHERE servicio_id IS NOT NULL AND servicio_id_new IS NULL;
  IF v_huerfanos > 0 THEN
    RAISE EXCEPTION 'Hay % transacciones con servicio_id legado sin match en servicios_proyecto -- abortando para no perder el dato', v_huerfanos;
  END IF;
END $$;

ALTER TABLE public.transacciones DROP COLUMN proyecto_id;
ALTER TABLE public.transacciones DROP COLUMN servicio_id;
ALTER TABLE public.transacciones RENAME COLUMN proyecto_id_new TO proyecto_id;
ALTER TABLE public.transacciones RENAME COLUMN servicio_id_new TO servicio_id;

ALTER TABLE public.transacciones
  ADD CONSTRAINT fk_transacciones_proyecto FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id),
  ADD CONSTRAINT fk_transacciones_servicio FOREIGN KEY (servicio_id) REFERENCES public.servicios_proyecto(id);

CREATE INDEX idx_transacciones_proyecto_id ON public.transacciones (proyecto_id);
CREATE INDEX idx_transacciones_servicio_id ON public.transacciones (servicio_id);

-- ============================================================
-- Verificacion de conteos (debe imprimir 42/2, y el conteo de
-- transacciones con proyecto_id/servicio_id ya resuelto a uuid)
-- ============================================================
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.proyectos; RAISE NOTICE 'proyectos: %', v_count;
  SELECT count(*) INTO v_count FROM public.servicios_proyecto; RAISE NOTICE 'servicios_proyecto: %', v_count;
  SELECT count(*) INTO v_count FROM public.transacciones WHERE proyecto_id IS NOT NULL; RAISE NOTICE 'transacciones con proyecto_id: %', v_count;
  SELECT count(*) INTO v_count FROM public.transacciones WHERE servicio_id IS NOT NULL; RAISE NOTICE 'transacciones con servicio_id: %', v_count;
END $$;

COMMIT;
