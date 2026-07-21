# Registro de Migraciones — ADA Gestion

> Historial completo de todas las migraciones SQL de la base de datos.
> Cada migracion esta numerada secuencialmente y documentada con su proposito,
> tablas afectadas, y estado de ejecucion.

## Resumen

| # | Archivo | Fecha | Descripcion | Estado |
|---|---------|-------|-------------|--------|
| 001 | `001_claude_readonly_role.sql` | 2026-07-17 | Rol `claude_readonly` (solo SELECT) para acceso de lectura de Claude Code | ✅ Ejecutada en Supabase (SQL Editor), contraseña rotada fuera de git |
| 002 | `002_perfiles_rbac.sql` | 2026-07-17 | Fase 2 migracion Supabase: tablas `perfiles`/`permisos`, `auth_rol()`, trigger de alta de usuario, RLS + semilla de permisos por rol | ✅ Ejecutada en Supabase (SQL Editor) |
| 003 | `003_categorias_configuracion_cuentas.sql` | 2026-07-17 | Fase 3: tablas `cuentas`/`categorias`/`configuracion`, semilla con datos reales de `firebase_export/*.json` | ✅ Ejecutada en Supabase (SQL Editor), verificada 2026-07-18 |
| 004 | `004_tesoreria_transacciones_rpc.sql` | 2026-07-18 | Fase 4: tabla `transacciones`, `audit_log`, RPCs `fn_registrar_transaccion`/`fn_registrar_traslado_entre_cuentas`, vista `vw_saldos_cuentas` | ✅ Ejecutada en Supabase (SQL Editor), verificada 2026-07-18 |
| 005 | `005_fn_registrar_transaccion_gba_facturado.sql` | 2026-07-18 | Correctiva: `fn_registrar_transaccion` gana `p_gba_movimiento`/`p_facturado` (necesarios para migrar `GBA.jsx`) | ✅ Ya aplicada en Supabase (verificado 2026-07-18) |
| 006 | `006_contratistas_pagos_rpc.sql` | 2026-07-18 | Fase 5: tablas `contratistas`/`pagos_contratistas`, RPC `fn_registrar_abono_contratista`, vista `vw_contratistas_resumen`, `ALTER TABLE transacciones` (contratista_id/pago_contratista_id) | ✅ Ejecutada en Supabase (SQL Editor) |
| 007 | `007_empleados_completo.sql` | 2026-07-18 | Fase 6: tabla `empleados` (esquema completo), RPC `fn_set_empleado_pin` (bcrypt via pgcrypto) | ✅ Ejecutada en Supabase (SQL Editor) |
| 008 | `008_pagos_nomina_rpc.sql` | 2026-07-18 | Fase 7: tabla `pagos_nomina`, RPC `fn_registrar_pago_nomina`, `ALTER TABLE transacciones` (nomina_payment_id) | ✅ Ejecutada en Supabase (SQL Editor) |
| 009 | `009_seed_datos_historicos.sql` | 2026-07-18 | Import historico real: 9 empleados, 5 contratistas, 5 pagos_contratistas, 1 pago_nomina, 129 transacciones (`firebase_export/*.json`) — cierra el gap de perdida de datos detectado antes de produccion | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-18 (conteos verificados: 9/5/5/1/129, 0 sin categoria) |
| 010 | `010_proyectos_servicios.sql` | 2026-07-18 | Fase 8-9: tablas `proyectos`/`servicios_proyecto`/`proyecto_equipo`, `legacy_id` persistido, seed real (42 proyectos, 2 servicios, `firebase_export/projects.json`/`services.json`), remapeo de `transacciones.proyecto_id`/`.servicio_id` de `text` a `uuid` con FK real | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21 |
| 011 | `011_visitas_registro_horas.sql` | 2026-07-18 | Fase 10 (parcial, sin PowerSync): tablas `visitas`/`visita_asistentes`/`registro_horas`, `empleados.legacy_id` retroactivo, seed real (31 visitas, 9 registro_horas, `firebase_export/visits.json`/`timelogs.json`) | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21 |
| 012 | `012_calendario_tributario.sql` | 2026-07-18 | Tabla `calendario_tributario`, seed real (5 registros fijos de `dbCalendario.js`) — reemplaza `localStorage` clave `ada_calendario_tributario`, consumida hoy solo desde `ResumenGerencia.jsx` | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21 |

---

## Detalle de Migraciones

### 001 — `claude_readonly` role
- **Fecha:** 2026-07-17
- **Proposito:** permitir que Claude consulte la base de datos real (solo lectura) para acelerar la construccion del modelo de datos, sin usar `SUPABASE_SERVICE_ROLE_KEY`.
- **Tablas afectadas:** ninguna nueva; otorga `SELECT` sobre todas las tablas del esquema `public` (presentes y futuras via `ALTER DEFAULT PRIVILEGES`).
- **Pendiente:** cada migracion que cree una tabla con RLS debe agregar tambien una politica `FOR SELECT TO claude_readonly` (o exponer una vista sin columnas sensibles) — el `GRANT` de esta migracion no es suficiente una vez que RLS esta activo.
- **Credenciales:** la contrasena del rol se genero y rotó fuera de git — ver ubicacion segura fuera del repositorio (no documentada aqui a proposito).

### 002 — `perfiles` + `permisos` (RBAC, Fase 2 del plan de migracion a Supabase)
- **Archivo:** `migrations/002_perfiles_rbac.sql`
- **Fecha:** 2026-07-17
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor) y verificada
- **Proposito:** reemplazar el login mock de `localStorage` (`src/lib/dbAuth.js`, causa raiz de la perdida de datos reportada por pestañas viejas pisando datos nuevos) por Supabase Auth real + control de acceso por rol. Es la base sobre la que se apoyan las politicas RLS de todas las tablas de datos que vienen en fases siguientes (tesoreria, contratistas, empleados/nomina).
- **Tablas afectadas:**
  - `perfiles` (CREATE) — un registro por usuario de `auth.users`, con `rol` (`admin`, `gerencia`, `contabilidad`, `rrhh`, `coordinador`, `marketing`, `sin_rol`) y `activo`.
  - `permisos` (CREATE) — matriz `rol` × `modulo` × `accion` (`leer`/`escribir`), semilla precargada basada en `src/data/departments.js`.
- **Funciones/triggers:**
  - `auth_rol()` — helper `SECURITY DEFINER` reutilizado por TODAS las politicas RLS futuras.
  - `handle_new_user()` + trigger `on_auth_user_created` — crea la fila de `perfiles` automaticamente al registrarse (rol inicial `sin_rol`, sin acceso a nada — falla cerrado).
  - `update_updated_at_column()` — funcion compartida para `updated_at`, se reutiliza en migraciones siguientes.
- **RLS:** activo en ambas tablas; `perfiles` — el propio usuario lee/edita su fila, admin acceso total; `permisos` — lectura abierta a cualquier autenticado (no sensible, la necesita `usePermission()` del cliente), escritura solo admin. `claude_readonly` con `SELECT` explicito en ambas.
- **Dependencias:** ninguna (primera migracion que crea tablas de dominio).
- **Notas:**
  - Usuarios nuevos quedan en `sin_rol` — un admin debe promoverlos manualmente por SQL/dashboard hasta que exista pantalla de gestion de usuarios.
  - La matriz de permisos sembrada es un primer borrador basado en `departments.js`, no la especificacion formal (`docs/especificacion/10-autenticacion-rbac.md` aun no existe).
  - Requiere crear usuario(s) reales de Supabase Auth para reemplazar `admin`/`ada` (login mock) antes de poder verificar esta fase end-to-end.
  - Tras ejecutar: promover el primer usuario a `admin` manualmente vía `UPDATE public.perfiles SET rol = 'admin' WHERE id = '<uuid>'`.
  - **Ejecutada** y verificada end-to-end el 2026-07-17: usuario `gerente.ada@gmail.com` creado y promovido a `admin`, confirmado con login real + lectura de `perfiles`/`permisos` vía REST con el token de sesión.

### 003 — `cuentas` + `categorias` + `configuracion` (Fase 3 del plan de migracion a Supabase)
- **Archivo:** `migrations/003_categorias_configuracion_cuentas.sql`
- **Fecha:** 2026-07-17
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor) y verificada el 2026-07-18 (tablas `cuentas`, `categorias`, `configuracion` con datos sembrados confirmadas vía service role)
- **Proposito:** tablas de referencia y configuracion global que necesitan Fase 4 (`transacciones.categoria_id`/`.cuenta`) y Fase 6-7 (`dbEmpleados.getDailyRate()`). Datos sembrados con los valores reales de `firebase_export/categories.json` y `firebase_export/settings.json` (no datos de ejemplo).
- **Tablas afectadas:**
  - `cuentas` (CREATE) — semilla: `banco`, `efectivo`, `nequi`.
  - `categorias` (CREATE) — semilla con las 33 categorias de gasto y 19 de ingreso del JSON fuente, **incluyendo errores de tipeo existentes** (`TRASNPORTE`, `SEGUMIENTO`) a proposito, para no romper el match por nombre del import historico de transacciones.
  - `configuracion` (CREATE) — fila unica `tenant_id='ada'` con los porcentajes de nomina/GBA y los 3 saldos iniciales de cuentas.
- **RLS:** lectura abierta a cualquier autenticado en las tres (datos de referencia, no sensibles); escritura solo `admin`/`contabilidad`. `claude_readonly` con `SELECT` explicito en las tres.
- **Dependencias:** `auth_rol()` y `update_updated_at_column()` (migracion 002).
- **Notas:**
  - `saldo_inicial_fecha` no existe en `settings.json` (dato no versionado en el JSON fuente) — se confirmo con el usuario y se sembró como `2026-05-31` (dia anterior a la primera transaccion registrada en `firebase_export/transactions.json`, que es `2026-06-01`).
  - Cascada pendiente en frontend: `dbCategorias.js`, `dbSettings.js` pasan a `async`; `dbEmpleados.getDailyRate()` (llama a `getSettings()`) y todos sus llamadores transitivos (`dbProyectos.js`, `ProyectoDetalle.jsx`, `EmpleadoDetalle.jsx`) tambien pasan a `async`.
  - **2026-07-18 — archivo local reconstruido:** al validar la migracion 004 se detecto que `003_categorias_configuracion_cuentas.sql` estaba vacio en disco (0 bytes, nunca commiteado a git) pese a que la migracion ya corria en Supabase. Se reconstruyo el archivo a partir del plan aprobado + `firebase_export/categories.json`/`settings.json` + los nombres de columna que `dbCategorias.js`/`dbSettings.js` ya consumen en produccion. Contenido verificado: 33 categorias de gasto + 19 de ingreso (coincide con el JSON fuente). **No volver a ejecutar este archivo en Supabase** — es documentacion de una migracion ya aplicada, re-correrlo choca con los `UNIQUE`/`PRIMARY KEY` existentes.

### 004 — `transacciones` + `audit_log` + RPCs de Tesoreria (Fase 4 del plan de migracion a Supabase)
- **Archivo:** `migrations/004_tesoreria_transacciones_rpc.sql`
- **Fecha:** 2026-07-18
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), verificada 2026-07-18 — se detecto que ya habia corrido en un intento previo (el archivo quedo marcado "Pendiente" por error de documentacion); se confirmo integridad vía introspeccion de `information_schema`/`pg_policies` antes de dar por cerrada: existen `transacciones`, `audit_log`, las 3 funciones, el trigger y la vista; las 6 politicas RLS (4 en `transacciones`, 2 en `audit_log`) coinciden exactamente con el diseño; `transacciones` tenia 0 filas al verificar (sin riesgo de datos).
- **Proposito:** reemplazar el almacenamiento en `localStorage` de `src/lib/dbTesoreria.js` (clave `ada_transactions`) por Supabase real. Es el modulo de mayor impacto directo sobre el incidente de perdida de datos reportado por el usuario (el libro mayor de saldos de Tesoreria).
- **Tablas afectadas:**
  - `transacciones` (CREATE) — libro mayor de movimientos (ingreso/gasto), FK a `cuentas.codigo` y `categorias.id`. Incluye `proyecto_id`/`servicio_id` como `text` **sin FK** (deliberado: `proyectos`/`servicios` siguen en localStorage con ids no-uuid hasta Fase 8-9; se agregaron ya para no romper la vista financiera por proyecto de `ProyectoDetalle.jsx`, que filtra transacciones por `projectId`). `INSERT` revocado a `authenticated` — todo alta pasa por las RPC.
  - `audit_log` (CREATE) — tabla de auditoria general, reutilizada por Fase 5 (contratistas) y Fase 6-7 (empleados/nomina).
- **Funciones/triggers:**
  - `fn_audit_trigger()` + `trg_audit_transacciones` — graba insert/update/delete en `audit_log`.
  - `fn_registrar_transaccion(fecha, tipo, cuenta, monto, categoria_id, descripcion)` — RPC `SECURITY DEFINER`, valida rol (`admin`/`contabilidad`/`gerencia`), bloquea la cuenta con `FOR UPDATE NOWAIT` antes de insertar.
  - `fn_registrar_traslado_entre_cuentas(fecha, cuenta_origen, cuenta_destino, monto, descripcion)` — RPC que crea 2 filas atomicamente (gasto en origen + ingreso en destino), bloquea ambas cuentas en orden determinista (`LEAST`/`GREATEST`) para evitar deadlocks.
  - `vw_saldos_cuentas` (vista, `security_invoker = true`) — saldo inicial de `configuracion` + suma de movimientos por cuenta.
- **RLS:** `transacciones` — `SELECT` para `admin`/`gerencia`/`contabilidad`; `UPDATE`/`DELETE` directo permitido a `admin`/`contabilidad` (correcciones puntuales, auditadas por trigger); sin `INSERT` directo. `audit_log` — `SELECT` solo `admin`. `claude_readonly` con `SELECT` explicito en `transacciones` y `audit_log`; `vw_saldos_cuentas` con `GRANT SELECT` directo (hereda RLS de las tablas base por `security_invoker`).
- **Dependencias:** `auth_rol()` (migracion 002); `cuentas`, `categorias`, `configuracion` (migracion 003, ejecutada).
- **Notas:**
  - Error Postgres `55P03` (lock no disponible, `FOR UPDATE NOWAIT`) debe capturarse especificamente en el frontend y mostrar un toast distinto ("otro usuario esta registrando un movimiento en esta cuenta") en vez de un error generico.
  - Cascada pendiente en frontend: reescritura completa de `dbTesoreria.js` (RPCs + `vw_saldos_cuentas`), `useTesoreriaStore.js` (patron `fetchAll` + Supabase Realtime para sincronizar pestañas), y los componentes que lo consumen (`FormMovimiento.jsx`, `TablaMovimientos.jsx`, `SaldoCards.jsx`, `Tesoreria.jsx`, `ResumenGerencia.jsx`, `ProyectoDetalle.jsx`, `CuentaCobro.jsx`, `FormPago.jsx`, `GBA.jsx`, `dbProyectos.js`, `dbContratistas.js`, `dbNomina.js`).
  - Corregido: `proyecto_id`/`servicio_id` **sí** existen como columnas `text` (sin FK) en `transacciones` desde esta misma migracion — la nota anterior aquí decía lo contrario por error. `FormPago.jsx` puede pasar `projectId`/`serviceId` directo a la RPC `fn_registrar_transaccion`.
  - **2026-07-18 — gap detectado al mapear el frontend real:** esta RPC no expone `gba_movimiento`/`facturado` como parametros pese a que la tabla sí tiene esas columnas — `GBA.jsx` los necesita para registrar prestamos/pagos. Corregido en la migracion 005.

### 005 — `fn_registrar_transaccion` gana `gba_movimiento`/`facturado` (correctiva sobre Fase 4)
- **Archivo:** `migrations/005_fn_registrar_transaccion_gba_facturado.sql`
- **Fecha:** 2026-07-18
- **Estado:** ✅ Ya aplicada en Supabase (descubierto 2026-07-18 al intentar ejecutarla manualmente)
- **Proposito:** la tabla `transacciones` (migracion 004) ya tiene columnas `gba_movimiento`/`facturado`, pero la RPC nunca las expuso como parametros. Al mapear el consumo real de `src/pages/contabilidad/GBA.jsx` se confirmo que son necesarias para registrar prestamos/pagos GBA — sin esto, todo movimiento GBA quedaria con `gba_movimiento IS NULL`, invisible para el calculo de saldo GBA.
- **Tablas afectadas:** ninguna nueva. `fn_registrar_transaccion` (DROP + CREATE, firma nueva con `p_gba_movimiento text DEFAULT NULL, p_facturado boolean DEFAULT false` al final).
- **Dependencias:** `004_tesoreria_transacciones_rpc.sql` (firma original de la funcion).
- **Notas:**
  - Se usa `DROP FUNCTION` + `CREATE FUNCTION` (no `CREATE OR REPLACE`) porque Postgres exige firma de argumentos identica para reemplazar — agregar parametros nuevos requiere recrear.
  - Seguro de ejecutar: `transacciones` tenia 0 filas en produccion al momento de escribir esta migracion (verificado al validar la 004).
  - De paso se protegio el `PERFORM ... FOR UPDATE NOWAIT` sobre `cuentas` con `IF p_cuenta IS NOT NULL` (los movimientos GBA puros no tienen cuenta asociada — `account: null` en el frontend).
  - **2026-07-18 — descubierto al intentar ejecutarla:** el `DROP FUNCTION` fallo con Postgres 42883 ("function ... does not exist") porque la firma vieja de 8 parametros (sin `gba_movimiento`/`facturado`) ya no existia. Se verifico la firma real via `pg_get_function_identity_arguments()` y coincide exactamente con el resultado final que esta migracion buscaba crear (10 parametros: `p_fecha, p_tipo, p_cuenta, p_monto, p_categoria_id, p_descripcion, p_proyecto_id, p_servicio_id, p_gba_movimiento, p_facturado`). Conclusion: la funcion ya habia sido actualizada manualmente en Supabase antes de formalizar este archivo — la migracion 005 no necesita (ni puede) volver a ejecutarse tal cual esta escrita.

### 006 — `contratistas` + `pagos_contratistas` + RPC de abono (Fase 5 del plan de migracion a Supabase)
- **Archivo:** `migrations/006_contratistas_pagos_rpc.sql`
- **Fecha:** 2026-07-18
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-18
- **Proposito:** reemplazar el almacenamiento en `localStorage` de `src/lib/dbContratistas.js` (claves `ada_contractors`, `ada_contractor_payments`) por Supabase real. Una de las 3 fuentes de perdida de datos reportadas originalmente por el usuario (pagos a contratistas pisados por pestañas viejas).
- **Tablas afectadas:**
  - `contratistas` (CREATE) — datos basicos del contratista.
  - `pagos_contratistas` (CREATE) — cuentas de cobro con `monto`/`monto_pagado` (abonos parciales).
  - `transacciones` (ALTER) — nuevas columnas `contratista_id`, `pago_contratista_id` (con FK real, a diferencia de `proyecto_id`/`servicio_id` que quedaron como `text` en la migracion 004 porque esas tablas aun no existen en Supabase).
- **Funciones/triggers:**
  - `trg_audit_pagos_contratistas` — reutiliza `fn_audit_trigger()` (migracion 004).
  - `fn_registrar_abono_contratista(pago_id, monto, fecha, metodo)` — RPC `SECURITY DEFINER`: bloquea la fila del pago (`FOR UPDATE NOWAIT`), suma el abono a `monto_pagado`, marca `fecha_pago_total` si queda saldado, e inserta el gasto correspondiente en `transacciones` — todo atomico.
- **RLS:** `contratistas`/`pagos_contratistas` — `SELECT` para `admin`/`gerencia`/`contabilidad`; escritura (`INSERT`/`UPDATE`/`DELETE` directos, no revocados) solo `admin`/`contabilidad`. A diferencia de `transacciones`, aqui SI se permite `INSERT`/`UPDATE` directo del cliente porque crear/editar una cuenta de cobro (monto facturado, descripcion) no mueve dinero — solo el abono (que afecta `monto_pagado` y crea el gasto) pasa obligatoriamente por la RPC, por convencion del frontend (no hay `REVOKE`, es disciplina de `dbContratistas.js`). `claude_readonly` con `SELECT` explicito en ambas tablas y en la vista.
- **Dependencias:** `auth_rol()` (migracion 002); `categorias` (migracion 003, para la categoria `'CONTRATISTAS'` tipo `gasto`); `transacciones`, `audit_log`, `fn_audit_trigger()` (migracion 004, ejecutada y verificada).
- **Notas:**
  - **2026-07-18 — cascada de frontend completada:** `dbContratistas.js` reescrito completo para Supabase (RPC de abono + traduccion de columnas; `getContratistaById`/`getContratistaResumen` eliminados del archivo, ahora son selectores puros en el store). `useContratistasStore.js` creado (patron `fetchAll` + Realtime sobre `contratistas` y `pagos_contratistas`, igual a `useTesoreriaStore.js`). `src/pages/contabilidad/Contratistas.jsx` reescrito para consumir el store, hack `setTick` eliminado. `src/pages/gerencia/ResumenGerencia.jsx` tambien migrado a `useContratistasStore` (fetchAll + initRealtime en `useEffect`, selectores `getPaymentsByContractor`). `npm run lint` y `npm run build` verificados limpios tras el cambio.
  - Migracion SQL todavia sin ejecutar en Supabase (sigue `⚠️ Pendiente` junto con la 005) — pendiente que el usuario la corra manualmente en el SQL Editor.

### 007 — `empleados` completo (Fase 6 del plan de migracion a Supabase)
- **Archivo:** `migrations/007_empleados_completo.sql`
- **Fecha:** 2026-07-18
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-18
- **Proposito:** reemplazar el almacenamiento en `localStorage` de `src/lib/dbEmpleados.js` (clave `ada_employees`) por Supabase real. Segun el reporte original del usuario, los sueldos de Equipo fueron el dato realmente perdido — es la fase de mayor prioridad de las 3 fuentes de perdida de datos identificadas.
- **Tablas afectadas:**
  - `empleados` (CREATE) — esquema completo: datos personales, contacto, contacto de emergencia, datos laborales (`supervisor_id` ahora FK real a si misma, antes texto libre), seguridad social, flags de documentos (`doc_cedula`/`doc_hoja_vida`/`doc_contrato`/`doc_certificados`, sin archivo real todavia), y `pin_hash` para futuro login de campo.
- **Funciones/triggers:**
  - `trg_audit_empleados` — reutiliza `fn_audit_trigger()` (migracion 004).
  - `trg_empleados_updated_at` — reutiliza `update_updated_at_column()` (migracion 002).
  - `fn_set_empleado_pin(empleado_id, pin)` — RPC `SECURITY DEFINER` (requiere `pgcrypto`), hashea el PIN con `crypt(pin, gen_salt('bf'))` antes de guardar; nunca acepta ni devuelve el PIN en texto plano. Restringida a `admin`/`rrhh`.
- **RLS:** `SELECT` para `admin`/`rrhh`/`gerencia`/`coordinador` (coordinador necesita nombres de empleados para la futura asignacion a proyectos, Fase 9); escritura (incluye `pin_hash` vía `fn_set_empleado_pin`, no vía UPDATE general) solo `admin`/`rrhh`. `claude_readonly` con `SELECT` explicito — puede leer `pin_hash`, pero es un hash bcrypt irreversible, mismo trade-off ya aceptado en la migracion 001.
- **Dependencias:** `auth_rol()`, `update_updated_at_column()` (migracion 002); `audit_log`, `fn_audit_trigger()` (migracion 004, ejecutada y verificada).
- **Notas:**
  - No existe todavia UI para editar el PIN (`pin` es un campo muerto en `FormEmpleado.jsx`, sin input correspondiente) — esta migracion es SQL puro, sin nuevo frontend de PIN requerido en este corte.
  - Cascada pendiente en frontend: reescritura completa de `dbEmpleados.js` (CRUD async + traduccion de columnas; `getUpcomingBirthdays`/`getExpiringContracts` pasan a funciones puras que reciben un array de `employees` en vez de llamar `getEmpleadosActivos()` internamente), conversion de `useEmpleadosStore.js` al patron `fetchAll`/`initRealtime`, y actualizacion de todos sus consumidores (`FormEmpleado.jsx`, `EmpleadoDetalle.jsx`, `Equipo.jsx`, `Nomina.jsx`, `ResumenGerencia.jsx`, `dbProyectos.js`, `ProyectoDetalle.jsx`, `FormBitacora.jsx`, `FormVisita.jsx`, `Bitacoras.jsx`, `Visitas.jsx`).

### 008 — `pagos_nomina` + RPC de nomina (Fase 7 del plan de migracion a Supabase)
- **Archivo:** `migrations/008_pagos_nomina_rpc.sql`
- **Fecha:** 2026-07-18
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-18
- **Proposito:** reemplazar el almacenamiento en `localStorage` de `src/lib/dbNomina.js` (clave `ada_payroll`) por Supabase real, cerrando la tercera y ultima fuente de perdida de datos reportada originalmente (transacciones de Tesoreria/nomina).
- **Tablas afectadas:**
  - `pagos_nomina` (CREATE) — pagos de salario legal/no constitutivo y primas (legal/no constitutiva), por quincena o semestre segun `tipo`.
  - `transacciones` (ALTER) — nueva columna `nomina_payment_id` (FK real, mismo patron que `contratista_id`/`pago_contratista_id` en la migracion 006).
- **Funciones/triggers:**
  - `trg_audit_pagos_nomina` — reutiliza `fn_audit_trigger()` (migracion 004).
  - `fn_registrar_pago_nomina(empleado_id, fecha, tipo, quincena, periodo_inicio, periodo_fin, semestre, monto, metodo, notas)` — RPC `SECURITY DEFINER`, mismo patron que `fn_registrar_abono_contratista` (migracion 006): bloquea la fila del empleado (`FOR UPDATE NOWAIT`), inserta el pago, e inserta el gasto correspondiente en `transacciones` (categoria `'NOMINA'`) — todo atomico.
- **RLS:** `pagos_nomina` — `SELECT` para `admin`/`rrhh`/`gerencia`; sin `INSERT`/`UPDATE`/`DELETE` directo para `authenticated` (`REVOKE` explicito) — todo pago de nomina se crea exclusivamente vía la RPC, historial practicamente inmutable (correcciones puntuales quedan fuera de este corte). `claude_readonly` con `SELECT` explicito.
- **Dependencias:** `auth_rol()` (migracion 002); `categorias` (migracion 003, categoria `'NOMINA'` tipo `gasto`); `transacciones`, `audit_log`, `fn_audit_trigger()` (migracion 004, ejecutada y verificada); `empleados` (migracion 007).
- **Notas:**
  - A diferencia de `pagos_contratistas` (migracion 006, donde crear/editar la cuenta de cobro sin abonar es un `INSERT`/`UPDATE` directo permitido), aqui **todo** el ciclo de vida del pago de nomina pasa por la RPC — no existe un "crear sin pagar" intermedio en el dominio de nomina.
  - Cascada pendiente en frontend: reescritura completa de `dbNomina.js` (`registrarPagoNomina` llama a `fn_registrar_pago_nomina`), creacion de `useNominaStore.js` desde cero (patron `fetchAll` + Realtime + manejo de error `55P03`, igual a `useContratistasStore.js`), y reescritura de `src/pages/rrhh/Nomina.jsx` (eliminar hack `setTick`, consumir `useEmpleadosStore`/`useNominaStore`).

### 009 — Seed de datos historicos reales (gap critico detectado antes de produccion)
- **Archivo:** `migrations/009_seed_datos_historicos.sql`
- **Fecha:** 2026-07-18
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-18 — conteos finales verificados: `empleados=9, contratistas=5, pagos_contratistas=5, pagos_nomina=1, transacciones=129, sin_categoria=0` (coincide exactamente con lo esperado, ningun dato historico perdido)
- **Proposito:** las migraciones 004-008 crean el esquema de `transacciones`/`contratistas`/`pagos_contratistas`/`empleados`/`pagos_nomina` pero **sin sembrar los datos historicos reales** — el usuario confirmo al preguntar "se me borra algo?" que esto haria "desaparecer" de la UI (no del disco, pero si de Supabase) 9 empleados, 5 contratistas, 5 cuentas de cobro, 1 pago de nomina y 129 transacciones reales que hoy solo existen en `localStorage`/`firebase_export/*.json`. El usuario pidio explicitamente que no se pierda ningun dato antes de pasar a produccion.
- **Fuente de datos:** `firebase_export/employees.json`, `contractors.json`, `contractorPayments.json`, `payrollPayments.json`, `transactions.json` — conteos verificados contra `ada_backup_2026-07-15.json` (localStorage real): coinciden exactamente (9/5/5/1/129).
- **Tablas afectadas:** ninguna nueva — `INSERT` en `empleados`, `contratistas`, `pagos_contratistas`, `pagos_nomina`, `transacciones`; `INSERT` adicional en `categorias` (ver nota de `TRANSPORTE` abajo).
- **Mecanismo:** tablas temporales `_map_<entidad>` (solo viven durante la sesion del SQL Editor) mapean cada id legado (`id_xxxxx`, no uuid) a un `uuid` nuevo via `gen_random_uuid()`, preservando todas las relaciones FK (empleado de cada pago de nomina, contratista de cada cuenta de cobro). Todo envuelto en `BEGIN`/`COMMIT` con un bloque `DO $$ ... RAISE NOTICE` que imprime los conteos finales para verificar antes de confirmar.
- **Decisiones documentadas en el propio archivo (ver comentarios de cabecera):**
  - Ningun empleado legado tiene `supervisor` -> `supervisor_id` queda `NULL` en los 9, no se inventa jerarquia.
  - 2 PINs en texto plano del JSON legado se hashean inline con `crypt()/gen_salt('bf')` (nunca se guarda el PIN en texto plano).
  - El unico pago de nomina legado no trae campo `tipo` (la tabla nueva lo exige `NOT NULL`) — se asume `'legal'` por tener quincena y periodo definidos (unica inferencia de esta migracion, no hay forma de confirmarlo desde el dato fuente).
  - Los 129 registros de `transactions.json` no tienen `contractorId`/`contractorPaymentId` poblado (ni siquiera para pagos que coinciden por texto/monto con `contractorPayments.json`) — se decidio **no adivinar** esa relacion por riesgo de atar mal un gasto; quedan con `contratista_id`/`pago_contratista_id`/`nomina_payment_id` en `NULL`, preservando el registro completo tal cual existia.
  - El historico usa el string de categoria `'TRANSPORTE'` (6 transacciones) que **no existe** en la semilla de la migracion 003 (solo existe `'TRASNPORTE'`, con el error de tipeo del dropdown legado) — son dos strings distintos en los datos reales; se agrega `'TRANSPORTE'` como categoria nueva (tipo `gasto`) en vez de forzar el match contra `'TRASNPORTE'`, evitando recategorizar historico sin confirmacion del usuario.
  - `proyecto_id`/`servicio_id` se preservan tal cual como texto (ids legado o `NULL`) — consistente con que esas columnas ya son `text` sin FK desde la migracion 004 (proyectos/servicios siguen en localStorage, Fase 8-9 no ejecutada).
- **Dependencias:** `003` (categorias/cuentas, ejecutada), `004` (transacciones, ejecutada), `005` (correctiva RPC), `006` (contratistas/pagos_contratistas), `007` (empleados), `008` (pagos_nomina) — estas ultimas 3 tablas **no existen todavia en Supabase**, deben ejecutarse antes que esta.
- **Notas:**
  - Generado programaticamente desde los JSON fuente (no transcrito a mano) para eliminar riesgo de error humano en 129 registros con texto acentuado/caracteres especiales — verificado con script que confirma 129/9/5/5/1 tuplas y balance de comillas antes de guardar el archivo.
  - Incluye verificacion final (`DO $$ ... RAISE NOTICE`) que imprime conteos y cuenta de transacciones sin `categoria_id` resuelto (debe ser 0) — revisar la salida en el SQL Editor antes de considerar la migracion cerrada.
  - **2026-07-18 — bug encontrado en la primera ejecucion (Postgres `42804`):** los bloques `INSERT ... SELECT ... FROM (VALUES (...)) AS v(...)` fallaban con "la columna X es de tipo fecha, pero la expresion es de tipo texto" en cada columna `date` (`contrato_hasta`, `fecha`, `fecha_abono`, `fecha_pago_total`, `periodo_inicio`, `periodo_fin`). Causa: una subconsulta `VALUES` poblada solo con literales string (mezclados o no con `NULL`) resuelve esas columnas como `text` por defecto — no hay contexto de `INSERT` directo que le sugiera el tipo real. Corregido agregando cast explicito `::date` a cada columna de fecha referenciada en el `SELECT` externo, en los 4 bloques afectados (empleados, pagos_contratistas, pagos_nomina, transacciones).
  - **2026-07-18 — bug encontrado en la segunda ejecucion (Postgres `23514`):** una cuenta de cobro real de Carlos Eduardo Lopez Ramos (`id_mrb3m5e8bxvnx`) tiene `monto = 0`, violando el `CHECK (monto > 0)` de `pagos_contratistas` definido en la migracion 006. Siguiendo la regla del usuario de no perder ni alterar ningun dato historico real ("como vienen de fabrica"), se relajo el constraint a `CHECK (monto >= 0)` con un `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT ...` insertado directamente en este archivo, ejecutado atomicamente dentro de la misma transaccion justo antes del `INSERT` de `pagos_contratistas` — en vez de descartar o inventar un monto distinto de cero para ese registro. Nota: esto deja el constraint de produccion (`>= 0`) mas permisivo que el originalmente escrito en la migracion 006 (`> 0`) — el archivo 006 no se modifico retroactivamente (es historico), esta migracion es la fuente de verdad del estado final del constraint.
  - Tras ambas correcciones, la migracion completa (`BEGIN` ... 5 `INSERT` + 1 `ALTER TABLE` + verificacion + `COMMIT`) corrio sin errores; verificado con consulta separada de conteos — resultado exacto esperado, cierra las 3 fuentes de perdida de datos reportadas originalmente por el usuario (Equipo/sueldos, Contratistas, Tesoreria/Nomina).

### 010 — `proyectos` + `servicios_proyecto` + `proyecto_equipo` (Fase 8-9 del plan de migracion a Supabase)
- **Archivo:** `migrations/010_proyectos_servicios.sql`
- **Fecha:** 2026-07-18
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21
- **Proposito:** reemplazar el almacenamiento en `localStorage` de `src/lib/dbProyectos.js`/`dbServicios.js` por Supabase real, y resolver la deuda dejada deliberadamente por la migracion 004 (`transacciones.proyecto_id`/`.servicio_id` como `text` sin FK, a la espera de que estas tablas existieran).
- **Tablas afectadas:**
  - `proyectos` (CREATE) — datos del proyecto (cliente, tipo de servicio, estado, valor de contrato, IVA, `paquete_visitas` jsonb, flag `es_gba`). Incluye `legacy_id text UNIQUE` para resolver referencias legado en migraciones futuras sin reconstruir tablas temporales.
  - `servicios_proyecto` (CREATE) — servicios/cuentas de cobro dentro de un proyecto, `proyecto_id` FK con `ON DELETE CASCADE`. Tambien con `legacy_id`.
  - `proyecto_equipo` (CREATE) — tabla puente `proyecto_id`/`empleado_id` para el futuro filtrado RLS por fila del rol `coordinador` (Fase 9 original) — **sin seed**, no existe todavia UI de asignacion de equipo a proyectos.
  - `transacciones` (ALTER, correctiva) — `proyecto_id`/`servicio_id` migran de `text` a `uuid` con FK real: se agregan columnas `_new`, se remapean vía los `legacy_id` recien poblados, se valida que no queden huerfanos (`DO $$ ... RAISE EXCEPTION`), se eliminan las columnas `text` viejas y se renombran las `uuid` nuevas a su lugar, se recrean los indices.
- **Fuente de datos:** `legado-adaapp/firebase_export/projects.json` (42 proyectos — corrige el conteo de "39" documentado en `docs/modelo-datos/entidades.md`, que estaba desactualizado) y `services.json` (2 servicios).
- **RLS:** `SELECT` para `admin`/`gerencia`/`contabilidad`/`coordinador`; escritura solo `admin`/`gerencia`. `claude_readonly` con `SELECT` explicito en las 3 tablas.
- **Dependencias:** `auth_rol()` (migracion 002); `empleados` (migracion 007, para la FK de `proyecto_equipo`); `transacciones` (migracion 004, ejecutada — varias de las 129 filas historicas ya traen `proyecto_id`/`servicio_id` como texto legado que esta migracion remapea).
- **Notas:**
  - Generado con `.sqlgen/gen_010.cjs` (script Node/CommonJS, no transcrito a mano) para eliminar riesgo de error humano al escapar texto con acentos/comillas en 42+2 registros.
  - Verificado previamente con un script standalone que confirmo cero referencias huerfanas (`projectId` de `transactions.json`/`services.json` contra los ids de `projects.json`) antes de escribir el SQL.
  - Legacy ids de proyecto ya presentes en las 129 transacciones historicas de la migracion 009, resueltos por esta migracion: `id_mqtlkegidhxxk`, `id_mqtllc2vm60fb`, `id_mqtljegt2g4mx`, `id_mqtlm5zem9lod`, `id_mqtlb51wzncc4`, `id_mqtlf5eev9fq0`.
  - Cascada pendiente en frontend: reescritura completa de `dbProyectos.js`/`dbServicios.js` (CRUD async + traduccion de columnas), conversion de `useProyectosStore.js` al patron `fetchAll`/`initRealtime`, store de servicios nuevo (el actual es un stub incompleto), y actualizacion de `ProyectoDetalle.jsx`, `FormServicio.jsx`, `FormPago.jsx`, `CuentaCobro.jsx`, `Proyectos.jsx`, `ResumenGerencia.jsx`.

### 011 — `visitas` + `visita_asistentes` + `registro_horas` (Fase 10 del plan de migracion a Supabase, sin PowerSync)
- **Archivo:** `migrations/011_visitas_registro_horas.sql`
- **Fecha:** 2026-07-18
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21
- **Proposito:** reemplazar el almacenamiento en `localStorage` de `src/lib/dbVisitas.js`/`dbTimelogs.js` por Supabase real. La integracion de PowerSync (offline-first para visitas de campo) queda diferida — esta migracion solo cubre el esquema de datos.
- **Tablas afectadas:**
  - `empleados` (ALTER, correctiva) — se agrega `legacy_id text UNIQUE`, poblado retroactivamente por match de `nombre` contra los 9 empleados legado ya sembrados en la migracion 009 (la tabla no tenia esta columna cuando se creo en la migracion 007). Verificacion defensiva confirma que los 9 quedan resueltos.
  - `visitas` (CREATE) — `proyecto_id` FK real a `proyectos` (migracion 010), `tipo` (`visita_obra`/`reunion_diseno`/`obsequio`), `legacy_id`.
  - `visita_asistentes` (CREATE) — tabla puente `visita_id`/`empleado_id`.
  - `registro_horas` (CREATE) — dias trabajados por empleado/proyecto/fecha, `legacy_id`.
- **Fuente de datos:** `legado-adaapp/firebase_export/visits.json` (31 visitas) y `timelogs.json` (9 registros).
- **RLS:** `visitas`/`registro_horas` — `SELECT` para `admin`/`gerencia`/`coordinador`, escritura `admin`/`coordinador` (alineado al modulo `bitacoras` de `departments.js`, no con `horarios` — son modulos RBAC distintos aunque ambos tratan "horas"). `claude_readonly` con `SELECT` explicito en las 3 tablas.
- **Dependencias:** `auth_rol()` (migracion 002); `empleados` (migracion 007); `proyectos` (migracion 010, ejecutada primero, en orden).
- **Notas:**
  - Generado con `.sqlgen/gen_011.cjs`, mismo patron que la migracion 010.
  - Ninguna de las 31 visitas legado trae el campo `tipo` — se infiere `'visita_obra'` para las 31 (unica inferencia de esta migracion, documentada en cabecera, mismo criterio que la inferencia de `pagos_nomina.tipo` en la migracion 009). Campos opcionales inconsistentes (`time`/`topic`/`amount`/`invoiced`) se preservan tal cual (ausente/vacio no se convierte en un valor inventado).
  - Verificado previamente con script standalone: cero referencias huerfanas de `projectId`/`employeeId` en `visits.json`/`timelogs.json` contra `projects.json` y los 9 empleados legado.
  - Cascada pendiente en frontend: reescritura completa de `dbVisitas.js`/`dbTimelogs.js`, stores nuevos con Realtime, y actualizacion de `Bitacoras.jsx`, `Visitas.jsx`, `FormBitacora.jsx`, `FormVisita.jsx`, `ProyectoDetalle.jsx` — eliminando el hack `setTick`/`refresh()` presente hoy en `Bitacoras.jsx`/`Visitas.jsx`.

### 012 — `calendario_tributario`
- **Archivo:** `migrations/012_calendario_tributario.sql`
- **Fecha:** 2026-07-18
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21
- **Proposito:** reemplazar el almacenamiento en `localStorage` de `src/lib/dbCalendario.js` (clave `ada_calendario_tributario`) por Supabase real. Ultima fase pendiente del plan de migracion. No viene de un export de Firebase — son datos reales de la empresa ya escritos a mano en el mock (Movistar, Planillas, Leasing, Industria y Comercio, Primas de servicios), consumidos hoy solo desde la seccion "00 CALENDARIO TRIBUTARIO" de `ResumenGerencia.jsx`.
- **Tablas afectadas:** `calendario_tributario` (CREATE) — `nombre`, `frecuencia` (`mensual`/`bimestral`/`semestral`), `dia_del_mes`, `monto`, `notas`.
- **Fuente de datos:** `src/lib/dbCalendario.js` (`defaultItems`, 5 registros) — se preservan tal cual, incluidos los montos en 0 (Movistar, Planillas, Industria y Comercio, Primas) donde el usuario nunca cargo un valor real.
- **RLS:** `SELECT` para `admin`/`gerencia`/`contabilidad`; escritura solo `admin`/`gerencia`. `claude_readonly` con `SELECT` explicito.
- **Dependencias:** `auth_rol()`, `update_updated_at_column()` (migracion 002).
- **Notas:**
  - Sin modulo propio en el RBAC (`departments.js` no tiene un id `calendario` — vive embebido en `resumen-gerencia`, que ya tiene permisos sembrados en la migracion 002 para gerencia leer/escribir). Si en el futuro se separa en su propio modulo, agregar la fila correspondiente a `permisos` y ajustar estas politicas.
  - Cascada pendiente en frontend: reescritura de `dbCalendario.js` a Supabase y actualizacion de `ResumenGerencia.jsx` (elimina el hack `setTick`/`refresh()` del modal `FormCalendario` inline).
