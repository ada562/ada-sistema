# ADA Gestion — Contexto del Proyecto
**Actualizado:** 2026-07-21 (sesion 4)
**Version app:** v0.3.0

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
`npm run build` verificado sin errores al cierre de esta sesion.

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
| 12 | Reportes y Permisos | Reportes | — | 🟡 basico |
| 13 | Publicidad | marketing/Publicidad | — | ⬜ placeholder |
| 14 | Redes | marketing/Redes | — | ⬜ placeholder |

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
12 migraciones escritas y **ejecutadas** en produccion Supabase (`supabase/migrations/`,
detalle en `MIGRATIONS.md`):
001 claude_readonly_role · 002 perfiles_rbac (Auth + RBAC) · 003 categorias_configuracion_cuentas ·
004 tesoreria_transacciones_rpc · 005 fn_registrar_transaccion_gba_facturado ·
006 contratistas_pagos_rpc · 007 empleados_completo · 008 pagos_nomina_rpc ·
009 seed_datos_historicos · 010 proyectos_servicios · 011 visitas_registro_horas ·
012 calendario_tributario.

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
1. Probar en produccion (dos pestañas abiertas) que el fix de sincronizacion en vivo
   funciona igual que en local para Tesoreria/Contratistas/Nomina/Proyectos/Visitas/Bitacoras
2. Configurar DNS en Hostinger (CNAME app → cname.vercel-dns.com)
3. Retomar Fase 8-12 del plan de arquitectura (roadmap en el plan guardado): Contratos,
   Horarios, Publicidad, Redes, y las integraciones de repos (PowerSync, model-viewer, pdf.js, Pannellum, Chatwoot)
4. Ejecutar /ada-security para una auditoria de las politicas RLS ya en produccion
5. Ejecutar /ada-qa sobre los flujos recien migrados (Visitas, Bitacoras, GBA, Resumen Gerencia)
