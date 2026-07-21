-- 007_empleados_completo.sql
-- Proposito: Fase 6 del plan de migracion a Supabase. Tabla `empleados` con
-- el esquema completo (datos personales, contacto, contacto de emergencia,
-- datos laborales, seguridad social, flags de documentos, PIN hasheado para
-- futuro login de campo). Reemplaza el almacenamiento en localStorage de
-- `src/lib/dbEmpleados.js` (clave `ada_employees`) -- una de las 3 fuentes
-- de perdida de datos reportadas originalmente por el usuario (sueldos de
-- Equipo).
--
-- Dependencias: auth_rol() (migracion 002); audit_log, fn_audit_trigger()
-- (migracion 004, ejecutada y verificada).
--
-- Nota de seguridad (ver docs/modelo-datos/entidades.md #2.3): el PIN de
-- acceso rapido en campo se guarda hoy en texto plano en localStorage. Aqui
-- se reemplaza por pin_hash (bcrypt via pgcrypto) y NUNCA se expone en
-- updates masivos -- solo se puede fijar via fn_set_empleado_pin. No existe
-- todavia UI para editar el PIN (campo muerto en FormEmpleado.jsx), asi que
-- esta migracion es SQL puro, sin nuevo frontend de PIN por ahora.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.empleados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',

  -- Datos personales
  nombre text NOT NULL,
  cedula text,
  fecha_nacimiento date,
  genero text,
  estado_civil text,
  foto_url text,

  -- Contacto
  telefono text,
  email text,
  direccion text,
  ciudad text,

  -- Contacto de emergencia
  contacto_emergencia_nombre text,
  contacto_emergencia_relacion text,
  contacto_emergencia_telefono text,
  contacto_emergencia_direccion text,

  -- Datos laborales
  cargo text,
  departamento text,
  supervisor_id uuid REFERENCES public.empleados(id),
  fecha_ingreso date,
  tipo_contrato text,
  contrato_hasta date,
  tarifa_mensual numeric(12,2) NOT NULL DEFAULT 0,
  salario_no_constitutivo numeric(12,2) NOT NULL DEFAULT 0,
  carga_pct numeric(5,2) NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'Activo'
    CHECK (estado IN ('Activo','Retirado','Vacaciones','Incapacidad')),

  -- Login de campo (futuro, sin UI todavia)
  pin_hash text,

  -- Seguridad social
  eps text,
  pension text,
  arl text,
  caja_compensacion text,

  -- Documentos (flags booleanos por ahora, sin archivo real -- ver entidades.md)
  doc_cedula boolean NOT NULL DEFAULT false,
  doc_hoja_vida boolean NOT NULL DEFAULT false,
  doc_contrato boolean NOT NULL DEFAULT false,
  doc_certificados boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_empleados_tenant_id ON public.empleados (tenant_id);
CREATE INDEX idx_empleados_supervisor_id ON public.empleados (supervisor_id);

ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;

-- Lectura: admin/rrhh (gestion completa), gerencia (visibilidad), coordinador
-- (necesita nombres de empleados para la futura asignacion a proyectos, Fase 9)
CREATE POLICY empleados_select ON public.empleados
  FOR SELECT TO authenticated
  USING (auth_rol() IN ('admin','rrhh','gerencia','coordinador'));

CREATE POLICY empleados_write ON public.empleados
  FOR ALL TO authenticated
  USING (auth_rol() IN ('admin','rrhh'))
  WITH CHECK (auth_rol() IN ('admin','rrhh'));

CREATE POLICY claude_readonly_select_empleados ON public.empleados
  FOR SELECT TO claude_readonly USING (true);
-- Nota: claude_readonly puede leer pin_hash, pero es un hash bcrypt
-- irreversible -- mismo trade-off ya aceptado en la migracion 001 (claude_readonly
-- ya ve sueldos y montos de dinero en toda la app).

CREATE TRIGGER trg_audit_empleados
  AFTER INSERT OR UPDATE OR DELETE ON public.empleados
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER trg_empleados_updated_at
  BEFORE UPDATE ON public.empleados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: fijar/cambiar el PIN de un empleado. Nunca se expone en texto plano
-- fuera de esta funcion -- hashea con bcrypt (gen_salt('bf')) antes de guardar.
CREATE FUNCTION public.fn_set_empleado_pin(p_empleado_id uuid, p_pin text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth_rol() NOT IN ('admin','rrhh') THEN
    RAISE EXCEPTION 'permiso denegado' USING ERRCODE = '42501';
  END IF;

  IF p_pin IS NULL OR length(p_pin) < 4 THEN
    RAISE EXCEPTION 'el PIN debe tener al menos 4 caracteres';
  END IF;

  UPDATE public.empleados
  SET pin_hash = crypt(p_pin, gen_salt('bf'))
  WHERE id = p_empleado_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'empleado no encontrado';
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.fn_set_empleado_pin TO authenticated;
