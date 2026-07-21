-- 017_empleados_horario.sql
-- Proposito: modulo "Horarios" (hoy placeholder en src/pages/rrhh/Horarios.jsx).
-- No confundir con el registro de horas trabajadas que ya existe
-- (registro_horas, migracion 011, consumido por Bitacoras.jsx/MiBitacora.jsx)
-- -- esto es la jornada laboral FIJA de referencia de cada empleado (hora
-- de entrada/salida y dias laborales), no un historial de horas trabajadas.
-- Confirmado con el usuario via AskUserQuestion: alcance = "Turnos/jornada
-- laboral", no control de asistencia ni solicitud de permisos.
--
-- Se agregan como columnas de `empleados` (no tabla aparte) porque es un
-- dato de referencia 1:1 por empleado, sin historial -- igual criterio que
-- cargo/departamento en la migracion 007. Cubierto por las mismas politicas
-- RLS (empleados_select/empleados_write) y el trigger de auditoria
-- (trg_audit_empleados) ya existentes en esa tabla.
--
-- Dependencias: 007 (empleados).

BEGIN;

ALTER TABLE public.empleados
  ADD COLUMN horario_entrada time,
  ADD COLUMN horario_salida time,
  ADD COLUMN dias_laborales text[] NOT NULL DEFAULT ARRAY['Lunes','Martes','Miercoles','Jueves','Viernes']::text[];

ALTER TABLE public.empleados
  ADD CONSTRAINT chk_empleados_dias_laborales
  CHECK (dias_laborales <@ ARRAY['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo']::text[]);

COMMIT;
