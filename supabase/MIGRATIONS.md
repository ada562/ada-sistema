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
| 013 | `013_empleado_portal_bitacora.sql` | 2026-07-21 | Portal de empleado: `perfiles.rol` gana `'empleado'`, `empleados.user_id` (login individual), `fn_empleado_id()`/`fn_semana_actual_inicio()`, RLS propia en `registro_horas`/`visitas`/`visita_asistentes` con bloqueo blando por semana, `visitas.tema` estructurado (+`tema_otro`), vistas `vw_proyectos_directorio`/`vw_empleados_directorio`, permisos `mi-bitacora` | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21 |
| 014 | `014_bitacora_otros_reposicion.sql` | 2026-07-21 | Correctiva + feature: `registro_horas.dias` CHECK relajado a `>= 0` (bug real, "Festivo" con `dias=0` habria fallado 23514), `proyecto_id` nullable + CHECK exige `nota` no vacia cuando no hay proyecto (fila "Otros") — "Reposición" reutiliza la convencion de `nota` sin cambio de esquema | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21 |
| 015 | `015_arqueo_caja.sql` | 2026-07-21 | Feature: tabla `arqueo_caja` — compara el saldo del sistema (`vw_saldos_cuentas`, migracion 004) contra el conteo fisico real de una cuenta y guarda historial con la diferencia (sobrante/faltante). Pedido por el usuario para cuadrar caja al final del dia | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21 |
| 016 | `016_contratos_historial.sql` | 2026-07-21 | Feature: tabla `contratos` (historial completo por empleado, hoy `empleados.tipo_contrato`/`.contrato_hasta` solo guardaban el vigente), RPC `fn_registrar_contrato` (marca el anterior `Renovado`, inserta el nuevo `Vigente`, sincroniza `empleados`) — reemplaza el placeholder de `src/pages/rrhh/Contratos.jsx` | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21 |
| 017 | `017_empleados_horario.sql` | 2026-07-21 | Feature: `ALTER TABLE empleados` agrega `tipo_horario` (asigna a cada empleado una de las 2 jornadas fijas oficiales — "Equipo de Diseño"/"Equipo Administrativo" — definidas en `src/lib/horarios.js`) — reemplaza el placeholder de `src/pages/rrhh/Horarios.jsx` | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21 |
| 018 | `018_empleado_documentos.sql` | 2026-07-21 | Feature: tabla `empleado_documentos` + bucket privado de Storage `empleados-documentos` — subida real de cédula/hoja de vida/contrato PDF/certificados/otros por empleado, reemplaza los flags booleanos sin archivo real de `empleados.doc_*` (migración 007) | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21 |
| 019 | `019_fix_fn_registrar_transaccion_uuid.sql` | 2026-07-21 | Correctiva urgente: `fn_registrar_transaccion` recreada con `p_proyecto_id uuid`/`p_servicio_id uuid` (antes `text`, desde la migración 005) — desalineada desde la migración 010 que cambió esas columnas de `transacciones` a `uuid`, rompiendo TODA alta de transacción en Tesorería con error "column proyecto_id is of type uuid but expression is of type text" | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21 |
| 020 | `020_permiso_arqueo_caja.sql` | 2026-07-21 | Feature: semilla de `permisos` para el nuevo id de vista `arqueo-caja` (`contabilidad`→leer/escribir, `gerencia`→leer) — Arqueo de Caja pasó de botón/modal dentro de Tesorería a página propia en el sidebar | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21 |
| 021 | `021_habilitar_realtime.sql` | 2026-07-21 | Correctiva: agrega `transacciones` y otras 12 tablas a la publicación `supabase_realtime` — ningún `initRealtime()` del frontend recibía eventos porque ninguna migración anterior había activado la replicación, causando saldos/listas visualmente desactualizados hasta recargar la página | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21 |
| 022 | `022_permiso_bitacora_ceo.sql` | 2026-07-22 | Feature: semilla de `permisos` para el nuevo id de vista `bitacora-ceo` (`gerencia`→leer/escribir) — nueva pestaña en Gerencia para registrar las horas de la CEO sin necesitar cuenta de portal | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-22 |
| 023 | `023_arqueo_caja_supabase.sql` | 2026-07-22 | Correctiva urgente: Arqueo de Caja pasa de `localStorage` a Supabase (`ADD COLUMN denominaciones` + Realtime) — fix del bug reportado (el jefe no veía el arqueo desde otro dispositivo), sigue desacoplado de Tesorería a propósito | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-22 |
| 024 | `024_tareas_calendario.sql` | 2026-07-22 | Feature: tablas `tareas` (calendario mensual estilo Asana) + `acceso_diario` (hora de llegada automática), RPC `fn_registrar_acceso_diario` — nuevo módulo "Tareas" (Proyectos) + página "Reportes" (Gerencia, horas + puntualidad admin/rrhh) | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-22 |
| 025 | `025_permisos_ausencia.sql` | 2026-07-22 | Feature: tabla `permisos_ausencia` + RPC `fn_resolver_permiso_ausencia` (aprobar/rechazar, autocompleta `registro_horas` al aprobar) — nuevo módulo "Permisos" bajo Gestión Humana, solicitud con 15 días de anticipación | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-22 |
| 026 | `026_tarea_reportes.sql` | 2026-07-22 | Feature: tabla `tarea_reportes` + bucket privado `tarea-reportes` — reportes de avance por tarea con adjunto opcional (imagen/audio/video), visibles para el empleado dueño y admin/rrhh | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-22 |
| 027 | `027_arqueo_caja_pendiente_y_delete.sql` | 2026-07-23 | Feature: `arqueo_caja` gana `pendiente_monto`/`pendiente_concepto` (anotación de efectivo recibido pero no en caja física, no crea transacciones) + policy DELETE solo-admin (antes historial inmutable) — pedido tras revisión del descuadre de efectivo en Tesorería | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-23 |
| 028 | `028_registro_horas_servicio.sql` | 2026-07-23 | Feature: `registro_horas` gana `servicio_id` opcional (FK a `servicios_proyecto`) para atribuir horas a un servicio específico dentro de un proyecto | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-24 |
| 029 | `029_presupuesto_cotizacion.sql` | 2026-07-24 | Feature: tablas `presupuesto_categorias`/`presupuesto_items` — módulo "Presupuesto", primera entrega solo vista Cotización (categorías de obra con ítems, subtotal + Acompañamiento de obra, total). Visible solo admin/gerencia | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-24 |
| 030 | `030_dias_laborales_mes_25.sql` | 2026-07-24 | Correctiva de dato: `configuracion.dias_laborales_mes` cambia de 23 a 25 — base real que usa la usuaria para el valor/día de cada empleado (costeo de mano de obra por proyecto) | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-24 |
| 031 | `031_carga_prestacional_empleados.sql` | 2026-07-24 | Correctiva de dato: `empleados.carga_pct` pasa de un valor plano (30% para todos) al % real por cargo, calculado de la tabla de nómina real de la usuaria (carga prestacional ÷ pago neto) | ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-24 |

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

### 013 — Portal de empleado (login individual + Mi Bitacora)
- **Archivo:** `migrations/013_empleado_portal_bitacora.sql`
- **Fecha:** 2026-07-21
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21
- **Proposito:** el usuario pidio que cada empleado activo tenga su propia cuenta de acceso ("clave y contraseña ... con la estructura de antes") con una vista de "Mi Bitacora" (registro de horas + visitas propias, matriz semanal por proyecto), sin poder editar registros de semanas ya cerradas. Esta migracion prepara todo el esquema/RLS necesario; **no crea ninguna cuenta de Supabase Auth** — eso se hace despues via Admin API una vez el usuario confirme la lista final de correos, y queda fuera de este archivo SQL.
- **Tablas afectadas:**
  - `perfiles` (ALTER, correctiva) — `rol` CHECK gana el valor `'empleado'` (localiza el nombre real del constraint via `pg_constraint` en vez de asumirlo, por si Postgres lo nombro distinto al esperado).
  - `empleados` (ALTER) — nueva columna `user_id uuid UNIQUE REFERENCES auth.users(id)`, vinculo 1:1 con el login individual. Nueva politica `empleados_select_propio` (el empleado lee su propia fila completa).
  - `registro_horas` (RLS adicional) — `registro_horas_select_propio`/`registro_horas_write_propio`: el empleado ve/edita solo sus propias filas (`empleado_id = fn_empleado_id()`), y solo puede escribir si `fecha >= fn_semana_actual_inicio()` (bloqueo blando — admin/coordinador no estan sujetos a esta restriccion, sus politicas de la migracion 011 siguen intactas).
  - `visitas` (RLS adicional + columna) — `visitas_select_propio`/`visitas_write_propio`: visible/editable solo si el empleado figura en `visita_asistentes` (excepto INSERT, que no puede exigir la fila de asistente porque esta se crea despues, mismo flujo de `dbVisitas.js` hoy), mismo bloqueo blando por semana. Nueva columna `tema_otro text` (texto libre cuando `tema = 'otro'`) y `CHECK` `tema IN ('interiorismo','iluminacion','arquitectura','otro')` (o `NULL`, para no romper el historico).
  - `visita_asistentes` (RLS adicional) — `visita_asistentes_select_propio`/`visita_asistentes_write_propio`: un empleado solo puede ver/insertar/eliminar su propia fila de asistencia (no puede anotar a otros).
  - `vw_proyectos_directorio` (CREATE, vista) — `id, tenant_id, nombre, estado` de `proyectos`, sin datos financieros.
  - `vw_empleados_directorio` (CREATE, vista) — `id, tenant_id, nombre, cargo` de `empleados` activos, sin datos personales/salariales.
  - `permisos` (INSERT) — `('empleado','mi-bitacora','leer')`, `('empleado','mi-bitacora','escribir')`.
- **Funciones:**
  - `fn_empleado_id()` — `SECURITY DEFINER STABLE`, resuelve el `empleados.id` del usuario autenticado actual (mismo patron que `auth_rol()`, migracion 002). Reutilizada por las 3 tablas de RLS propia de esta migracion.
  - `fn_semana_actual_inicio()` — `STABLE`, devuelve el lunes de la semana calendario actual (`date_trunc('week', current_date)`). Es el mecanismo completo del "bloqueo blando": no existe tabla de cierre semanal, se compara la fecha del registro contra este valor directamente en las politicas RLS.
- **RLS de las 2 vistas nuevas:** `security_invoker = false` (default) a proposito — corren con el privilegio del owner de la vista, no heredan la RLS restrictiva de `proyectos`/`empleados` (que excluye al rol `empleado`). Es el mecanismo para exponer columnas no sensibles sin dar acceso de fila completa a las tablas base. `GRANT SELECT` explicito a `authenticated` y `claude_readonly`.
- **Dependencias:** `auth_rol()`, `perfiles` (migracion 002); `empleados` (migracion 007); `proyectos` (migracion 010); `visitas`/`visita_asistentes`/`registro_horas` (migracion 011, ejecutada — la normalizacion de `tema` y el `CHECK` nuevo se verificaron contra los valores reales de produccion antes de escribir esta migracion: 28 filas `NULL`, 2 `'Arquitectura'`, 1 `'Interiorismo'`, ninguna viola el `CHECK` nuevo).
- **Notas:**
  - No incluida en este archivo (tareas de frontend/operacion separadas, en curso): creacion de las cuentas de Supabase Auth de los 9 empleados + vinculacion `empleados.user_id`; reescritura de `dbTimelogs.js`/`dbVisitas.js`/`dbEmpleados.js` y sus stores para el modelo "mis registros"; registro del modulo `mi-bitacora` en `src/data/departments.js` + `Sidebar.jsx`; rediseno de `Bitacoras.jsx` como matriz semanal por proyecto; selector de tema en `FormVisita.jsx`; API route admin (`SUPABASE_SERVICE_ROLE_KEY`) para cambiar la contraseña de un empleado desde la matriz.
  - El bloqueo blando es deliberadamente simple (comparacion de fecha en RLS) en vez de una tabla de "cierres semanales" — evita una abstraccion que el alcance actual no pidio (no hay requerimiento de cerrar semanas manualmente con auditoria propia, solo de impedir edicion retroactiva por el empleado).
  - **2026-07-21 — bug encontrado en el primer intento de ejecucion (Postgres `P0001`):** el bloque `DO $$` que localiza el CHECK constraint de `perfiles.rol` buscaba el texto literal `'IN'` en `pg_get_constraintdef()`, pero Postgres reescribe internamente `rol IN (...)` como `rol = ANY (ARRAY[...])` — el `LIKE '%rol%IN%'` nunca hacia match, y el `RAISE EXCEPTION` de seguridad freno la migracion antes de cualquier `ALTER`/`CREATE` (transaccion completa revertida por el `BEGIN`/`COMMIT`, sin efecto en produccion). Corregido: ahora localiza el constraint por la columna real via `pg_constraint.conkey` + `pg_attribute.attname = 'rol'`, sin depender del texto reconstruido.

### 014 — `registro_horas`: dias >= 0, proyecto_id nullable ("Otros"), "Reposición"
- **Archivo:** `migrations/014_bitacora_otros_reposicion.sql`
- **Fecha:** 2026-07-21
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21
- **Proposito:** tres ajustes a `registro_horas` pedidos por el usuario tras probar en vivo el calendario semanal de Bitacora (`BitacoraSemanaGrid.jsx`, migracion 013).
- **Tablas afectadas:** `registro_horas` (ALTER, sin tablas nuevas):
  1. **Bug real encontrado al revisar este pedido** (no reportado por el usuario, hallado por inspeccion): la migracion 011 creo `registro_horas.dias` con `CHECK (dias > 0)`. La funcionalidad "Festivo" (agregada en la sesion de rediseño del calendario, migracion 013) guarda una fila con `dias=0, nota='Festivo'` — nunca se probo contra la base de datos real; el `INSERT`/`UPDATE` habria fallado con `23514`. Se relaja a `CHECK (dias >= 0)`.
  2. `proyecto_id` pasa a nullable — nueva fila "Otros" en el calendario para actividades sin proyecto (trabajo interno/administrativo); nuevo `CHECK` exige `nota` no vacia cuando `proyecto_id IS NULL` (el empleado debe describir que hizo).
  3. "Reposición" (dia de fin de semana trabajado que se compensa despues) NO requiere cambio de esquema — reutiliza la misma convencion de `nota` ya usada por "Festivo" (`nota='Reposición'`, `dias>0`); documentado aqui junto al resto de la decision, sin `ALTER` propio.
- **RLS:** sin cambios — las politicas de `registro_horas` (migraciones 011/013) ya cubren `proyecto_id IS NULL` porque filtran por `empleado_id`/rol, no por `proyecto_id`.
- **Dependencias:** `011_visitas_registro_horas.sql` (`registro_horas` ya existe); logicamente posterior a `013` aunque no depende de sus objetos.
- **Notas:**
  - El bloque `DO $$` que dropea el CHECK de `dias` localiza el nombre real del constraint via `pg_constraint`/`pg_class`/`pg_attribute` (mismo patron defensivo de la migracion 013) en vez de asumir el nombre por defecto de Postgres.
  - Cascada pendiente en frontend: `BitacoraSemanaGrid.jsx` (fila fija "Otros" con descripcion obligatoria, checkbox "Reposición" en columnas Sábado/Domingo, redondeo de totales), `Bitacoras.jsx` (`FormBitacoraGlobal` debe soportar `proyecto_id = NULL`).

### 015 — `arqueo_caja` (cuadre de caja)
- **Archivo:** `migrations/015_arqueo_caja.sql`
- **Fecha:** 2026-07-21
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21
- **Proposito:** el usuario pidio, mientras cargaba pagos de nomina atrasados, una herramienta tipo "arqueo de caja" para comparar el saldo que calcula el sistema (`vw_saldos_cuentas`, migracion 004) contra el conteo fisico real de una cuenta (normalmente `efectivo`) y dejar registro historico de cada conteo con la diferencia (sobrante/faltante). No mueve dinero (no toca `transacciones`) — es un snapshot de reconciliacion, por eso no requiere RPC con `FOR UPDATE NOWAIT` como las operaciones de dinero.
- **Tablas afectadas:** `arqueo_caja` (CREATE) — `fecha`, `cuenta`, `saldo_sistema`, `saldo_contado`, `diferencia` (`GENERATED ALWAYS AS` columna calculada), `notas`.
- **Funciones/triggers:** `trg_audit_arqueo_caja` — reutiliza `fn_audit_trigger()` (migracion 004).
- **RLS:** `SELECT` para `admin`/`contabilidad`/`gerencia`; `INSERT` solo `admin`/`contabilidad` — historial inmutable (sin `UPDATE`/`DELETE` para `authenticated`), igual criterio que `pagos_nomina`/`pagos_contratistas`: si un arqueo se hizo mal, se corrige con un arqueo nuevo. `claude_readonly` con `SELECT` explicito.
- **Dependencias:** `auth_rol()` (migracion 002); `cuentas` (migracion 003); `fn_audit_trigger()` (migracion 004).
- **Notas:**
  - **2026-07-21 — bug encontrado en el primer intento de ejecucion (Postgres `42830`):** la version original definia `cuenta text NOT NULL REFERENCES public.cuentas(codigo)` (FK de una sola columna). Falla porque `cuentas.codigo` no tiene una constraint unica propia — solo existe `UNIQUE (tenant_id, codigo)` (compuesta, migracion 003), y Postgres exige que el conjunto de columnas referenciado por una FK coincida exactamente con una unique/PK existente. Corregido siguiendo el mismo precedente ya usado en `transacciones.cuenta` (migracion 004): FK compuesta `CONSTRAINT fk_arqueo_caja_cuenta FOREIGN KEY (tenant_id, cuenta) REFERENCES public.cuentas (tenant_id, codigo)`.
  - Cascada de frontend ya completada en el mismo corte: `dbArqueoCaja.js` (nuevo, `getArqueos`/`registrarArqueo`), `ArqueoCaja.jsx` (nuevo, modal con selector de cuenta, saldo del sistema vs. contado, diferencia con estilo sobrante/faltante, historial), botón "Arqueo de caja" en `Tesoreria.jsx`.
  - **2026-07-21 (correctiva):** el usuario pidió que el arqueo NO sea un registro sistematizado/auditado — es solo control personal para comparar saldo del día. `dbArqueoCaja.js` se reescribió para usar `localStorage` (via `storage.js`) en vez de esta tabla; la tabla `arqueo_caja` y su RLS/auditoría quedan sin uso desde el frontend (no se elimina el schema, por si se retoma más adelante).
  - **2026-07-21 (segunda correctiva):** el usuario reportó que el conteo "no restaba los gastos" — comparar contra `balances.efectivo` (`vw_saldos_cuentas`) confundía, porque ese saldo depende de que TODA transacción de efectivo esté bien registrada en Tesorería, algo que el usuario no puede garantizar. Pidió sacar el arqueo de Tesorería y convertirlo en un "contador de dinero y monedas" puro. Rediseño: `dbArqueoCaja.js` deja de guardar `saldoSistema`/`diferencia`, ahora guarda `denominaciones` (desglose por billete/moneda) + `total`; `ArqueoCaja.jsx` (el modal viejo) se eliminó, reemplazado por la página `src/pages/contabilidad/ArqueoCaja.jsx` con su propio id de vista (`arqueo-caja`) en el sidebar — ya no hay botón ni referencia dentro de `Tesoreria.jsx`. `ReciboArqueoCaja.jsx` se ajustó para imprimir el desglose de denominaciones en vez del saldo del sistema. Requiere la migración 020 (semilla de permisos para el id de vista nuevo).

### 016 — `contratos` (historial de contratos, modulo Contratos)
- **Archivo:** `migrations/016_contratos_historial.sql`
- **Fecha:** 2026-07-21
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21
- **Proposito:** `src/pages/rrhh/Contratos.jsx` era un placeholder puro. `empleados.tipo_contrato`/`.contrato_hasta` (migracion 007) ya existian pero solo guardan el contrato VIGENTE — cada renovacion pisaba el dato anterior sin dejar rastro. Se agrega una tabla de historial (una fila por contrato/renovacion) mas una RPC que registra una renovacion de forma atomica.
- **Tablas afectadas:** `contratos` (CREATE) — `empleado_id`, `tipo_contrato` (mismas 5 categorias ya usadas en `FormEmpleado.jsx`), `fecha_inicio`, `fecha_fin` (nullable = termino indefinido, no vence), `salario_mensual`, `salario_no_constitutivo`, `estado` (`Vigente`/`Renovado`/`Vencido`/`Terminado`), `notas`.
- **Funciones/triggers:**
  - `fn_registrar_contrato(p_empleado_id, p_tipo_contrato, p_fecha_inicio, p_fecha_fin, p_salario_mensual, p_salario_no_constitutivo, p_notas)` — marca `Renovado` cualquier fila `Vigente` previa del mismo empleado, inserta la nueva como `Vigente`, y sincroniza `empleados.tipo_contrato`/`.contrato_hasta` — así la alerta "Contratos por vencer" ya existente en `Equipo.jsx` (`getExpiringContracts`, lee directo de `empleados`) sigue funcionando sin tocarla.
  - `trg_audit_contratos` — reutiliza `fn_audit_trigger()` (migracion 004).
- **RLS:** `SELECT` para `admin`/`rrhh`/`gerencia`; `UPDATE`/`DELETE` directo solo `admin`/`rrhh` (corregir errores de captura, mismo criterio que `pagos_contratistas`); `REVOKE INSERT ... FROM authenticated` — toda alta/renovación pasa por la RPC porque sincroniza 2 tablas y necesita ser atómica. `claude_readonly` con `SELECT` explícito.
- **Dependencias:** `auth_rol()` (002), `fn_audit_trigger()` (004), `empleados` (007).
- **Notas:**
  - Los permisos de rol para el módulo `contratos` ya estaban sembrados desde la migración 002 (`gerencia`→leer, `rrhh`→leer/escribir) — no requiere migración de permisos nueva.

### 017 — `empleados` gana jornada laboral (modulo Horarios)
- **Archivo:** `migrations/017_empleados_horario.sql`
- **Fecha:** 2026-07-21
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21
- **Proposito:** `src/pages/rrhh/Horarios.jsx` era un placeholder puro. Alcance inicial confirmado con el usuario (AskUserQuestion): jornada laboral de referencia, no control de asistencia ni solicitud de permisos, y explícitamente distinto del registro de horas trabajadas que ya existe (`registro_horas`, migración 011, consumido por Bitácora/Mi Bitácora). Revisado el mismo día con el memo interno real de la empresa: no es un horario libre por empleado, son dos jornadas fijas comunicadas oficialmente — "Equipo de Diseño" (L-V, 8:00-17:25, almuerzo 1-2pm) y "Equipo Administrativo" (horario distinto por día, incluye sábado medio día). El detalle día a día de cada jornada vive en `src/lib/horarios.js` (`PLANTILLAS_HORARIO`), no en la base de datos, porque es política de la empresa (no editable desde la UI); la tabla solo guarda a cuál de las dos pertenece cada empleado.
- **Tablas afectadas:** `ALTER TABLE empleados` — agrega `tipo_horario` (text, nullable, `CHECK IN ('Equipo de Diseño','Equipo Administrativo')`).
- **RLS/auditoría:** ninguna nueva — es una columna más de `empleados`, cubierta por las políticas `empleados_select`/`empleados_write` y el trigger `trg_audit_empleados` ya existentes (migración 007).
- **Dependencias:** `empleados` (007).
- **Notas:**
  - Los permisos de rol para el módulo `horarios` ya estaban sembrados desde la migración 002 — no requiere migración de permisos nueva.
  - Cascada de frontend en el mismo corte: `src/lib/horarios.js` (nuevo, plantillas fijas), `dbEmpleados.js` (mapeo de `tipo_horario`), `Horarios.jsx` (reescrito — jornadas de referencia + asignación por empleado via `<select>`).

### 018 — `empleado_documentos` + Storage (subida real de documentos)
- **Archivo:** `migrations/018_empleado_documentos.sql`
- **Fecha:** 2026-07-21
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21
- **Proposito:** pedido explícito del usuario ("en contratos necesito subir los contratos en pdf y cedulas y documentos"). `empleados.doc_cedula`/`.doc_hoja_vida`/`.doc_contrato`/`.doc_certificados` (migración 007) eran flags booleanos marcados a mano sin archivo real detrás — documentado así desde esa misma migración. Se agrega una tabla de documentos reales + bucket de Storage privado. Alcance confirmado con el usuario (AskUserQuestion): biblioteca de documentos POR EMPLEADO (no por versión específica de contrato de la migración 016), solo admin/rrhh.
- **Tablas afectadas:** `empleado_documentos` (CREATE) — `empleado_id`, `tipo` (`cedula`/`hoja_vida`/`contrato`/`certificados`/`otro`), `nombre_archivo`, `storage_path` (UNIQUE), `tamano_bytes`, `subido_por`. Sin `UNIQUE(empleado_id, tipo)` — un empleado puede tener varios archivos por categoría (ej. varios certificados).
- **Storage:** bucket privado `empleados-documentos` (`public=false`) — toda lectura pasa por `createSignedUrl` (60s), nunca URL pública. Políticas propias sobre `storage.objects` (`SELECT`/`INSERT`/`DELETE`, scoped a `bucket_id = 'empleados-documentos'`), sin `UPDATE` (un documento se reemplaza borrando y resubiendo, no se edita in-place).
- **Funciones/triggers:** `trg_audit_empleado_documentos` — reutiliza `fn_audit_trigger()` (migración 004).
- **RLS:** `SELECT`/`INSERT`/`DELETE` solo `admin`/`rrhh` (mismo criterio de acceso confirmado con el usuario). `claude_readonly` con `SELECT` explícito en `empleado_documentos` — **excepción documentada:** no se agrega política `claude_readonly` en `storage.objects` porque esa tabla es compartida entre todos los buckets del proyecto (no solo este) y administrada por Supabase; solo contiene metadata (nombre/ruta), nunca el contenido del archivo, y no aporta valor a las lecturas de solo-diagnóstico de Claude Code.
- **Dependencias:** `auth_rol()` (002), `fn_audit_trigger()` (004), `empleados` (007).
- **Notas:**
  - Las 4 columnas booleanas `doc_*` de `empleados` (migración 007) **no se eliminan** (evitar `DROP COLUMN` destructivo sobre datos ya capturados en producción) pero quedan huérfanas a propósito — el frontend deja de leerlas/escribirlas desde este commit.
  - Cascada de frontend en el mismo corte: `dbDocumentos.js` (nuevo — `getDocumentos`/`uploadDocumento`/`deleteDocumento`/`getDocumentoUrl`), `useDocumentosStore.js` (nuevo, patrón fetch+realtime estándar), `DocumentosEmpleado.jsx` (nuevo, componente reutilizable de subida/lista/descarga/borrado por categoría), integrado en `EmpleadoDetalle.jsx` (reemplaza el checklist estático `DocStatus`) y en `Contratos.jsx` (panel expandible por empleado, ícono de clip). `FormEmpleado.jsx` pierde los 4 checkboxes manuales (ya no tienen sentido, la presencia real se ve en el nuevo panel). `Equipo.jsx` recalcula la alerta "Faltan: ..." desde `empleado_documentos` real en vez de los booleanos.
  - Límite de 15MB por archivo y tipos aceptados `.pdf,.jpg,.jpeg,.png` validados en el frontend (`DocumentosEmpleado.jsx`) — no hay validación adicional server-side del tipo/tamaño en esta primera versión (Supabase Storage sí aplica el límite global de tamaño del proyecto).

### 019 — Fix `fn_registrar_transaccion` (proyecto_id/servicio_id text → uuid)
- **Archivo:** `migrations/019_fix_fn_registrar_transaccion_uuid.sql`
- **Fecha:** 2026-07-21
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21
- **Proposito:** correctiva urgente reportada por el usuario en producción (toast rojo "column proyecto_id is of type uuid but expression is of type text" al usar Tesorería). La migración 010 cambió `transacciones.proyecto_id`/`.servicio_id` de `text` a `uuid` con FK real, pero nunca actualizó la firma de la RPC `fn_registrar_transaccion` (creada en la migración 005 con `p_proyecto_id text`/`p_servicio_id text`) — quedó desalineada desde ese momento. Postgres valida tipos de un INSERT en tiempo de plan; un parámetro PL/pgSQL tipado `text` no tiene cast implícito/assignment hacia una columna `uuid` (a diferencia de un literal SQL sin tipo), así que **toda** alta de transacción vía `addTransaction` (`dbTesoreria.js`) fallaba, con o sin proyecto seleccionado (el error es de tipos, no de valor).
- **Cambio:** `DROP FUNCTION` + `CREATE FUNCTION public.fn_registrar_transaccion(...)` recreada idéntica a la versión de la migración 005, salvo `p_proyecto_id uuid DEFAULT NULL` y `p_servicio_id uuid DEFAULT NULL` (antes `text`). Sin cambios de lógica ni de permisos.
- **Dependencias:** `005_fn_registrar_transaccion_gba_facturado.sql` (firma previa), `010_proyectos_servicios.sql` (tipos reales de columna).
- **Notas:**
  - Sin cambios de frontend — `dbTesoreria.js` ya enviaba `data.projectId`/`data.serviceId` como string uuid o `null`, el mismatch estaba solo del lado de la función SQL.
  - Ningún dato existente se toca (no hay `UPDATE`/`ALTER TABLE` sobre `transacciones`), es una recreación pura de función.

### 020 — Permiso para `arqueo-caja` (nueva página propia)
- **Archivo:** `migrations/020_permiso_arqueo_caja.sql`
- **Fecha:** 2026-07-21
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21
- **Propósito:** Arqueo de Caja (ver notas de la migración 015) pasó de ser un botón/modal dentro de Tesorería a una página propia (`src/pages/contabilidad/ArqueoCaja.jsx`) con su propio id de vista en el sidebar (`arqueo-caja`). La sidebar (`Sidebar.jsx`) y el guard de `App.jsx` llaman `usePermission('arqueo-caja')` — sin una fila en `permisos`, cualquier rol no-`admin` (incluido `contabilidad`, que sí tenía acceso al botón viejo vía el permiso de `tesoreria`) queda sin acceso al módulo nuevo.
- **Tablas afectadas:** `permisos` (INSERT) — `('contabilidad','arqueo-caja','leer')`, `('contabilidad','arqueo-caja','escribir')`, `('gerencia','arqueo-caja','leer')`, mismo criterio ya sembrado para `tesoreria` en la migración 002.
- **Dependencias:** `002_perfiles_rbac.sql` (tabla `permisos`).
- **Notas:**
  - `admin` no necesita fila explícita — `usePermission()` del cliente hace bypass total para ese rol.
  - Arqueo de Caja sigue sin sistematizar (localStorage, sin tabla propia en Supabase) — esta migración solo cubre el permiso de la vista, no crea ni toca tablas de datos.

### 021 — Habilitar Realtime en las tablas que ya lo esperan en el frontend
- **Archivo:** `migrations/021_habilitar_realtime.sql`
- **Fecha:** 2026-07-21
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-21
- **Propósito:** correctiva urgente reportada por el usuario ("no me resta") en Tesorería. Diagnóstico verificado directo en la base de datos: `vw_saldos_cuentas` calcula el saldo de Banco/Efectivo/Nequi correctamente (`saldo_inicial + Σingresos − Σgastos` cuadra exacto con lo que devuelve la vista). El problema real es que la pantalla mostraba un saldo de Efectivo más viejo que el real — el saldo en BD ya reflejaba un gasto reciente, pero la tarjeta en pantalla no se había refrescado. Causa raíz: `useTesoreriaStore.initRealtime()` (y el mismo patrón en otros 6 stores: `useContratistasStore`, `useEmpleadosStore`, `useVisitasStore`, `useContratosStore`, `useNominaStore`, `useServiciosStore`, `useTimelogsStore`, `useCalendarioStore`, `useProyectosStore`, `useDocumentosStore`) se suscribe a `postgres_changes` sobre sus tablas, pero **ninguna migración anterior agregó esas tablas a la publicación `supabase_realtime`** — sin eso, Supabase nunca emite el evento y el canal queda suscrito pero mudo. El síntoma se dispara sobre todo cuando el movimiento se origina en una pantalla que no pasa por `useTesoreriaStore.addTx` (ej. `GBA.jsx` llama a `dbTesoreria.addTransaction`/`updateTransaction`/`deleteTransaction` directo, sin pasar por el store de Tesorería) — la pestaña de Tesorería abierta no se entera del cambio hasta que el usuario navega fuera y vuelve (remount → `fetchAll()`).
- **Cambio:** bloque `DO $$ ... FOREACH ... ALTER PUBLICATION supabase_realtime ADD TABLE ...` idempotente (chequea `pg_publication_tables` antes de cada `ADD TABLE`, así no falla si alguna tabla ya se había activado manualmente desde el Dashboard) para: `transacciones`, `empleados`, `visitas`, `visita_asistentes`, `contratos`, `pagos_nomina`, `contratistas`, `pagos_contratistas`, `empleado_documentos`, `servicios_proyecto`, `registro_horas`, `calendario_tributario`, `proyectos`.
- **Tablas afectadas:** solo metadata de replicación (`ALTER PUBLICATION`), ningún `ALTER TABLE`/dato tocado.
- **Dependencias:** ninguna — es pura configuración de replicación sobre tablas ya existentes.
- **Notas:**
  - No es un `ALTER TABLE`, no requiere lock largo ni afecta RLS/políticas existentes.
  - Después de ejecutarla, dos pestañas abiertas deben reflejar en vivo (~1-2s) cualquier alta/edición/borrado en estas tablas, sin necesidad de recargar — es el comportamiento que los stores ya esperaban desde que se escribieron.
  - No cubre `dashboard`/vistas derivadas (`vw_saldos_cuentas`, `vw_contratistas_resumen`) porque Realtime de Supabase no soporta vistas directamente — los stores igual las vuelven a consultar dentro de `fetchAll()` cuando el evento de la tabla base dispara.

### 022 — Permiso para `bitacora-ceo` (nueva pestaña en Gerencia)
- **Archivo:** `migrations/022_permiso_bitacora_ceo.sql`
- **Fecha:** 2026-07-22
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-22
- **Propósito:** nueva página `src/pages/gerencia/BitacoraCeo.jsx` bajo el departamento Gerencia, para registrar las horas de Alejandra Duran Agudelo (CEO, `empleados.id = cd1d2411-e5dc-43d7-bfd2-1fc9ca9c31dc`) reusando `BitacoraSemanaGrid`/tabla `registro_horas` — pedido explícito del usuario para no crearle una cuenta de portal de empleado ("ella no requiere portal"). La sidebar y el guard de `App.jsx` llaman `usePermission('bitacora-ceo')` — sin esta fila, ningún rol no-`admin` (incluido `gerencia`) ve el módulo nuevo.
- **Tablas afectadas:** `permisos` (INSERT) — `('gerencia','bitacora-ceo','leer')`, `('gerencia','bitacora-ceo','escribir')`, mismo criterio ya sembrado para `resumen-gerencia` en la migración 002.
- **Dependencias:** `002_perfiles_rbac.sql` (tabla `permisos`), `011_visitas_registro_horas.sql` (tabla `registro_horas`).
- **Notas:**
  - `admin` no necesita fila explícita — bypass total en `usePermission()` del cliente.
  - No crea tabla ni columna nueva — la tabla `registro_horas` ya soporta cualquier `empleado_id` válido, esto solo abre acceso de UI/permiso a un id fijo.
  - Junto con esta migración se agregó en `BitacoraSemanaGrid.jsx` una casilla aparte del calendario para "Permisos (salud/personal)" — horas no trabajadas por permiso médico o vuelta personal, que cuentan para el total semanal (mismo componente compartido, aplica también a `MiBitacora.jsx`/`Bitacoras.jsx`). Y en `Bitacoras.jsx` una pestaña "Resumen" (quién registró bitácora esta semana + tarifa mensual, esta última visible solo para rol `admin`).

### 023 — Arqueo de Caja pasa a Supabase (fix bug multi-dispositivo)
- **Archivo:** `migrations/023_arqueo_caja_supabase.sql`
- **Fecha:** 2026-07-22
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-22
- **Propósito:** el jefe del usuario abrió el portal en otro computador y no vio un arqueo de caja ya registrado. Causa raíz: `src/lib/dbArqueoCaja.js` guardaba en `localStorage` (por pedido explícito del usuario en su momento: "no se sistematiza como el resto de la app"), aislado por navegador/dispositivo. La tabla `arqueo_caja` con RLS ya existía desde la migración 015 pero nunca se conectó al frontend, y además había quedado fuera de la migración 021 (habilitar Realtime) por omisión. Se mantiene desacoplado de Tesorería a propósito (mismo criterio que GBA): no compara contra `vw_saldos_cuentas`, no usa RPC con `FOR UPDATE NOWAIT` — solo gana sincronización entre dispositivos.
- **Tablas afectadas:** `arqueo_caja` (`ALTER TABLE ADD COLUMN denominaciones jsonb` — el recibo impreso `ReciboArqueoCaja.jsx` muestra el detalle de conteo por billete, que la tabla original no contemplaba) + `ALTER PUBLICATION supabase_realtime ADD TABLE` (idempotente).
- **Dependencias:** `015_arqueo_caja.sql` (tabla y RLS ya existentes), `021_habilitar_realtime.sql` (patrón idempotente de publicación).
- **Notas:**
  - `src/lib/dbArqueoCaja.js` se reescribió completo para usar Supabase en vez de `localStorage`; se creó `useArqueoCajaStore.js` (patrón estándar fetchAll/registrar/initRealtime/teardownRealtime); `ArqueoCaja.jsx` se actualizó para consumir el store.
  - El historial viejo en `localStorage` del navegador del usuario queda huérfano — no se migra automáticamente.

### 024 — Módulo "Tareas" (calendario mensual estilo Asana + hora de llegada)
- **Archivo:** `migrations/024_tareas_calendario.sql`
- **Fecha:** 2026-07-22
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-22
- **Propósito:** nuevo módulo "Tareas" en el portal (departamento Proyectos) — pedido explícito del usuario, calendario mensual estilo Asana (tareas cortas por día, marcables como completadas), independiente de `BitacoraSemanaGrid` (esa es horas por proyecto). Incluye captura automática de hora de llegada al iniciar sesión (primera vez del día), para comparar contra `empleados.tipo_horario` (`src/lib/horarios.js`) y mostrar puntual/tarde — visible solo para admin/rrhh en la página "Reportes" (departamento Gerencia), no en el portal del propio empleado.
- **Tablas afectadas:** `tareas` (nueva, RLS empleado propio + admin/rrhh todo), `acceso_diario` (nueva, `UNIQUE(tenant_id, empleado_id, fecha)` para atomicidad de "primera vez del día", solo lectura vía RLS), función `fn_registrar_acceso_diario()` (SECURITY DEFINER, resuelve `empleado_id` server-side vía `fn_empleado_id()`), ambas tablas agregadas a `supabase_realtime`.
- **Dependencias:** `auth_rol()` (002), `fn_empleado_id()` (013), `empleados` (007).
- **Notas:**
  - `useAuthStore._syncPerfil()` llama `supabase.rpc('fn_registrar_acceso_diario')` una vez por carga de sesión, solo si `perfil.rol === 'empleado'`.
  - La página "Reportes" (antes placeholder "Reportes y Permisos", ahora solo "Reportes") se movió de estar anidada dentro de "Tareas" a ser su propio ítem bajo el departamento Gerencia (pedido explícito del usuario al ver la sidebar); `Tareas.jsx` quedó solo con el calendario.
  - Frontend: `dbTareas.js`, `dbAccesoDiario.js`, `useTareasStore.js`, `useAccesoDiarioStore.js`, `Tareas.jsx`, `Reportes.jsx`.

### 025 — Módulo "Permisos" (solicitud de ausencia + aprobación)
- **Archivo:** `migrations/025_permisos_ausencia.sql`
- **Fecha:** 2026-07-22
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-22
- **Propósito:** el empleado solicita una ausencia con mínimo 15 días de anticipación; solo admin aprueba/rechaza. Al aprobarse, se autocompleta el rango como bloque "Permiso" en `registro_horas` (mismo mecanismo de nota-prefix `[Permiso:Salud|Personal]` que ya usa `BitacoraSemanaGrid.jsx`), para que el empleado no tenga que cargarlo de nuevo a mano. Ubicado bajo el departamento "Gestión Humana" en el sidebar (pedido explícito del usuario).
- **Tablas afectadas:** `permisos_ausencia` (nueva, RLS empleado propio + select admin/rrhh + insert propio con constraint de 15 días de anticipación; sin UPDATE directo — `REVOKE UPDATE`), trigger de auditoría (`fn_audit_trigger`), función `fn_resolver_permiso_ausencia()` (SECURITY DEFINER, solo admin, aprueba/rechaza atómicamente y en el mismo paso inserta las filas de `registro_horas` del rango si se aprueba), tabla agregada a `supabase_realtime`.
- **Dependencias:** `auth_rol()` (002), `fn_empleado_id()` (013), `fn_audit_trigger()` (004), `registro_horas` con `proyecto_id` nullable (011, 014).
- **Notas:**
  - Se agregó lectura para rol `rrhh` (además de empleado propio y admin) por estar ubicado bajo Gestión Humana en el sidebar — no estaba en el plan original, decisión tomada sin pregunta adicional siguiendo el mismo criterio ya aplicado a `tareas`/`reportes`.
  - `dias = 8` al autocompletar `registro_horas` es un supuesto de jornada completa por día de permiso — ajustable a futuro sin romper nada más si se prefiere calcular contra `tipo_horario` del empleado.
  - El `INSERT` dentro del RPC usa `NOT EXISTS` (no `ON CONFLICT`) porque `registro_horas` no tiene un constraint único sobre `(empleado_id, fecha, proyecto_id)` — evita duplicar si el empleado ya había cargado ese día manualmente.
  - Frontend: `dbPermisosAusencia.js`, `usePermisosAusenciaStore.js`, `src/pages/rrhh/Permisos.jsx` (formulario+historial para empleado, panel aprobar/rechazar para admin).

### 026 — Reportes de avance por tarea (imagen/audio/video)
- **Archivo:** `migrations/026_tarea_reportes.sql`
- **Fecha:** 2026-07-22
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-22
- **Propósito:** pedido explícito del usuario ("Tareas que sea como item nuevo y de ahí van reportes que se pueda enviar un audio o video o imágenes") — cada tarea del calendario (módulo Tareas, migración 024) abre un detalle con un feed de reportes de avance (texto + adjunto opcional), visible para el empleado dueño y para admin/rrhh (mismo criterio de supervisión ya usado en `tareas`/`acceso_diario`).
- **Tablas afectadas:** `tarea_reportes` (nueva, FK a `tareas`/`empleados`, RLS empleado propio select/insert/delete + select admin/rrhh, sin UPDATE), trigger de auditoría (`fn_audit_trigger`), tabla agregada a `supabase_realtime`, bucket privado de Storage `tarea-reportes` + políticas sobre `storage.objects` (insert/delete solo el empleado dueño, select empleado/admin/rrhh).
- **Dependencias:** `auth_rol()` (002), `fn_empleado_id()` (013), `fn_audit_trigger()` (004), `tareas`/`empleados` (024/007).
- **Notas:**
  - No se sembraron filas nuevas en `permisos` — el módulo `tareas` ya tiene `leer`/`escribir` para empleado/admin/rrhh desde la migración 024, y cubren también el acceso a los reportes (mismo módulo en el sidebar).
  - El calendario mensual de `Tareas.jsx` también se rediseñó visualmente (colores por tarea vía hash determinístico del id, sin columna nueva en la base de datos — pedido del usuario de un estilo "más vistoso, que llame la atención, como Asana").
  - Frontend: `dbTareaReportes.js`, `useTareaReportesStore.js`, `Tareas.jsx` (modal de detalle de tarea con feed de reportes + subida de adjunto), `fmtDateTime` agregado a `formatters.js`.

### 027 — Arqueo de Caja: borrar arqueo mal registrado + efectivo pendiente
- **Archivo:** `migrations/027_arqueo_caja_pendiente_y_delete.sql`
- **Fecha:** 2026-07-23
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-23
- **Propósito:** dos pedidos del usuario sobre Arqueo de Caja tras revisar un descuadre de $190.935 en el efectivo. 1) Permitir borrar un arqueo mal registrado (la tabla, migración 015, solo tenía SELECT/INSERT). 2) Registrar efectivo que el usuario recibe pero no tiene físicamente (lo maneja un tercero) — solo informativo, no crea transacciones ni afecta `vw_saldos_cuentas`.
- **Tablas afectadas:** `arqueo_caja` (`ADD COLUMN pendiente_monto`, `pendiente_concepto`, `CHECK pendiente_monto >= 0`, `POLICY arqueo_caja_delete` solo `admin`).
- **Dependencias:** `arqueo_caja` (015), `denominaciones` (023).
- **Notas:**
  - Borrar es más restrictivo que insertar (que también permite `contabilidad`) por ser más sensible.
  - Junto con esta sesión se corrigió un bug real en `ArqueoCaja.jsx`: el saldo del sistema se leía una sola vez al montar en vez de suscribirse a `useTesoreriaStore` (realtime) — el "faltante" no se actualizaba solo al registrar movimientos en Tesorería. Se agregó también un banner de estado ("Hoy estás cuadrada" / cuánto sobra o falta según el último conteo del día) para que la usuaria y su jefe vean el cuadre de un vistazo.

### 028 — Bitácora: servicio por proyecto en registro de horas
- **Archivo:** `migrations/028_registro_horas_servicio.sql`
- **Fecha:** 2026-07-23
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-23
- **Propósito:** pedido explícito del usuario — dentro de un proyecto, las horas no siempre pertenecen al proyecto "madre" sino a un servicio específico (`servicios_proyecto`, ej. FACHADAS, ACABADOS). Se agrega `servicio_id` opcional a `registro_horas` para poder atribuir horas a un servicio. Explícitamente NO se agrega descuento de presupuesto/matriz por servicio — eso queda para un módulo futuro de presupuesto ("no el presupuesto es algo asi ese todavia no lo toquemos").
- **Tablas afectadas:** `registro_horas` (`ADD COLUMN servicio_id uuid REFERENCES servicios_proyecto(id)`, índice `idx_registro_horas_servicio_id`).
- **Dependencias:** `registro_horas` (011/014), `servicios_proyecto`.
- **Notas:**
  - Junto con esta migración se hicieron cambios solo-frontend en `BitacoraSemanaGrid.jsx` (componente compartido por `MiBitacora.jsx`/`Bitacoras.jsx`/`BitacoraCeo.jsx`): se quitó la columna Domingo del calendario semanal (6 días, Lunes–Sábado — pedido explícito, "quitemos el domingo no se requiere"; el `DAY_LABELS` de `dateWeek.js` NO se tocó porque también lo usan `Reportes.jsx`/`Tareas.jsx`, que sí necesitan los 7 días — se usa un array local recortado solo en este componente); se fusionó la caja aparte de "Permisos" dentro de la misma tabla de proyectos como un ítem/fila más (antes eran "dos cuadros" separados); se agregó un selector de servicio por fila de proyecto (solo visible si el proyecto tiene servicios definidos) que aplica a las horas que se registren esa semana.
  - En `Bitacoras.jsx` (vista admin): columna "Servicio" en el historial, totales del header cambiados al formato pedido "X trabajadores y Y permisos" (conteo de empleados distintos vs. filas con nota `[Permiso:...]`), y selector de servicio agregado al modal de registro manual.
  - En `FormBitacora.jsx` (modal usado desde `ProyectoDetalle.jsx`, con `projectId` fijo): mismo selector de servicio, poblado con `useServiciosStore.getByProject(projectId)`.
  - Frontend: `dbTimelogs.js` (`servicio_id`/`serviceId` en columnas, `timelogFromRow`, `addTimelog`, `updateTimelog`).

### 029 — Módulo Presupuesto: Cotización
- **Archivo:** `migrations/029_presupuesto_cotizacion.sql`
- **Fecha:** 2026-07-24
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-24
- **Propósito:** pedido explícito de la usuaria, mostrando ejemplos reales (cotización PINAMAR 1701) — módulo "Presupuesto" por proyecto. Primera entrega: solo la vista "Cotización" — categorías de obra con ítems (cantidad, costo, estado, anotaciones), subtotal + "Acompañamiento de obra" (%), total. La usuaria aclaró que "Cotización" y las hojas de margen (Compras y Proveedores, costo original vs costo ADA) van todas bajo un mismo módulo "Presupuesto" — se deja la estructura general (columna `modo`) pero solo se construye la UI de Cotización en este corte; `modo='compra'` queda listo para una siguiente entrega sin nueva migración.
- **Tablas afectadas:** `presupuesto_categorias` (nueva: `proyecto_id`, `servicio_id` opcional, `grupo`, `nombre`, `modo` obra/compra, `acompanamiento_pct`, `orden`), `presupuesto_items` (nueva: `categoria_id`, `descripcion`, `cantidad`, `costo_unitario`, `costo_original`/`costo_ada` para modo compra, `proveedor`, `personal`, `estado`, `porcentaje_avance`, `fecha_probable_fin`, `anotaciones`, `orden`), triggers de auditoría (`fn_audit_trigger`), ambas tablas agregadas a `supabase_realtime`.
- **Dependencias:** `auth_rol()` (002), `fn_audit_trigger()` (004), `proyectos`/`servicios_proyecto` (010).
- **Notas:**
  - Se crean 2 tablas nuevas en vez de extender `servicios_proyecto`: ese modelo es 1 fila = 1 contrato/servicio (usado también para clasificar horas en Bitácora, migración 028) y no tiene granularidad de ítems. Se deja un link opcional `servicio_id` por si una categoría de presupuesto coincide con un servicio ya existente.
  - Visibilidad: todo el módulo (incluyendo el futuro modo `compra` con márgenes/ganancia ADA) restringido a **admin + gerencia** únicamente — mismo criterio que `servicios_proyecto`/`proyectos.valor_contrato`. Se sembró `permisos` (`gerencia`→leer/escribir; admin tiene bypass).
  - Frontend: `dbPresupuesto.js`, `usePresupuestoStore.js`, `FormPresupuestoCategoria.jsx`, `FormPresupuestoItem.jsx`, `SeccionPresupuesto.jsx` (nueva Sección F en `ProyectoDetalle.jsx`, gateada por `usePermission('presupuesto','leer')`).
  - No se tocó "Compras y Proveedores", la matriz resumen por grupo, ni el costeo por empleado en Bitácora madre — quedan explícitamente para una siguiente entrega, a pedido de la usuaria de arrancar con lo más chico primero.

### 030 — Base de días laborales del mes: 23 → 25
- **Archivo:** `migrations/030_dias_laborales_mes_25.sql`
- **Fecha:** 2026-07-24
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-24
- **Propósito:** corrección de dato (no de esquema) pedida por la usuaria — el valor/día de cada empleado (tarifa mensual / días laborales del mes) debe calcularse sobre una base de 25 días, no los 23 sembrados originalmente en la migración 003. Afecta directamente el costeo de mano de obra por proyecto.
- **Tablas afectadas:** `configuracion` (`UPDATE dias_laborales_mes = 25` para `tenant_id='ada'`).
- **Dependencias:** `configuracion` (003).
- **Notas:**
  - No requiere ningún cambio de código: `getSettings()` (`dbSettings.js`) ya lee `dias_laborales_mes` en tiempo real y todo el costeo (`ProyectoDetalle.jsx`, `dbProyectos.js`, `dbEmpleados.js.getDailyRate()`) recalcula con el valor vigente en la tabla.
  - No hay UI de administración para este valor (no existe página de "Configuración" con este campo editable) — el cambio se hace directo por SQL.

### 031 — Carga prestacional real por empleado
- **Archivo:** `migrations/031_carga_prestacional_empleados.sql`
- **Fecha:** 2026-07-24
- **Estado:** ✅ Ejecutada en Supabase (SQL Editor), confirmada 2026-07-24
- **Propósito:** la usuaria envió su tabla real de nómina por cargo (PAGO NETO / CARGA PRESTACIONAL / TOTAL, mensual y diario). El campo `empleados.carga_pct` — ya usado en el costeo de mano de obra desde la corrección de fórmula de esta misma sesión (ver nota de código en `dbEmpleados.js.getDailyRate()`, `ProyectoDetalle.jsx`, `dbProyectos.js`) — tenía el mismo valor plano (30%) en los 9 empleados activos, sin corresponder a ningún cargo real. Se calculó `carga_pct = carga_prestacional / pago_neto * 100` por cargo y se cruzó con el salario ya cargado (`tarifa_mensual + salario_no_constitutivo`) para identificar a cada persona.
- **Tablas afectadas:** `empleados` (`UPDATE carga_pct` para los 9 empleados activos de `tenant_id='ada'`).
- **Dependencias:** `empleados` (007).
- **Notas:**
  - Se agregó también el input "Carga prestacional (%)" al formulario de empleado (`FormEmpleado.jsx`), que no existía — el campo estaba en el modelo de datos y en la fórmula de costeo pero no era editable desde la UI.
  - Dos discrepancias de salario detectadas y documentadas, no corregidas en esta migración: CEO (`tarifa_mensual = 0` en la app vs $6.000.000 en la tabla de la usuaria) y Alejandra Castillo ($1.860.000 en la app vs $2.000.000 en la tabla de la usuaria).
  - Juan David Villegas y Pablo Novoa comparten cargo en la app ("Coordinador de Carpintería") pero la tabla de la usuaria trae dos "Analista de Carpintería" con el mismo sueldo y % distinto (38.03%/37.09%) — no había forma de distinguirlos por dato existente, se asignó Villegas=38.03%/Novoa=37.09% como mejor esfuerzo; editable después por persona en Equipo.
