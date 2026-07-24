-- 031_carga_prestacional_empleados.sql
-- Correctiva de dato (no de esquema): la usuaria envio su tabla real de
-- nomina (PAGO NETO / CARGA PRESTACIONAL / TOTAL, mensual y diario) por
-- cargo. El campo empleados.carga_pct existia pero todos los empleados
-- tenian el mismo valor plano (30%), que no correspondia a ningun cargo
-- real. Aqui se calcula carga_pct = carga_prestacional / pago_neto * 100
-- por cargo, y se cruza con el salario ya cargado en la app (tarifa_mensual
-- + salario_no_constitutivo) para identificar a cada persona.
--
-- Empleados sin match exacto de salario (se documenta, no se corrige aqui):
-- - ALEJANDRA DURAN AGUDELO (CEO): tarifa_mensual = 0 en la app; la tabla
--   de la usuaria trae $6.000.000. Falta cargar su salario.
-- - Alejandra Castillo (Aux. Contable): $1.860.000 en la app vs
--   $2.000.000 en la tabla de la usuaria.
--
-- Juan David Villegas y Pablo Novoa estan cargados con el mismo cargo
-- ("Coordinador de Carpinteria") pero la tabla trae dos Analistas de
-- Carpinteria con el mismo sueldo ($2.650.000) y % distinto (38.03% /
-- 37.09%). No hay forma de distinguirlos por dato existente en la app;
-- se asigno Villegas=38.03%, Novoa=37.09% como mejor esfuerzo -- la
-- usuaria puede corregirlo despues editando el empleado (Equipo ->
-- editar -> Carga prestacional %).

BEGIN;

-- CEO -- 1.420.418 / 6.000.000
UPDATE public.empleados SET carga_pct = 23.67
WHERE tenant_id = 'ada' AND id = 'cd1d2411-e5dc-43d7-bfd2-1fc9ca9c31dc'; -- ALEJANDRA DURAN AGUDELO

-- Gerente de Proyectos -- 1.007.918 / 2.650.000
UPDATE public.empleados SET carga_pct = 38.03
WHERE tenant_id = 'ada' AND id = '8c083ad0-e9b3-49e1-a782-786a8ec249b4'; -- JUAN SEBASTIAN GUTIERREZ

-- Coordinador de Carpinteria -- 1.045.333 / 3.000.000
UPDATE public.empleados SET carga_pct = 34.84
WHERE tenant_id = 'ada' AND id = '27da60b3-8870-4215-bbc6-727588e1a53e'; -- DAVID MANZANO

-- Analista de Carpinteria (mejor esfuerzo, ver nota arriba) -- 1.007.918 / 2.650.000
UPDATE public.empleados SET carga_pct = 38.03
WHERE tenant_id = 'ada' AND id = '32af7b86-f38f-4870-bfaf-d9bd414e2559'; -- Juan David Villegas

-- Analista de Carpinteria (mejor esfuerzo, ver nota arriba) -- 982.850 / 2.650.000
UPDATE public.empleados SET carga_pct = 37.09
WHERE tenant_id = 'ada' AND id = 'b542ba2e-b6bc-406d-9f78-8c2dda4f3276'; -- Pablo Novoa

-- Coordinador de Diseño -- 945.418 / 2.200.000
UPDATE public.empleados SET carga_pct = 42.97
WHERE tenant_id = 'ada' AND id = '1d45b2b9-44f7-4964-9e98-58a9f5a838ff'; -- ANGELICA MONRROY

UPDATE public.empleados SET carga_pct = 42.97
WHERE tenant_id = 'ada' AND id = 'c50cecbb-0178-4f77-a7f4-3c382a856ee6'; -- JULIANA TORRES

-- Auxiliar Contable -- 920.350 / 2.000.000
UPDATE public.empleados SET carga_pct = 46.02
WHERE tenant_id = 'ada' AND id = 'a1240eb8-2c6b-4abb-af09-4c888c6390a1'; -- Alejandra Castillo

-- Coordinador de Marketing -- 970.343 / 2.400.000
UPDATE public.empleados SET carga_pct = 40.43
WHERE tenant_id = 'ada' AND id = 'c9ee7bd3-ac9e-49dd-b972-9c7317e0d558'; -- LUISA FRANCHESCA MARIN

COMMIT;
