-- 030_dias_laborales_mes_25.sql
-- Correctiva de dato (no de esquema): la usuaria confirmo que la base real
-- para calcular el valor/dia de cada empleado (tarifa mensual / dias
-- laborales del mes) es 25 dias, no los 23 sembrados en la migracion 003.
-- Afecta el costeo de mano de obra por proyecto (ProyectoDetalle.jsx,
-- dbProyectos.js, dbEmpleados.js.getDailyRate()) que ya leen
-- 'dias_laborales_mes' desde 'configuracion' via getSettings() -- no
-- requiere ningun cambio de codigo, solo el dato base.

BEGIN;

UPDATE public.configuracion
SET dias_laborales_mes = 25
WHERE tenant_id = 'ada';

COMMIT;
