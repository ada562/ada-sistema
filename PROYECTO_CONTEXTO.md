# ADA Gestion — Contexto del Proyecto
**Actualizado:** 2026-07-22 (sesion 7)
**Version app:** v0.3.3

## 1. Estado general
Migracion completa de localStorage a Supabase (Postgres + Auth + RLS + Realtime)
terminada para **todos** los modulos con datos criticos: Tesoreria, Contratistas,
Empleados/Nomina, Proyectos/Servicios, Bitacoras (registro_horas), Visitas,
Calendario tributario. Causa raiz de la perdida de datos reportada (modulos
`db*.js` que cargaban datos una sola vez en variable de modulo y se pisaban
entre pestanas) queda resuelta: cada escritura es una sentencia SQL dirigida
(o RPC atomica con `FOR UPDATE NOWAIT` en operaciones de dinero) y cada pagina
sincroniza en vivo via Supabase Realtime (`postgres_changes` por tabla,
filtrado por `tenant_id=eq.ada`).

**Sesion 5 (2026-07-21):** Portal de empleado ("Mi Bitacora") + calendario
semanal de bitacora compartido entre admin y empleado + costeo AIU por
proyecto. Ver detalle en seccion 1b.

**Sesion 6 (2026-07-22):** Bloque "Permiso" (salud/personal) separado de
"Otros" en la bitacora semanal, tab "Resumen" dentro de Bitacoras (quien
registro + tarifa mensual solo-admin), nueva pagina "Bitacora CEO" en
Gerencia (sin cuenta de portal), migracion 022 (RBAC de `bitacora-ceo`).
Ver detalle en seccion 1c.

**Sesion 7 (2026-07-22):** Arqueo de Caja migra de `localStorage` a Supabase
(fix del bug reportado: el jefe no veia el arqueo desde otro dispositivo),
se elimina por completo la fila/opcion "Otros" de la bitacora (solo queda
"Permiso"), y se agregan dos modulos nuevos: "Tareas" (calendario mensual
estilo Asana, departamento Proyectos) con captura automatica de hora de
llegada, y "Permisos" (solicitud de ausencia con aprobacion admin,
departamento Gestion Humana) que autocompleta la bitacora al aprobarse. La
pagina "Reportes" (antes placeholder dentro de Gestion Humana) pasa a ser un
modulo propio en Gerencia con el reporte semanal de horas + puntualidad.
Migraciones 022-025 escritas y **ejecutadas en Supabase** durante esta
sesion. Ver detalle en seccion 1d.
`npm run build` verificado sin errores al cierre de esta sesion.

## 1d. Sesion 7 — Arqueo de Caja a Supabase + quitar "Otros" + Tareas + Permisos
- **Arqueo de Caja → Supabase** (`src/lib/dbArqueoCaja.js` reescrito,
  `useArqueoCajaStore.js` nuevo, `ArqueoCaja.jsx` actualizado): causa raiz
  del bug reportado por el usuario (su jefe no veia el arqueo desde otro
  computador) era doble — el modulo guardaba en `localStorage` (aislado por
  navegador) y ademas `arqueo_caja` habia quedado fuera de la migracion 021
  (Realtime) por omision. Migracion 023 agrega `denominaciones jsonb`
  (detalle de conteo por billete, usado por `ReciboArqueoCaja.jsx`) y
  habilita Realtime. Sigue desacoplado de Tesoreria a proposito (mismo
  criterio que GBA): no compara contra `vw_saldos_cuentas`, no usa RPC con
  `FOR UPDATE NOWAIT`.
- **Fila "Otros" eliminada por completo** de `BitacoraSemanaGrid.jsx`
  (constante `OTROS_ID`, `findEntry`, helpers de commit, fila de tabla) y de
  `Bitacoras.jsx` (filtro, dropdown, modal `FormBitacoraGlobal` ya no permite
  crear filas "Otros" nuevas). Filas historicas con `proyecto_id NULL` sin
  el prefijo `[Permiso:...]` se siguen mostrando en el historial como "Otros
  (historico)" para no perder contexto de datos ya guardados. La constraint
  `registro_horas_otros_requiere_nota` (migracion 014) no se toco — sigue
  vigente, ahora solo la ejercita "Permiso".
- **Modulo "Tareas"** (`src/pages/proyectos/Tareas.jsx`, departamento
  Proyectos): calendario mensual estilo Asana — tareas cortas por dia,
  marcables como completadas, independiente de la bitacora de horas.
  Migracion 024 crea `tareas` (RLS empleado propio + admin/rrhh todo) y
  `acceso_diario` (hora de llegada capturada automaticamente al iniciar
  sesion, `UNIQUE(tenant_id, empleado_id, fecha)` + RPC
  `fn_registrar_acceso_diario()` para atomicidad e id server-side).
- **Pagina "Reportes"** (`src/pages/Reportes.jsx`, ahora en departamento
  Gerencia, ya no "Reportes y Permisos"): reporte semanal de horas +
  hora de llegada/puntualidad (contra `empleados.tipo_horario`) por
  empleado, visible solo admin/rrhh. Se movio aqui desde adentro de
  `Tareas.jsx` (donde vivia como tab) tras pedido explicito del usuario de
  reorganizar el sidebar.
- **Modulo "Permisos"** (`src/pages/rrhh/Permisos.jsx`, departamento
  Gestion Humana): el empleado solicita una ausencia con minimo 15 dias de
  anticipacion (validado en cliente y en RLS); solo admin aprueba/rechaza
  via RPC `fn_resolver_permiso_ausencia()` (migracion 025), que al aprobar
  autocompleta `registro_horas` con el bloque `[Permiso:Salud|Personal]`
  para cada dia del rango (mismo mecanismo que ya usa
  `BitacoraSemanaGrid.jsx`), sin que el empleado tenga que cargarlo de
  nuevo. Se agrego lectura para rol `rrhh` (ademas de empleado propio y
  admin) por estar bajo Gestion Humana en el sidebar.
- **Migraciones 022-025 ejecutadas en Supabase** (SQL Editor, manual) esta
  misma sesion — ver `MIGRATIONS.md` para el detalle completo de cada una.
- **Reportes de avance por tarea** (imagen/audio/video): cada tarea del
  calendario abre un detalle (modal) con un feed de reportes de avance —
  texto opcional + adjunto opcional (foto, audio o video, 25MB max).
  Migracion 026 (`tarea_reportes` + bucket privado `tarea-reportes`,
  **pendiente de ejecutar en Supabase**) — visible para el empleado dueño
  y para admin/rrhh, sin edicion in-place (se borra y se sube de nuevo).
- **Calendario de Tareas rediseñado** — colores por tarea (paleta estilo
  Asana asignada por hash determinístico del id, sin columna nueva en la
  base de datos), dia de hoy resaltado, encabezados de dia mas vistosos.

## 1c. Sesion 6 — Permiso aparte + Resumen de bitacoras + Bitacora CEO
- **"Permiso" separado de "Otros"** en `BitacoraSemanaGrid.jsx` (componente
  compartido por `MiBitacora.jsx` y `Bitacoras.jsx`, sin cambio de esquema):
  nuevo bloque de tarjetas por dia (motivo Salud/Personal + descripcion +
  horas), reutiliza la convencion de `nota` (`[Permiso:Salud|Personal] ...`,
  `proyecto_id NULL`) igual que "Reposición"/"Festivo". Las horas de permiso
  suman al total semanal junto con "Otros".
- **Tab "Resumen" en `Bitacoras.jsx`:** por semana, muestra que empleados
  registraron bitacora (check/x) y sus horas totales; la columna de tarifa
  mensual (`empleado.monthlyRate`) solo se muestra si `perfil.rol === 'admin'`
  (mismo patron que `EmpleadoDetalle.jsx`). Decision explicita del usuario:
  los reportes de bitacora viven dentro de Bitacoras, no como tab aparte en
  Gerencia; y el valor $ solo lo ve admin.
- **Pagina nueva "Bitacora CEO"** (`src/pages/gerencia/BitacoraCeo.jsx`),
  dentro del departamento Gerencia (`departments.js`, `App.jsx` `views`):
  reusa `BitacoraSemanaGrid` con `employeeId` fijo (Alejandra Duran Agudelo,
  CEO — id `cd1d2411-e5dc-43d7-bfd2-1fc9ca9c31dc`), sin selector de empleado
  porque ella no tiene ni requiere cuenta de portal.
- **Migracion 022** (`022_permiso_bitacora_ceo.sql`): semilla de `permisos`
  para el modulo `bitacora-ceo` (rol `gerencia`, leer+escribir). **Pendiente
  de ejecutar en Supabase** — sin ella, cualquier rol no-admin con acceso a
  Gerencia no vera la pestaña.
- **QA manual del portal de empleado:** password de prueba regenerada para
  Pablo Novoa (Coordinador Carpinteria) via script puntual con
  `SUPABASE_SERVICE_ROLE_KEY` (mismo mecanismo que
  `api/admin/set-empleado-password.js`). Password anterior de Pablo queda
  invalidada.
- **Pendiente de definir:** "Chat empresarial" — mencionado por el usuario,
  sin alcance ni diseño todavia, no se empezo a construir.

## 1b. Sesion 5 — Portal de empleado + Bitacora semanal + AIU
- **Portal de empleado ("Mi Bitacora"):** login individual por empleado
  (`empleados.user_id` -> `auth.users`), nueva vista `mi-bitacora` en el
  sidebar (`src/pages/proyectos/MiBitacora.jsx`), RLS propia con bloqueo
  blando (no puede editar semanas ya cerradas) — migracion 013.
- **`BitacoraSemanaGrid.jsx`** (nuevo componente compartido): calendario
  semanal Lunes-Domingo por proyecto, usado tanto en `MiBitacora.jsx` (rol
  empleado) como en `Bitacoras.jsx` (rol admin) — quedan sincronizados en
  vivo entre si sin logica adicional.
  - Fila fija **"Otros"**: horas sin proyecto asociado (trabajo interno),
    requiere descripcion obligatoria (`proyecto_id NULL` + `nota`).
  - Tag **"Reposición"**: dia de fin de semana trabajado que se compensa
    despues (reutiliza la convencion de `nota`, sin cambio de esquema).
  - Tag **"Festivo"** ya existente, ahora con `dias=0` soportado (bug de
    CHECK constraint corregido en migracion 014).
  - Bug de redondeo flotante en los totales corregido (`round2()`).
  - Controles de Festivo/Reposición reorganizados como pills compactas en
    una sola fila (feedback del usuario: la grilla se veia saturada).
- **API route nueva:** `api/admin/set-empleado-password.js` — unico lugar
  del proyecto que usa `SUPABASE_SERVICE_ROLE_KEY` (cambiar contraseña de
  cuenta de portal de un empleado), validado server-side contra rol admin.
- **Costeo AIU ("cuanto cobrar"):** nuevo bloque en la Seccion A
  ("Costeo de mano de obra") de cada proyecto (`ProyectoDetalle.jsx`) —
  Administracion/Imprevistos/Utilidad sobre `costoManoObra`, usando los
  % configurados en `configuracion` (`dbSettings.js`).
- **Migraciones 013 y 014 ejecutadas y confirmadas en Supabase** (ver
  `MIGRATIONS.md`).
- **Feedback del usuario guardado en memoria:** mantener siempre toast
  "Guardado" visible en cada accion de guardado (no silenciar) — hubo
  perdida real de datos en el pasado.

## 2. Modulos (estado)
| # | Modulo | Pagina | Backend | Estado |
|---|--------|--------|---------|--------|
| 1 | Resumen Gerencia | gerencia/ResumenGerencia | Supabase (proyectos, calendario, contratistas, empleados, transacciones) | ✅ funcional |
| 2 | Tesoreria | contabilidad/Tesoreria | Supabase (`transacciones` + RPC) | ✅ funcional |
| 3 | Contratistas | contabilidad/Contratistas | Supabase (`contratistas`, `pagos_contratistas` + RPC abono) | ✅ funcional |
| 4 | GBA | contabilidad/GBA | Supabase (`transacciones` gba_movimiento + proyectos) | ✅ funcional |
| 5 | Proyectos ADA | Proyectos + ProyectoDetalle | Supabase (`proyectos`, `servicios_proyecto`) | ✅ funcional |
| 6 | Bitacoras | proyectos/Bitacoras | Supabase (`registro_horas`) | ✅ funcional |
| 7 | Visitas | proyectos/Visitas | Supabase (`visitas` + `visita_asistentes`) | ✅ funcional (+ paquetes) |
| 8 | Equipo | rrhh/Equipo + EmpleadoDetalle | Supabase (`empleados`) | ✅ funcional |
| 9 | Nomina | rrhh/Nomina | Supabase (`pagos_nomina` + RPC) | ✅ funcional (primas + aportes) |
| 10 | Contratos | rrhh/Contratos | — | ⬜ placeholder |
| 11 | Horarios | rrhh/Horarios | — | ⬜ placeholder |
| 12 | Reportes | Reportes | Supabase (`registro_horas`, `acceso_diario`) | ✅ funcional (admin/rrhh) |
| 13 | Arqueo de Caja | contabilidad/ArqueoCaja | Supabase (`arqueo_caja`, desacoplado de Tesoreria) | ✅ funcional |
| 14 | Tareas | proyectos/Tareas | Supabase (`tareas`, `acceso_diario`) | ✅ funcional |
| 15 | Permisos | rrhh/Permisos | Supabase (`permisos_ausencia` + RPC) | ✅ funcional |
| 16 | Publicidad | marketing/Publicidad | — | ⬜ placeholder |
| 17 | Redes | marketing/Redes | — | ⬜ placeholder |

Categorias, cuentas y configuracion (`dbCategorias.js`, `dbSettings.js`) tambien
migrados a Supabase (`categorias`, `cuentas`, `configuracion`).

## 3. Infraestructura
- **Repo:** github.com/ada562/ada-sistema (main)
- **Deploy:** Vercel auto-deploy desde main
- **Dominio:** app.adainteriors.co (DNS pendiente en Hostinger)
- **Auth:** Supabase Auth + tabla `perfiles` (RBAC por rol) — `dbAuth.js`, `useAuthStore.js`, `usePermission.js`
- **Datos:** Supabase Postgres con RLS en todas las tablas — ya NO usa localStorage para ningun modulo con datos criticos

## 4. Equipo de agentes AI
11 skills configurados en `.claude/skills/`:

| Agente | Comando | Funcion |
|--------|---------|---------|
| Arquitecto | /ada-architect | Estructura, patrones, escalabilidad |
| Revisor | /ada-reviewer | Calidad de codigo, bugs, convenciones |
| Optimizador | /ada-optimizer | Bundle size, renders, memoria |
| Seguridad | /ada-security | Auth, RLS, OWASP, datos sensibles |
| QA | /ada-qa | Funcionalidad, edge cases, validaciones |
| Documentador | /ada-docs | Modulos, API, modelo de datos, changelog |
| DevOps | /ada-deploy | Build, deploy, env vars, rollback |
| DBA | /ada-sql | Migraciones SQL, validacion, documentacion |
| DBA Status | /ada-sql-status | Actualizar estado de migraciones |
| Sesion Start | /ada-session-start | Briefing inicio de sesion |
| Sesion Sync | /ada-context-sync | Cierre de sesion, sync contexto |

10 hooks automaticos en `hooks/` configurados en `.claude/settings.json`

**IMPORTANTE:** Los skills solo aparecen con `/` si VS Code esta abierto en `C:\dev\ada-gestion`

## 5. Migraciones SQL
25 migraciones escritas, **25 ejecutadas** en produccion Supabase
(`supabase/migrations/`, detalle en `MIGRATIONS.md`):
001 claude_readonly_role · 002 perfiles_rbac (Auth + RBAC) · 003 categorias_configuracion_cuentas ·
004 tesoreria_transacciones_rpc · 005 fn_registrar_transaccion_gba_facturado ·
006 contratistas_pagos_rpc · 007 empleados_completo · 008 pagos_nomina_rpc ·
009 seed_datos_historicos · 010 proyectos_servicios · 011 visitas_registro_horas ·
012 calendario_tributario · 013 empleado_portal_bitacora · 014 bitacora_otros_reposicion ·
015-020 (permisos arqueo-caja y varios ajustes, ver `MIGRATIONS.md`) ·
021 habilitar_realtime · 022 permiso_bitacora_ceo · 023 arqueo_caja_supabase ·
024 tareas_calendario (`tareas` + `acceso_diario`) ·
025 permisos_ausencia (`permisos_ausencia` + RPC de aprobacion).

Todas las tablas tienen RLS activo + politica `claude_readonly_select` + trigger de
auditoria (`audit_log`) en las tablas de dinero/empleados.

## 6. Deuda tecnica
- **P2:** Completar modulos placeholder (Contratos, Horarios, Publicidad, Redes) — Fase 11-12 del plan de arquitectura
- **P2:** Configurar DNS app.adainteriors.co en Hostinger (CNAME → cname.vercel-dns.com)
- **P3:** Integraciones diferidas: PowerSync (offline en Visitas de campo), model-viewer/pdf.js/Pannellum (portal cliente), Chatwoot
- **P3:** Revisar y afinar la matriz de permisos provisional de `002_perfiles_rbac.sql` contra el uso real por rol

## 7. Cuenta Claude
- **Email:** coor.produccion.ada@gmail.com
- **Plan:** Max (confirmado en facturacion)

## 9. Proxima Sesion — Continuar Aqui
0. **Ejecutar migracion 026 en Supabase (SQL Editor)** —
   `026_tarea_reportes.sql`, crea tabla `tarea_reportes` + bucket privado
   `tarea-reportes`. Sin esto, el boton "Enviar" del detalle de tarea en
   el portal de empleado va a fallar (tabla/bucket inexistentes)
1. **Probar en vivo los modulos nuevos de esta sesion:** Arqueo de Caja
   (registrar desde una pestaña, confirmar que aparece en vivo en otra
   pestaña/dispositivo con el mismo rol), Tareas (calendario, agregar/
   completar/borrar tarea), Permisos (solicitar con empleado, aprobar/
   rechazar con admin, confirmar que aparecen filas en `registro_horas`
   al aprobar), Reportes (hora de llegada + puntualidad de un empleado real)
2. El historial viejo de Arqueo de Caja en `localStorage` del navegador del
   usuario quedo huerfano — no se migro automaticamente, avisarle si
   pregunta por registros antiguos
3. Definir alcance de "Chat empresarial" (pedido por el usuario, sin
   diseño ni plan todavia — requiere su propia sesion de planeacion)
4. Probar en vivo el portal de empleado ("Mi Bitacora") con un usuario
   real: registro de horas, Festivo, Reposición, Permiso (salud/personal),
   semana bloqueada — credenciales de prueba: Pablo Novoa,
   `arq4.diseno.ada@gmail.com` / `AdaTest7189!` (password regenerada
   sesion 6, invalida la anterior)
5. Crear las cuentas de Supabase Auth de los empleados restantes y vincular
   `empleados.user_id` (migracion 013 ya ejecutada, pero no crea cuentas —
   eso queda pendiente, se hace via Admin API una vez confirmada la lista
   de correos)
6. Probar en produccion (dos pestañas abiertas) que el fix de sincronizacion en vivo
   funciona igual que en local para Tesoreria/Contratistas/Nomina/Proyectos/Visitas/Bitacoras
7. Configurar DNS en Hostinger (CNAME app → cname.vercel-dns.com)
8. Retomar Fase 8-12 del plan de arquitectura (roadmap en el plan guardado): Contratos,
   Horarios, Publicidad, Redes, y las integraciones de repos (PowerSync, model-viewer, pdf.js, Pannellum, Chatwoot)
9. Ejecutar /ada-security para una auditoria de las politicas RLS ya en produccion (incluye
   la nueva API route `api/admin/set-empleado-password.js` y las tablas nuevas
   `arqueo_caja`/`tareas`/`acceso_diario`/`permisos_ausencia`)
10. Ejecutar /ada-qa sobre los flujos recien migrados/creados (Arqueo de Caja,
    Tareas, Permisos, Reportes, portal de empleado, Bitacora CEO)
