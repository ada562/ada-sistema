-- 002_perfiles_rbac.sql
-- Proposito: fundacion de autenticacion real (Supabase Auth) + control de acceso
-- por rol (RBAC), reemplazando el login mock de localStorage (src/lib/dbAuth.js).
--
-- Contexto: se detecto que todos los modulos db*.js cargan datos una sola vez
-- en una variable de modulo (localStorage) y nunca releen -- causa raiz de la
-- perdida de datos reportada (pestañas viejas pisando datos nuevos). Esta
-- migracion es la Fase 2 del plan de migracion a Supabase: establece Auth +
-- perfiles + permisos, base para RLS de todas las tablas de datos que vienen
-- despues (tesoreria, contratistas, empleados/nomina, etc.)
--
-- Usuarios nuevos quedan en rol 'sin_rol' (cero permisos) -- falla cerrado.
-- Un admin debe promoverlos manualmente por SQL/dashboard hasta que exista
-- una pantalla de gestion de usuarios (no incluida en este corte).

CREATE TABLE public.perfiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id text NOT NULL DEFAULT 'ada',
  nombre text NOT NULL,
  rol text NOT NULL DEFAULT 'sin_rol'
    CHECK (rol IN ('admin','gerencia','contabilidad','rrhh','coordinador','marketing','sin_rol')),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_perfiles_tenant_id ON public.perfiles (tenant_id);

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Funcion compartida para mantener updated_at -- se reutiliza en todas las
-- migraciones siguientes que tengan columnas mutables.
CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_perfiles_updated_at
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.permisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  rol text NOT NULL,
  modulo text NOT NULL,          -- coincide con el id de modulo en src/data/departments.js
  accion text NOT NULL CHECK (accion IN ('leer','escribir')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, rol, modulo, accion)
);

CREATE INDEX idx_permisos_tenant_id ON public.permisos (tenant_id);
CREATE INDEX idx_permisos_rol_modulo ON public.permisos (rol, modulo);

ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;

-- auth_rol(): helper reutilizado por TODAS las politicas RLS de las
-- migraciones siguientes (003+). SECURITY DEFINER para poder leer perfiles
-- sin depender de que la propia politica de perfiles se lo permita al caller.
CREATE FUNCTION public.auth_rol() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid();
$$;

-- Trigger: crea la fila de perfil automaticamente al registrarse un usuario
-- nuevo en Supabase Auth. Rol inicial 'sin_rol' -- sin acceso a ningun modulo
-- hasta que un admin lo promueva.
CREATE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, rol)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email), 'sin_rol');
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS: perfiles
-- El propio usuario puede leer/editar su nombre; admin tiene acceso total;
-- claude_readonly (solo lectura, ver migracion 001) puede leer todo.
CREATE POLICY perfiles_select_self ON public.perfiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR auth_rol() = 'admin');

CREATE POLICY perfiles_update_self ON public.perfiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR auth_rol() = 'admin')
  WITH CHECK (id = auth.uid() OR auth_rol() = 'admin');

CREATE POLICY perfiles_admin_all ON public.perfiles
  FOR ALL TO authenticated
  USING (auth_rol() = 'admin')
  WITH CHECK (auth_rol() = 'admin');

CREATE POLICY claude_readonly_select_perfiles ON public.perfiles
  FOR SELECT TO claude_readonly USING (true);

-- RLS: permisos
-- Lectura abierta a cualquier usuario autenticado (usePermission() del
-- cliente necesita poder consultarla; no contiene datos sensibles).
-- Escritura solo admin.
CREATE POLICY permisos_select_all ON public.permisos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY permisos_admin_write ON public.permisos
  FOR ALL TO authenticated
  USING (auth_rol() = 'admin')
  WITH CHECK (auth_rol() = 'admin');

CREATE POLICY claude_readonly_select_permisos ON public.permisos
  FOR SELECT TO claude_readonly USING (true);

-- Semilla de permisos (provisional -- basada en src/data/departments.js,
-- pendiente de formalizar en docs/especificacion/10-autenticacion-rbac.md).
-- admin: acceso total (no necesita filas explicitas, ver auth_rol() = 'admin'
-- como bypass en usePermission() del cliente).
INSERT INTO public.permisos (rol, modulo, accion) VALUES
  -- gerencia: lectura de todo, sin escritura fuera de su propio modulo
  ('gerencia', 'resumen-gerencia', 'leer'), ('gerencia', 'resumen-gerencia', 'escribir'),
  ('gerencia', 'proyectos', 'leer'), ('gerencia', 'proyecto-detalle', 'leer'),
  ('gerencia', 'bitacoras', 'leer'), ('gerencia', 'visitas', 'leer'),
  ('gerencia', 'tesoreria', 'leer'), ('gerencia', 'gba', 'leer'), ('gerencia', 'contratistas', 'leer'),
  ('gerencia', 'equipo', 'leer'), ('gerencia', 'empleado-detalle', 'leer'), ('gerencia', 'nomina', 'leer'),
  ('gerencia', 'contratos', 'leer'), ('gerencia', 'horarios', 'leer'), ('gerencia', 'reportes', 'leer'),
  ('gerencia', 'publicidad', 'leer'), ('gerencia', 'redes', 'leer'), ('gerencia', 'dashboard', 'leer'),

  -- contabilidad: lectura/escritura de tesoreria, contratistas, gba
  ('contabilidad', 'dashboard', 'leer'),
  ('contabilidad', 'tesoreria', 'leer'), ('contabilidad', 'tesoreria', 'escribir'),
  ('contabilidad', 'gba', 'leer'), ('contabilidad', 'gba', 'escribir'),
  ('contabilidad', 'contratistas', 'leer'), ('contabilidad', 'contratistas', 'escribir'),

  -- rrhh: lectura/escritura de equipo, nomina, contratos, horarios
  ('rrhh', 'dashboard', 'leer'),
  ('rrhh', 'equipo', 'leer'), ('rrhh', 'equipo', 'escribir'),
  ('rrhh', 'empleado-detalle', 'leer'), ('rrhh', 'empleado-detalle', 'escribir'),
  ('rrhh', 'nomina', 'leer'), ('rrhh', 'nomina', 'escribir'),
  ('rrhh', 'contratos', 'leer'), ('rrhh', 'contratos', 'escribir'),
  ('rrhh', 'horarios', 'leer'), ('rrhh', 'horarios', 'escribir'),
  ('rrhh', 'reportes', 'leer'), ('rrhh', 'reportes', 'escribir'),

  -- coordinador: lectura de proyectos, bitacoras, visitas
  ('coordinador', 'dashboard', 'leer'),
  ('coordinador', 'proyectos', 'leer'), ('coordinador', 'proyecto-detalle', 'leer'),
  ('coordinador', 'bitacoras', 'leer'), ('coordinador', 'bitacoras', 'escribir'),
  ('coordinador', 'visitas', 'leer'), ('coordinador', 'visitas', 'escribir'),

  -- marketing: lectura/escritura de publicidad, redes
  ('marketing', 'dashboard', 'leer'),
  ('marketing', 'publicidad', 'leer'), ('marketing', 'publicidad', 'escribir'),
  ('marketing', 'redes', 'leer'), ('marketing', 'redes', 'escribir');
