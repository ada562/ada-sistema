-- 009_seed_datos_historicos.sql
-- Proposito: importar los datos historicos reales que hoy viven unicamente
-- en localStorage/firebase_export/*.json hacia las tablas de Supabase creadas
-- en las migraciones 006 (contratistas/pagos_contratistas), 007 (empleados) y
-- 008 (pagos_nomina), y retroactivamente en 'transacciones' (migracion 004,
-- ya ejecutada pero con 0 filas en produccion). Sin esta migracion, el go-live
-- de Supabase haria "desaparecer" (de la UI, no del disco) 9 empleados, 5
-- contratistas, 5 cuentas de cobro, 1 pago de nomina y 129 transacciones
-- reales -- gap detectado al confirmar con el usuario antes de pasar a
-- produccion ("no se pueden perder ningun dato").
--
-- Fuente de datos: firebase_export/employees.json, contractors.json,
-- contractorPayments.json, payrollPayments.json, transactions.json --
-- verificados contra el localStorage real (ada_backup_2026-07-15.json):
-- mismos conteos exactos (9/5/5/1/129), confirmando que son la fuente
-- correcta y completa a la fecha de esta migracion.
--
-- Dependencias: 003 (categorias/cuentas, ejecutada), 004 (transacciones,
-- ejecutada), 006 (contratistas/pagos_contratistas), 007 (empleados), 008
-- (pagos_nomina) -- estas 3 ultimas deben ejecutarse ANTES que esta migracion,
-- siguen '⚠️ Pendiente' en MIGRATIONS.md al momento de escribir este archivo.
--
-- Decisiones tomadas para no perder ni inventar datos:
-- 1) IDs legado (formato 'id_xxxxx', no uuid) se mapean a nuevos uuid via
--    tablas temporales (solo viven durante esta sesion de SQL Editor).
-- 2) Ningun empleado legado tiene campo 'supervisor' -> supervisor_id queda
--    NULL para los 9, no se inventa jerarquia.
-- 3) 2 empleados tienen PIN en texto plano en el JSON legado (deuda tecnica
--    ya conocida) -- se hashean inline con crypt()/gen_salt('bf') igual que
--    fn_set_empleado_pin, nunca se guarda el PIN en texto plano.
-- 4) El unico pago de nomina legado (payrollPayments.json) no incluye el
--    campo 'tipo' (la tabla nueva lo exige NOT NULL). Por quincena=1 y
--    periodo definidos se asume 'legal' (salario quincenal ordinario) --
--    unica inferencia de esta migracion, documentada aqui explicitamente.
-- 5) Los 129 registros de 'transactions.json' NO tienen (o tienen en null)
--    'contractorId'/'contractorPaymentId' pese a que existen pagos a
--    contratistas y de nomina en el mismo periodo -- no se intenta adivinar
--    la relacion por coincidencia de monto/fecha/texto (alto riesgo de atar
--    mal un gasto). Se insertan con 'contratista_id'/'pago_contratista_id'/
--    'nomina_payment_id' en NULL, preservando el registro completo tal cual
--    existia (fecha, cuenta, monto, categoria, descripcion, GBA, facturado).
-- 6) 'categoria' del historico usa el string 'TRANSPORTE' (6 transacciones),
--    que NO existe en la tabla 'categorias' sembrada en la migracion 003 --
--    solo existe 'TRASNPORTE' (con el error de tipeo, tal cual el dropdown
--    legado). Son dos strings distintos en los datos reales, no se asume
--    cual es el "correcto" -- se agrega 'TRANSPORTE' como categoria nueva
--    (tipo gasto) en vez de forzar el match contra 'TRASNPORTE', evitando
--    recategorizar historico sin confirmacion del usuario.
-- 7) proyecto_id/servicio_id: ningun registro de transactions.json referencia
--    un proyecto real gestionado en Supabase todavia (Fase 8-9 no ejecutada)
--    -- se preservan tal cual como texto (ids legado 'id_xxxxx' o NULL), la
--    columna ya es 'text' sin FK desde la migracion 004 exactamente para esto.

BEGIN;

-- Categoria adicional detectada en el historico real, ausente de la semilla
-- de la migracion 003 (ver nota 6 arriba).
INSERT INTO public.categorias (tenant_id, tipo, nombre)
VALUES ('ada', 'gasto', 'TRANSPORTE')
ON CONFLICT (tenant_id, tipo, nombre) DO NOTHING;

-- ============================================================
-- Tablas temporales de mapeo id-legado -> uuid nuevo
-- (solo existen durante esta sesion del SQL Editor)
-- ============================================================
CREATE TEMP TABLE _map_empleados (old_id text PRIMARY KEY, new_id uuid NOT NULL DEFAULT gen_random_uuid());
CREATE TEMP TABLE _map_contratistas (old_id text PRIMARY KEY, new_id uuid NOT NULL DEFAULT gen_random_uuid());
CREATE TEMP TABLE _map_pagos_contratistas (old_id text PRIMARY KEY, new_id uuid NOT NULL DEFAULT gen_random_uuid());
CREATE TEMP TABLE _map_pagos_nomina (old_id text PRIMARY KEY, new_id uuid NOT NULL DEFAULT gen_random_uuid());

INSERT INTO _map_empleados (old_id) VALUES
  ('id_mqqu46fz9351o'),
  ('id_mr12o1mhkriek'),
  ('id_mr12s70w8ydjz'),
  ('id_mr12tsqn3c7f8'),
  ('id_mr1301msbkgf2'),
  ('id_mr133i2k9nhmt'),
  ('id_mr3ljouka8r0z'),
  ('id_mr3lksg34ub79'),
  ('id_mrdrp6d8rf1dk');

INSERT INTO _map_contratistas (old_id) VALUES
  ('id_mr9jl2d55dlva'),
  ('id_mr9p2nfi8h7dq'),
  ('id_mr9p6c0mxtigm'),
  ('id_mr9pbfnac319z'),
  ('id_mrm5gvmc8vgkn');

INSERT INTO _map_pagos_contratistas (old_id) VALUES
  ('id_mrb3m5e8glfrr'),
  ('id_mrb3m5e8dtkr5'),
  ('id_mrb3m5e8bxvnx'),
  ('id_mrb3m5e8r93sq'),
  ('id_mrmj3qyv32ick');

INSERT INTO _map_pagos_nomina (old_id) VALUES
  ('id_mrgnq520723za');

-- ============================================================
-- 1) empleados (9 registros, firebase_export/employees.json)
-- ============================================================
INSERT INTO public.empleados (
  id, tenant_id, nombre, cedula, cargo, tarifa_mensual, salario_no_constitutivo,
  carga_pct, estado, contrato_hasta, pin_hash
)
SELECT m.new_id, 'ada', v.nombre, v.cedula, v.cargo, v.tarifa_mensual, v.salario_no_constitutivo,
  v.carga_pct, v.estado, v.contrato_hasta::date,
  CASE WHEN v.pin IS NOT NULL THEN crypt(v.pin, gen_salt('bf')) ELSE NULL END
FROM (VALUES
  ('id_mqqu46fz9351o', 'JUAN SEBASTIAN GUTIERREZ', NULL, 'GERENTE DE PROYECTOS', 1660000, 790000, 30, 'Activo', '2026-07-13', '1507'),
  ('id_mr12o1mhkriek', 'ALEJANDRA DURAN AGUDELO', NULL, 'CEO', 0, 0, 30, 'Activo', NULL, NULL),
  ('id_mr12s70w8ydjz', 'PABLO NOVOA', NULL, 'COORDINADOR DE CARPINTERIA', 1750905, 650000, 30, 'Activo', NULL, NULL),
  ('id_mr12tsqn3c7f8', 'JULIANA TORRES', NULL, 'COORDINADOR DE DISEÑO', 1750905, 170000, 30, 'Activo', NULL, NULL),
  ('id_mr1301msbkgf2', 'ANGELICA MONRROY', NULL, 'COORDINADOR DE DISEÑO', 1750905, 170000, 30, 'Activo', NULL, NULL),
  ('id_mr133i2k9nhmt', 'JUAN DAVID DIAZ VILLEGAS', NULL, 'COORDINADOR DE CARPINTERIA', 1860000, 790000, 30, 'Activo', NULL, NULL),
  ('id_mr3ljouka8r0z', 'DAVID MANZANO', NULL, 'COORDINADOR DE CARPINTERIA', 1750905, 529600, 30, 'Activo', '2026-07-13', NULL),
  ('id_mr3lksg34ub79', 'LUISA FRANCHESCA MARIN', NULL, 'COORDINADO DE MARKETING', 1660000, 540000, 30, 'Activo', NULL, NULL),
  ('id_mrdrp6d8rf1dk', 'CLAUDIA ALEJANDRA CASTILLO', NULL, 'AUX ADMINISTRATIVA Y CONTABLE', 1860000, 0, 30, 'Activo', '2026-11-15', '1227')
) AS v(old_id, nombre, cedula, cargo, tarifa_mensual, salario_no_constitutivo, carga_pct, estado, contrato_hasta, pin)
JOIN _map_empleados m ON m.old_id = v.old_id;

-- ============================================================
-- 2) contratistas (5 registros, firebase_export/contractors.json)
-- ============================================================
INSERT INTO public.contratistas (id, tenant_id, nombre, telefono, email, activo, notas)
SELECT m.new_id, 'ada', v.nombre, v.telefono, v.email, v.activo, v.notas
FROM (VALUES
  ('id_mr9jl2d55dlva', 'SERGIO PINEDA', '3142896521', 'vaseadmon@gmail.com', true, NULL),
  ('id_mr9p2nfi8h7dq', 'VALERIA LUNA RAMÍREZ', '321 6902721', NULL, true, NULL),
  ('id_mr9p6c0mxtigm', 'Carlos Eduardo López Ramos', '324 5677922', 'genemis89@gmail.com', true, NULL),
  ('id_mr9pbfnac319z', 'CAROLINA VALENCIA', '3117154852', NULL, true, NULL),
  ('id_mrm5gvmc8vgkn', 'NATALY GALVEZ', '3155787713', 'Galvezoyolan@gmail.com', true, 'CONTRATISTA PAGO POR NEQUI 3155787713')
) AS v(old_id, nombre, telefono, email, activo, notas)
JOIN _map_contratistas m ON m.old_id = v.old_id;

-- ============================================================
-- 3) pagos_contratistas (5 registros, firebase_export/contractorPayments.json)
-- Una cuenta de cobro real (Carlos Eduardo Lopez Ramos) tiene monto = 0 --
-- la migracion 006 exigia monto > 0 (CHECK), demasiado estricto para este
-- caso real. Se relaja a >= 0 en vez de descartar el registro (no se pierde
-- ningun dato historico real).
-- ============================================================
ALTER TABLE public.pagos_contratistas
  DROP CONSTRAINT pagos_contratistas_monto_check,
  ADD CONSTRAINT pagos_contratistas_monto_check CHECK (monto >= 0);

INSERT INTO public.pagos_contratistas (id, tenant_id, contratista_id, fecha, fecha_abono, fecha_pago_total, monto, monto_pagado, descripcion)
SELECT mp.new_id, 'ada', mc.new_id, v.fecha::date, v.fecha_abono::date, v.fecha_pago_total::date, v.monto, v.monto_pagado, v.descripcion
FROM (VALUES
  ('id_mrb3m5e8glfrr', 'id_mr9jl2d55dlva', '2026-07-09', NULL, NULL, 663000, 363000, 'PAGO DE ASESORIA FINANCIERA'),
  ('id_mrb3m5e8dtkr5', 'id_mr9p2nfi8h7dq', '2026-07-08', NULL, NULL, 450000, 225000, 'Pago final correspondiente al 50% restante de los servicios prestados durante el mes de abril, los cuales constan de la creación de carruseles para redes sociales, en formatos estáticos e interactivos, así como de la edición de reels, de acuerdo con los requerimientos del cliente. Cuenta de ahorros Bancolombia  N.º  72547656653'),
  ('id_mrb3m5e8bxvnx', 'id_mr9p6c0mxtigm', '2026-07-01', NULL, NULL, 0, 0, NULL),
  ('id_mrb3m5e8r93sq', 'id_mr9pbfnac319z', '2026-06-19', NULL, '2026-07-09', 720000, 720000, 'POR CONCEPTO DE: Paquete TOP - Fotografías Malabar Reservado casa 38'),
  ('id_mrmj3qyv32ick', 'id_mrm5gvmc8vgkn', '2026-07-15', NULL, NULL, 1062000, 0, 'SERVICIO DE PAGINAS')
) AS v(old_id, old_contratista_id, fecha, fecha_abono, fecha_pago_total, monto, monto_pagado, descripcion)
JOIN _map_pagos_contratistas mp ON mp.old_id = v.old_id
JOIN _map_contratistas mc ON mc.old_id = v.old_contratista_id;

-- ============================================================
-- 4) pagos_nomina (1 registro, firebase_export/payrollPayments.json)
-- 'tipo' no existe en el JSON legado -- se asume 'legal' (ver nota 4 arriba).
-- ============================================================
INSERT INTO public.pagos_nomina (id, tenant_id, empleado_id, fecha, tipo, quincena, periodo_inicio, periodo_fin, semestre, monto, metodo, notas)
SELECT mn.new_id, 'ada', me.new_id, v.fecha::date, 'legal', v.quincena, v.periodo_inicio::date, v.periodo_fin::date, NULL, v.monto, v.metodo, v.notas
FROM (VALUES
  ('id_mrgnq520723za', 'id_mrdrp6d8rf1dk', '2026-07-11', 1, '2026-07-01', '2026-07-15', 930000, 'efectivo', NULL)
) AS v(old_id, old_empleado_id, fecha, quincena, periodo_inicio, periodo_fin, monto, metodo, notas)
JOIN _map_pagos_nomina mn ON mn.old_id = v.old_id
JOIN _map_empleados me ON me.old_id = v.old_empleado_id;

-- ============================================================
-- 5) transacciones (129 registros, firebase_export/transactions.json)
-- Sin contratista_id/pago_contratista_id/nomina_payment_id (ver nota 5 arriba)
-- -- el historico no permite resolverlos sin adivinar.
-- ============================================================
INSERT INTO public.transacciones (tenant_id, fecha, tipo, cuenta, monto, categoria_id, descripcion, gba_movimiento, facturado, proyecto_id, servicio_id)
SELECT 'ada', v.fecha::date, v.tipo, v.cuenta, v.monto,
  (SELECT id FROM public.categorias WHERE tenant_id = 'ada' AND tipo = v.tipo AND nombre = v.categoria LIMIT 1),
  v.descripcion, v.gba_movimiento, v.facturado, v.proyecto_id, v.servicio_id
FROM (VALUES
  ('2026-06-01', 'gasto', 'nequi', 201550, 'SUMINISTROS DE OFICINA', 'PAGO DE HOTMART  CAPACITACIONES', NULL, false, NULL, NULL),
  ('2026-06-01', 'gasto', 'banco', 163910, 'SUMINISTROS DE OFICINA', 'PAGO DE HOTMART  CAPACITACIONES', NULL, false, NULL, NULL),
  ('2026-06-02', 'gasto', 'efectivo', 60000, 'OTROS GASTOS', NULL, NULL, false, 'id_mqtlkegidhxxk', NULL),
  ('2026-06-02', 'gasto', 'efectivo', 23000, 'TRANSPORTE', 'PROYECTO PINAMAR', NULL, false, 'id_mqtllc2vm60fb', NULL),
  ('2026-06-04', 'gasto', 'efectivo', 4495000, 'TRASLADO ENTRE CUENTAS', 'TRASLADO DEL EFECTIVO DE CUENTA PARA PAGAR LOS APARTES', NULL, false, NULL, NULL),
  ('2026-06-04', 'ingreso', 'banco', 4495000, 'TRASLADO ENTRE CUENTAS', 'TRASLADO DE DINERO DE EFECTIVO AL BANCO PARA PAGARA LOS APORTES', NULL, false, NULL, NULL),
  ('2026-06-04', 'gasto', 'banco', 4501200, 'APORTES SALARIALES', 'PAGO DE PLANILLA DE JUNIO', NULL, false, NULL, NULL),
  ('2026-06-04', 'gasto', 'efectivo', 120000, 'OTROS GASTOS', 'PAGO DE DAÑO DE CELULAR DE PABLO', NULL, false, NULL, NULL),
  ('2026-06-04', 'gasto', 'banco', 895539, 'NOMINA', 'ANTICIPO PRIMA CRUCE DE TARJETA DE CREDITO', NULL, false, NULL, NULL),
  ('2026-06-05', 'gasto', 'banco', 177000, 'TRASLADO ENTRE CUENTAS', 'TRASLADO DE BANCO A NEQUI PARA PAGO DE SLACK', NULL, false, NULL, NULL),
  ('2026-06-05', 'ingreso', 'nequi', 177000, 'TRASLADO ENTRE CUENTAS', 'TRASLADO ENTRE CUENTAS DE EFECTIVO A NEQUI PARA PAGAR SLACK', NULL, false, NULL, NULL),
  ('2026-06-05', 'gasto', 'banco', 250000, 'TRASLADO ENTRE CUENTAS', 'TRASLADO A NEQUI', NULL, false, NULL, NULL),
  ('2026-06-05', 'ingreso', 'nequi', 250000, 'TRASLADO ENTRE CUENTAS', 'TRASLADO DE CUENTA DE BANCO A NEQUI', NULL, false, NULL, NULL),
  ('2026-06-05', 'gasto', 'nequi', 181793, 'PUBLICIDAD Y MERCADEO', 'PAGO SLACK', NULL, false, NULL, NULL),
  ('2026-06-05', 'gasto', 'banco', 200000, 'OTROS GASTOS', 'PENDIENTE SALIDA POR IDENTIFICAR', NULL, false, NULL, NULL),
  ('2026-06-06', 'gasto', 'banco', 2264, 'GASTOS BANCARIOS', NULL, NULL, false, NULL, NULL),
  ('2026-06-08', 'gasto', 'nequi', 230203, 'PUBLICIDAD Y MERCADEO', 'FACEBOOK', NULL, false, NULL, NULL),
  ('2026-06-11', 'gasto', 'banco', 12800, 'TRANSPORTE', 'TRANSPORTE PROYECTO PINAMAR', NULL, false, 'id_mqtllc2vm60fb', NULL),
  ('2026-06-11', 'ingreso', 'efectivo', 600000, 'DEVOLUCION PRESTAMO', 'DEVOLUCION PRESTAMO PAGO DEUDA NOMINA', NULL, false, NULL, NULL),
  ('2026-06-11', 'ingreso', 'efectivo', 10922000, 'DELUXE', 'CASA REVES VISITAS', NULL, true, 'id_mqtlb51wzncc4', NULL),
  ('2026-06-11', 'gasto', 'efectivo', 930000, 'NOMINA', 'NOMINA ALEJANDRA CASTILLO', NULL, false, NULL, NULL),
  ('2026-06-11', 'gasto', 'efectivo', 1100000, 'NOMINA', 'ANGELICA MONRROY NOMINA BASE', NULL, false, NULL, NULL),
  ('2026-06-11', 'gasto', 'efectivo', 1325000, 'NOMINA', 'NOMINA GERENCIA JUAN SEBASTIAN GUTIERREZ', NULL, false, NULL, NULL),
  ('2026-06-11', 'gasto', 'efectivo', 1500000, 'NOMINA', 'NOMINA COORDINACION DAVID MANZANO', NULL, false, NULL, NULL),
  ('2026-06-11', 'gasto', 'efectivo', 1100000, 'NOMINA', 'NOMINA COORDINACION JULIANA TORRES', NULL, false, NULL, NULL),
  ('2026-06-11', 'gasto', 'efectivo', 1200000, 'NOMINA', 'NOMINA FRANCHESCA MARIN COORDINACION', NULL, false, NULL, NULL),
  ('2026-06-11', 'gasto', 'efectivo', 1325000, 'NOMINA', 'JUAN DAVID DIAZ NOMINA BASE', NULL, false, NULL, NULL),
  ('2026-06-11', 'gasto', 'efectivo', 400000, 'NOMINA', 'NOMINA BASE NATALY GALVEZ', NULL, false, NULL, NULL),
  ('2026-06-11', 'gasto', 'efectivo', 1255000, 'NOMINA', 'NOMINA BASE PABLO NOVOA', NULL, false, NULL, NULL),
  ('2026-06-11', 'gasto', 'efectivo', 337000, 'HONORARIOS', 'PAGO A SERGIO PINEDA ASESORIA FINANCIERA', NULL, false, NULL, NULL),
  ('2026-06-11', 'gasto', 'efectivo', 450000, 'PUBLICIDAD Y MERCADEO', 'HONORARIOS VALERIA RAMIREZ', NULL, false, NULL, NULL),
  ('2026-06-11', 'ingreso', 'efectivo', 1906000, 'DEVOLUCION PRESTAMO', 'pago de la empresa', NULL, false, NULL, NULL),
  ('2026-06-11', 'gasto', 'efectivo', 1906000, 'RENTING', NULL, NULL, false, NULL, NULL),
  ('2026-06-12', 'ingreso', 'efectivo', 1360000, 'VISITAS DE OBRA', 'PAGO DE DOÑA LIZETH RESORT 305', NULL, false, 'id_mqtljegt2g4mx', NULL),
  ('2026-06-12', 'gasto', 'efectivo', 50600, 'OTROS GASTOS', 'DESAYUNO PARA VISITA DE COCINAS', NULL, false, NULL, NULL),
  ('2026-06-12', 'gasto', 'efectivo', 24000, 'PUBLICIDAD Y MERCADEO', 'PLOTER PLANO', NULL, false, NULL, NULL),
  ('2026-06-12', 'ingreso', 'nequi', 49000, 'TRASLADO ENTRE CUENTAS', 'BANCOLOMBIA -NEQUI PAGO DE MESHY', NULL, false, NULL, NULL),
  ('2026-06-12', 'gasto', 'banco', 49000, 'TRASLADO ENTRE CUENTAS', 'BANCOLOMBIA - NEQUI', NULL, false, NULL, NULL),
  ('2026-06-12', 'gasto', 'nequi', 24276, 'LICENCIAS', 'PAGO DE MESHY', NULL, false, NULL, NULL),
  ('2026-06-16', 'ingreso', 'banco', 10000000, 'LUXE', 'PAGO POR CASA SACRO EMY', NULL, true, 'id_mqtlf5eev9fq0', NULL),
  ('2026-06-16', 'ingreso', 'efectivo', 2500000, 'DEVOLUCION PRESTAMO', 'PAGO DE LA DEUDA QUE TIENE ALEJA', NULL, false, NULL, NULL),
  ('2026-06-16', 'gasto', 'banco', 60000, 'TRASLADO ENTRE CUENTAS', 'BANCO EMPRESA-NEQUI', NULL, false, NULL, NULL),
  ('2026-06-16', 'gasto', 'efectivo', 400000, 'OTROS GASTOS', 'PRESTAMO DOÑA BEATRIZ', NULL, false, NULL, NULL),
  ('2026-06-17', 'gasto', 'efectivo', 30000, 'PUBLICIDAD Y MERCADEO', 'PLOTEO', NULL, false, NULL, NULL),
  ('2026-06-17', 'gasto', 'efectivo', 12000, 'TRANSPORTE', 'PAGO DE UBER', NULL, false, 'id_mqtljegt2g4mx', NULL),
  ('2026-06-17', 'ingreso', 'nequi', 2500000, 'OTROS INGRESOS', 'PAGO DE DEUDA DOÑA BEATRIZ PARA PAUTA PUBLICITARIA', NULL, false, NULL, NULL),
  ('2026-06-19', 'gasto', 'efectivo', 12000, 'TRANSPORTE', 'UBER ICONO 509', NULL, false, 'id_mqtlm5zem9lod', NULL),
  ('2026-06-19', 'gasto', 'efectivo', 10000, 'TRANSPORTE', 'GRAN RESORT 305', NULL, false, NULL, NULL),
  ('2026-06-20', 'gasto', 'efectivo', 720000, 'CONTRATISTAS', 'FOTOGRAFIA MALABAR RESERVADO CASA38', NULL, false, NULL, NULL),
  ('2026-06-22', 'ingreso', 'efectivo', 5273634, 'DELUXE', 'SEGUNDO PAGO CASA SACRO', NULL, false, 'id_mqtlf5eev9fq0', NULL),
  ('2026-06-26', 'gasto', 'banco', 300000, 'NOMINA', 'NOMINA BASE ( ALEJANDRA CASTILLO) PRIMA LEGAL', NULL, false, NULL, NULL),
  ('2026-06-30', 'gasto', 'efectivo', 12000, 'TRANSPORTE', 'ADA-PINAMAR-ADA', NULL, false, 'id_mqtllc2vm60fb', NULL),
  ('2026-07-01', 'ingreso', 'banco', 7000000, 'ESPECIFICACIONES GBA', 'PRESTAMO DOÑA BEATRIZ PARA PAGAR NOMINA', NULL, false, NULL, NULL),
  ('2026-06-26', 'gasto', 'banco', 627778, 'NOMINA', 'ANGELICA  MONROY  NOMINA BASE', NULL, false, NULL, NULL),
  ('2026-06-26', 'gasto', 'banco', 933333, 'NOMINA', 'JUAN SEBASTIAN GUTIERREZ ( NOMINA DE GERENCIA)', NULL, false, NULL, NULL),
  ('2026-06-26', 'gasto', 'banco', 974400, 'NOMINA', 'NOMINA DAVID MANZANO (NOMINA DE COORDINACIO)', NULL, false, NULL, NULL),
  ('2026-06-26', 'gasto', 'banco', 933333, 'NOMINA', 'NOMINA DE JULIANA TORRES ( NOMINA DE COORDINACION)', NULL, false, NULL, NULL),
  ('2026-06-26', 'gasto', 'banco', 933333, 'NOMINA', 'LUISA FRANCHESCA MARIN ( NOMINA COORDINACION)', NULL, false, NULL, NULL),
  ('2026-06-26', 'gasto', 'banco', 933333, 'NOMINA', 'PAGO PRIMA LEGAL VIGENTE( JUAN DAVID DIAZ)', NULL, false, NULL, NULL),
  ('2026-06-26', 'gasto', 'banco', 644444, 'NOMINA', 'PABLO NOVOA PRIMA LEGAL VIGENTE', NULL, false, NULL, NULL),
  ('2026-06-26', 'gasto', 'banco', 310230, 'OTROS GASTOS', 'PAGO DE MOVISTAR', NULL, false, NULL, NULL),
  ('2026-06-26', 'gasto', 'efectivo', 106722, 'NOMINA', 'ANGELICA MARIA MONRROY PRIMA NO CONSTITUTIVA', NULL, false, NULL, NULL),
  ('2026-06-26', 'gasto', 'efectivo', 368667, 'NOMINA', 'PAGO PRIMA NO CONSTITUTIVA DE JUAN SEBASTIAN', NULL, false, NULL, NULL),
  ('2026-06-26', 'gasto', 'efectivo', 494293, 'NOMINA', 'DAVID MANZANO ( PRIMA NO CONSTITUTIVA)', NULL, false, NULL, NULL),
  ('2026-06-26', 'gasto', 'efectivo', 158667, 'NOMINA', 'JULIANA TORRES ( PRIMA NO CONSTITUTIVA)', NULL, false, NULL, NULL),
  ('2026-06-26', 'gasto', 'efectivo', 252000, 'NOMINA', 'LUISA FRANCHESCA MARIN ( PRIMA NO CONSTITUTIVA)', NULL, false, NULL, NULL),
  ('2026-06-26', 'gasto', 'efectivo', 368677, 'NOMINA', 'JUAN DAVID DIAZ ( PRIMA NO CONSTITUTIVA)', NULL, false, NULL, NULL),
  ('2026-06-26', 'gasto', 'efectivo', 209444, 'NOMINA', 'PABLO ALEJANDRO NOVOA( PRIMA NO CONSTITUTIVA)', NULL, false, NULL, NULL),
  ('2026-07-01', 'gasto', 'banco', 930000, 'NOMINA', 'NOMINA  30 DE JUNIO  ALEJANDRA CASTILLO', NULL, false, NULL, NULL),
  ('2026-07-01', 'gasto', 'banco', 930000, 'NOMINA', 'NOMINA 30 DE JUNIO ANGELICA MONRROY', NULL, false, NULL, NULL),
  ('2026-07-01', 'gasto', 'banco', 930000, 'NOMINA', 'NOMINA 30 DE JUNIO JUAN SEBASTIAN GUTIERREZ', NULL, false, NULL, NULL),
  ('2026-07-01', 'gasto', 'banco', 930000, 'NOMINA', 'NOMINA 30 DE JULIO JULIANA TORRES', NULL, false, NULL, NULL),
  ('2026-07-01', 'gasto', 'banco', 970399, 'NOMINA', 'NOMINA 30 DE JUNIO DAVID MANZANO', NULL, false, NULL, NULL),
  ('2026-07-01', 'gasto', 'banco', 930000, 'NOMINA', 'NOMINA DE 30 LUISA FRANCHESCA MARIN', NULL, false, NULL, NULL),
  ('2026-07-01', 'gasto', 'banco', 930000, 'NOMINA', 'NOMINA 30 DE JUNIO JUAN DAVID DIAZ', NULL, false, NULL, NULL),
  ('2026-07-01', 'gasto', 'banco', 930000, 'NOMINA', 'NOMINA 30 DE JUNIO PABLO NOVOA', NULL, false, NULL, NULL),
  ('2026-07-01', 'gasto', 'efectivo', 400000, 'NOMINA', 'NOMINA 30 DE JUNIO LEGAL VIGENTE', NULL, false, NULL, NULL),
  ('2026-07-01', 'ingreso', 'efectivo', 826286, 'ESPECIFICACIONES GBA', 'PRESTAMO PARA NOMINA DEL 30 DE JUNIO PAGO NO CONSTITUTIVO', NULL, false, NULL, NULL),
  ('2026-07-01', 'gasto', 'efectivo', 270000, 'NOMINA', 'LUISA FRANCHESCA MARIN NO CONSTITUTIVA 30 DE JUNIO', NULL, false, NULL, NULL),
  ('2026-07-01', 'gasto', 'efectivo', 395000, 'NOMINA', 'JUAN SEBASTIAN GUTIERREZ ( NOMINA 30 DE JUNIO NO CONSTITUTIVO)', NULL, false, NULL, NULL),
  ('2026-07-01', 'gasto', 'efectivo', 170000, 'NOMINA', 'JULIANA TORRES ( NO CONSTITUTIVO', NULL, false, NULL, NULL),
  ('2026-07-01', 'gasto', 'efectivo', 325000, 'NOMINA', 'PABLO NOVOA ( PAGO 30 DE JUNIO NO COSTITUTIVO)', NULL, false, NULL, NULL),
  ('2026-07-01', 'gasto', 'efectivo', 395000, 'NOMINA', 'PAGO DE NOMINA JUAN DAVID NO CONSTITUTIVO', NULL, false, NULL, NULL),
  ('2026-07-01', 'gasto', 'efectivo', 170000, 'NOMINA', 'NOMINA DE ANGELICA TORRES NO CONSTITUTIVO 30 DE JUNIO', NULL, false, NULL, NULL),
  ('2026-07-01', 'gasto', 'efectivo', 529600, 'NOMINA', 'PAGO A DAVID MANZANO 30 DE JUNIO NO CONSTITUTIVO', NULL, false, NULL, NULL),
  ('2026-06-16', 'gasto', 'efectivo', 4225320, 'NOMINA', 'PAGO DE PRIMA Y NOMINA ALEJANDRA DURAN PAGO DE JUNIO', NULL, true, NULL, NULL),
  ('2026-07-02', 'gasto', 'banco', 571, 'GASTOS BANCARIOS', 'GASTOS BANCARIOS', NULL, false, NULL, NULL),
  ('2026-07-02', 'gasto', 'efectivo', 300000, 'HONORARIOS', 'PAGO DE SERVICIO DE CHECHO SE LE DEBE 363000', NULL, false, NULL, NULL),
  ('2026-07-02', 'gasto', 'efectivo', 300000, 'OTROS GASTOS', 'PRESTAMO DE DINERO A DOÑA BEATRIZ', NULL, false, NULL, NULL),
  ('2026-07-03', 'ingreso', 'banco', 694000, 'ESPECIFICACIONES GBA', 'PRESTAMO DE 394000 DOÑA BEATRIZ PORQUE ME DEBIA 300.000', NULL, false, NULL, NULL),
  ('2026-07-03', 'gasto', 'banco', 9200, 'APORTES SALARIALES', 'PAGO DE PLANILLAS JULIO', NULL, false, NULL, NULL),
  ('2026-07-03', 'gasto', 'banco', 3661000, 'APORTES SALARIALES', 'PAGO DE PLANILLA JULIO', NULL, false, NULL, NULL),
  ('2026-07-03', 'gasto', 'banco', 928100, 'APORTES SALARIALES', 'PAGO DE PLANILLAS JUNIO', NULL, false, NULL, NULL),
  ('2026-07-03', 'gasto', 'efectivo', 5100, 'LIQUIDACIONES', 'INVENTO QUE ME HACE FALTA', NULL, false, NULL, NULL),
  ('2026-07-06', 'gasto', 'efectivo', 10000, 'TRANSPORTE', 'TRANSPORTE PARA JUAN SEBASTIAN GUTIERREZ', NULL, true, 'id_mqtljegt2g4mx', NULL),
  ('2026-06-01', 'gasto', NULL, 24010595, 'GBA', 'NO SE', 'prestamo_otorgado', true, NULL, NULL),
  ('2026-07-01', 'ingreso', NULL, 828286, 'GBA', 'PARA EL PAGO DE NOMINA NO CONSTITUTIVA', 'prestamo_recibido', true, NULL, NULL),
  ('2026-07-02', 'gasto', NULL, 300000, 'GBA', 'LE PRESTO 300.000 PARA QUE CANCEL A PROVEEDORES', 'pago_prestamo', true, NULL, NULL),
  ('2026-07-01', 'ingreso', NULL, 7000000, 'GBA', 'PARA PAGO DE NOMINA DEL 30 DE JUNIO 2026', 'prestamo_recibido', true, NULL, NULL),
  ('2026-07-03', 'ingreso', NULL, 694000, 'GBA', 'GBA NO ABONA PARA PAGO DE PLANILLAS', 'prestamo_recibido', true, NULL, NULL),
  ('2026-06-18', 'gasto', 'nequi', 44900, 'PUBLICIDAD Y MERCADEO', 'APPLE COM BILL', NULL, true, NULL, NULL),
  ('2026-06-18', 'gasto', 'nequi', 44900, 'PUBLICIDAD Y MERCADEO', 'GOOGLE ONE', NULL, true, NULL, NULL),
  ('2026-06-19', 'gasto', 'nequi', 64139, 'PUBLICIDAD Y MERCADEO', 'ATLASSIAN', NULL, true, NULL, NULL),
  ('2026-06-27', 'gasto', 'nequi', 150285, 'LICENCIAS', 'FACEBOOK', NULL, true, NULL, NULL),
  ('2026-06-29', 'gasto', 'nequi', 88418, 'LICENCIAS', 'SHOPIFY', NULL, true, NULL, NULL),
  ('2026-06-29', 'gasto', 'nequi', 146900, 'LICENCIAS', 'HOSTINGER', NULL, true, NULL, NULL),
  ('2026-06-29', 'gasto', 'nequi', 215669, 'LICENCIAS', 'ASANA', NULL, true, NULL, NULL),
  ('2026-06-30', 'gasto', 'nequi', 88672, 'LICENCIAS', 'SHOPIFY', NULL, true, NULL, NULL),
  ('2026-07-02', 'gasto', 'nequi', 163345, 'LICENCIAS', 'SLACK', NULL, true, NULL, NULL),
  ('2026-07-08', 'ingreso', 'nequi', 70000, 'TRASLADO ENTRE CUENTAS', 'BANCO A NEQUI', NULL, false, NULL, NULL),
  ('2026-07-09', 'gasto', 'nequi', 44900, 'LICENCIAS', 'APPLE COM BIL', NULL, true, NULL, NULL),
  ('2026-07-12', 'gasto', 'nequi', 141600, 'LICENCIAS', 'HOSTING', NULL, true, NULL, NULL),
  ('2026-07-09', 'gasto', 'nequi', 74143, 'LICENCIAS', 'MESHY', NULL, true, NULL, NULL),
  ('2026-07-13', 'gasto', 'nequi', 60234, 'LICENCIAS', 'ATLASSIAN', NULL, true, NULL, NULL),
  ('2026-07-14', 'gasto', 'nequi', 66926, 'LICENCIAS', 'CLAUDE', NULL, true, NULL, NULL),
  ('2026-07-14', 'gasto', 'banco', 1906000, 'RENTING', 'PAGO DE LEASING', NULL, true, NULL, NULL),
  ('2026-07-14', 'gasto', 'banco', 1906000, 'RENTING', 'LEASING', NULL, true, NULL, NULL),
  ('2026-07-14', 'ingreso', NULL, 1906000, 'GBA', 'LEASING', 'prestamo_recibido', true, NULL, NULL),
  ('2026-07-08', 'gasto', 'nequi', 71129, 'LICENCIAS', 'TRIPO AI', NULL, true, NULL, NULL),
  ('2026-07-14', 'gasto', 'efectivo', 4000000, 'PRESTAMOS EMPLEADOS', 'PRESTAMO DE ALEJANDRA DURAN', NULL, true, NULL, NULL),
  ('2026-07-14', 'ingreso', 'efectivo', 4000000, 'OTROS INGRESOS', 'PRESTAMO DE ALEJANDRA DURAN', NULL, false, NULL, NULL),
  ('2026-07-14', 'ingreso', 'efectivo', 4000000, 'OTROS INGRESOS', 'PRESTAMO ALEJANDRA DURAN', NULL, false, NULL, NULL),
  ('2026-07-15', 'gasto', 'efectivo', 170000, 'NOMINA', 'PAGO DE NO CONSTITUTIVA  ANGELICA MONROY', NULL, true, NULL, NULL),
  ('2026-07-01', 'gasto', NULL, 2693694, 'GBA', 'PRESTAMO DE DIAN', 'prestamo_otorgado', true, NULL, NULL),
  ('2026-07-15', 'ingreso', NULL, 2696694, 'GBA', 'PAGO DE LA DIAN', 'cobro_prestamo', true, NULL, NULL),
  ('2026-07-15', 'ingreso', 'efectivo', 9000000, 'OTROS INGRESOS', 'prestamos 7000000 de alejandra y 2000000 de juan jose', NULL, false, NULL, NULL),
  ('2026-07-15', 'gasto', 'efectivo', 930000, 'NOMINA', 'pago de nomina claudia alejandra castillo legal vigente', NULL, true, NULL, NULL),
  ('2026-07-15', 'gasto', 'efectivo', 970399, 'NOMINA', 'DAVID MANZANO LEGAL VIGENTE', NULL, true, NULL, NULL),
  ('2026-07-15', 'gasto', 'efectivo', 970399, 'NOMINA', 'DAVID MANZANO', NULL, true, NULL, NULL)
) AS v(fecha, tipo, cuenta, monto, categoria, descripcion, gba_movimiento, facturado, proyecto_id, servicio_id);

-- ============================================================
-- Verificacion de conteos (debe imprimir 9/5/5/1/129 antes del COMMIT)
-- ============================================================
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.empleados; RAISE NOTICE 'empleados: %', v_count;
  SELECT count(*) INTO v_count FROM public.contratistas; RAISE NOTICE 'contratistas: %', v_count;
  SELECT count(*) INTO v_count FROM public.pagos_contratistas; RAISE NOTICE 'pagos_contratistas: %', v_count;
  SELECT count(*) INTO v_count FROM public.pagos_nomina; RAISE NOTICE 'pagos_nomina: %', v_count;
  SELECT count(*) INTO v_count FROM public.transacciones; RAISE NOTICE 'transacciones: %', v_count;
  SELECT count(*) INTO v_count FROM public.transacciones WHERE categoria_id IS NULL; RAISE NOTICE 'transacciones sin categoria resuelta (debe ser 0): %', v_count;
END $$;

COMMIT;
