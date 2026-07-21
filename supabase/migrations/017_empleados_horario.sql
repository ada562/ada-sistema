-- 017_empleados_horario.sql
-- Proposito: modulo "Horarios" (hoy placeholder en src/pages/rrhh/Horarios.jsx).
-- No confundir con el registro de horas trabajadas que ya existe
-- (registro_horas, migracion 011, consumido por Bitacoras.jsx/MiBitacora.jsx)
-- -- esto es la jornada laboral de referencia de cada empleado.
--
-- La empresa comunico por memo interno dos jornadas fijas (no personalizadas
-- por empleado): "Equipo de Diseño" (L-V, 8:00-17:25, almuerzo 1-2pm) y
-- "Equipo Administrativo" (horario distinto por dia, incluye sabado medio
-- dia). El detalle dia a dia vive en src/lib/horarios.js (PLANTILLAS_HORARIO)
-- -- no se modela como tabla porque no es dato editable por el usuario, es
-- politica de la empresa; aqui solo se guarda a que plantilla pertenece cada
-- empleado.
--
-- Dependencias: 007 (empleados).

BEGIN;

ALTER TABLE public.empleados
  ADD COLUMN tipo_horario text
  CHECK (tipo_horario IN ('Equipo de Diseño','Equipo Administrativo'));

COMMIT;
