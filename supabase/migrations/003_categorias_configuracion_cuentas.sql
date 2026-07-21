-- 003_categorias_configuracion_cuentas.sql
-- Proposito: Fase 3 del plan de migracion a Supabase. Tablas de referencia y
-- configuracion global que necesita Fase 4 (transacciones.categoria_id/.cuenta)
-- y Fase 6-7 (dbEmpleados.getDailyRate()). Datos sembrados con los valores
-- reales de firebase_export/categories.json y firebase_export/settings.json
-- (no datos de ejemplo).
--
-- NOTA: este archivo es una RECONSTRUCCION. La migracion 003 original se
-- ejecuto y verifico en Supabase el 2026-07-18 (ver MIGRATIONS.md), pero el
-- archivo local quedo vacio (0 bytes, nunca commiteado a git) -- se detecto
-- el 2026-07-18 al validar la migracion 004. Se reconstruyo a partir del plan
-- aprobado esa misma sesion + los JSON fuente + los nombres de columna que
-- dbCategorias.js/dbSettings.js ya consumen en produccion (confirmado por
-- lectura de esos archivos, ya migrados a Supabase). Si el esquema real
-- difiere de este archivo en algun detalle no observable desde el frontend
-- (ej. constraints exactos), este archivo es la mejor aproximacion disponible,
-- no una exportacion literal del esquema vivo.
--
-- Dependencias: auth_rol() y update_updated_at_column() (migracion 002).

CREATE TABLE public.cuentas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  codigo text NOT NULL,
  nombre text NOT NULL,
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, codigo)
);

CREATE INDEX idx_cuentas_tenant_id ON public.cuentas (tenant_id);

ALTER TABLE public.cuentas ENABLE ROW LEVEL SECURITY;

CREATE POLICY cuentas_select ON public.cuentas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY cuentas_write ON public.cuentas
  FOR ALL TO authenticated
  USING (auth_rol() IN ('admin','contabilidad'))
  WITH CHECK (auth_rol() IN ('admin','contabilidad'));

CREATE POLICY claude_readonly_select_cuentas ON public.cuentas
  FOR SELECT TO claude_readonly USING (true);

INSERT INTO public.cuentas (tenant_id, codigo, nombre) VALUES
  ('ada', 'banco', 'Banco'),
  ('ada', 'efectivo', 'Efectivo'),
  ('ada', 'nequi', 'Nequi');

-- categorias: semilla con los strings tal cual de firebase_export/categories.json,
-- INCLUYENDO errores de tipeo existentes (TRASNPORTE, SEGUMIENTO) a proposito,
-- para no romper el match por nombre del import historico de transacciones.
CREATE TABLE public.categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  tipo text NOT NULL CHECK (tipo IN ('ingreso','gasto')),
  nombre text NOT NULL,
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, tipo, nombre)
);

CREATE INDEX idx_categorias_tenant_id ON public.categorias (tenant_id);
CREATE INDEX idx_categorias_tipo ON public.categorias (tipo);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY categorias_select ON public.categorias
  FOR SELECT TO authenticated USING (true);

CREATE POLICY categorias_write ON public.categorias
  FOR ALL TO authenticated
  USING (auth_rol() IN ('admin','contabilidad'))
  WITH CHECK (auth_rol() IN ('admin','contabilidad'));

CREATE POLICY claude_readonly_select_categorias ON public.categorias
  FOR SELECT TO claude_readonly USING (true);

INSERT INTO public.categorias (tenant_id, tipo, nombre) VALUES
  ('ada', 'gasto', 'CONTRATISTAS'),
  ('ada', 'gasto', 'CREDITOS BANCARIOS'),
  ('ada', 'gasto', 'GASTOS BANCARIOS'),
  ('ada', 'gasto', 'IMPUESTOS'),
  ('ada', 'gasto', 'LIQUIDACIONES'),
  ('ada', 'gasto', 'NOMINA'),
  ('ada', 'gasto', 'APORTES SALARIALES'),
  ('ada', 'gasto', 'PERSONALES'),
  ('ada', 'gasto', 'PRESTAMOS EMPLEADOS'),
  ('ada', 'gasto', 'PROPIEDADES Y SERVICIOS PUBLICOS'),
  ('ada', 'gasto', 'PROVEEDORES'),
  ('ada', 'gasto', 'SEGURIDAD SOCIAL'),
  ('ada', 'gasto', 'TARJETA DE CREDITO'),
  ('ada', 'gasto', 'RENTING'),
  ('ada', 'gasto', 'PUBLICIDAD Y MERCADEO'),
  ('ada', 'gasto', 'LICENCIAS'),
  ('ada', 'gasto', 'SUMINISTROS DE OFICINA'),
  ('ada', 'gasto', 'TRASLADO ENTRE CUENTAS'),
  ('ada', 'gasto', 'OTROS GASTOS'),
  ('ada', 'gasto', 'HONORARIOS'),
  ('ada', 'gasto', 'NOMINA GERENCIA'),
  ('ada', 'gasto', 'NOMINA COORDINACION'),
  ('ada', 'gasto', 'NOMINA BASE'),
  ('ada', 'gasto', 'NOMINA PUBLICIDAD Y MERCADEO'),
  ('ada', 'gasto', 'GBA'),
  ('ada', 'gasto', 'TRASNPORTE'),
  ('ada', 'gasto', 'TRANSPORTE PROYECTO INICIAL'),
  ('ada', 'gasto', 'TRANSPORTE SEGUMIENTO A OBRAS / VISITAS'),
  ('ada', 'gasto', 'LUXE'),
  ('ada', 'gasto', 'FACHADAS'),
  ('ada', 'gasto', 'DELUXE'),
  ('ada', 'gasto', 'SERVICIO PRINCIPAL'),
  ('ada', 'gasto', 'ACABADOS'),
  ('ada', 'ingreso', 'DEVOLUCION PRESTAMO'),
  ('ada', 'ingreso', 'TRASLADO ENTRE CUENTAS'),
  ('ada', 'ingreso', 'OTROS INGRESOS'),
  ('ada', 'ingreso', 'DELUXE'),
  ('ada', 'ingreso', 'LUXE'),
  ('ada', 'ingreso', 'ACABADOS'),
  ('ada', 'ingreso', 'ILUMINACION'),
  ('ada', 'ingreso', 'ENCHAPES'),
  ('ada', 'ingreso', 'CARPINTERIA'),
  ('ada', 'ingreso', 'ASESORIA EXPRESS'),
  ('ada', 'ingreso', 'DISEÑO POR ESPACIO'),
  ('ada', 'ingreso', 'VISITAS DE OBRA'),
  ('ada', 'ingreso', 'ARQUITECTURA'),
  ('ada', 'ingreso', 'ADA LERNING'),
  ('ada', 'ingreso', 'ESPECIFICACIONES GBA'),
  ('ada', 'ingreso', 'GBA'),
  ('ada', 'ingreso', 'PROYECTO PRINCIPAL'),
  ('ada', 'ingreso', 'FACHADAS'),
  ('ada', 'ingreso', 'SERVICIO PRINCIPAL');

-- configuracion: fila unica por tenant, valores de firebase_export/settings.json.
-- saldo_inicial_fecha no existe en el JSON fuente -- confirmado con el usuario
-- y sembrado como 2026-05-31 (dia anterior a la primera transaccion registrada
-- en firebase_export/transactions.json, que es 2026-06-01).
CREATE TABLE public.configuracion (
  tenant_id text PRIMARY KEY DEFAULT 'ada',
  dias_laborales_mes smallint NOT NULL DEFAULT 23,
  carga_prestacional_pct numeric(5,2) NOT NULL DEFAULT 29,
  iva_pct numeric(5,2) NOT NULL DEFAULT 19,
  imprevistos_pct numeric(5,2) NOT NULL DEFAULT 5,
  administracion_pct numeric(5,2) NOT NULL DEFAULT 15,
  utilidad_pct numeric(5,2) NOT NULL DEFAULT 30,
  saldo_inicial_banco numeric(14,2) NOT NULL DEFAULT 0,
  saldo_inicial_efectivo numeric(14,2) NOT NULL DEFAULT 0,
  saldo_inicial_nequi numeric(14,2) NOT NULL DEFAULT 0,
  saldo_inicial_fecha date NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_configuracion_updated_at
  BEFORE UPDATE ON public.configuracion
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY configuracion_select ON public.configuracion
  FOR SELECT TO authenticated USING (true);

CREATE POLICY configuracion_write ON public.configuracion
  FOR ALL TO authenticated
  USING (auth_rol() IN ('admin','contabilidad'))
  WITH CHECK (auth_rol() IN ('admin','contabilidad'));

CREATE POLICY claude_readonly_select_configuracion ON public.configuracion
  FOR SELECT TO claude_readonly USING (true);

INSERT INTO public.configuracion (
  tenant_id, dias_laborales_mes, carga_prestacional_pct, iva_pct, imprevistos_pct,
  administracion_pct, utilidad_pct, saldo_inicial_banco, saldo_inicial_efectivo,
  saldo_inicial_nequi, saldo_inicial_fecha
) VALUES (
  'ada', 23, 29, 19, 5, 15, 30, 2792626, 4868250, 201471, '2026-05-31'
);
