# Arquitectura General — ADA Gestión

**Fecha:** 2026-07-17
**Alcance:** diseño completo backend + frontend, incorporando las herramientas seleccionadas en `REPOSITORIOS_GITHUB.md` y el plan de migración a Supabase ya iniciado (`supabase/migrations/001_claude_readonly_role.sql` ejecutada).

Este documento es el mapa de referencia para construir el resto de la app. No reemplaza `docs/modelo-datos/entidades.md` (modelo de datos) ni `docs/especificacion/*.md` (reglas de negocio por módulo) — los conecta con decisiones de estructura de código.

---

## 1. Principios que no cambian (ya fijados en CLAUDE.md)

- Capa de datos única: todo acceso a datos pasa por `src/lib/db*.js`. Hoy leen/escriben `localStorage` vía `src/lib/storage.js`; se migran uno por uno a Supabase sin cambiar su firma pública (los componentes no deben notar la diferencia).
- Estado global en Zustand (`src/store/`), un store por dominio — patrón ya usado correctamente (`useTesoreriaStore`, `useProyectosStore`, `useEmpleadosStore`, `useServiciosStore`, `useNavigationStore`).
- `tenant_id` como 2da columna de toda tabla nueva, RLS activo siempre, dinero = RPC atómica.
- Rebanada vertical primero: Categorías/Configuración → Tesorería (Fase 3-4 del plan de migración) es la primera rebanada completa de punta a punta.

---

## 2. Estado actual — snapshot real del código

Verificado leyendo `src/App.jsx`, `src/data/departments.js`, `src/components/UI/Sidebar.jsx`, `src/components/UI/Layout.jsx`, `src/store/useNavigationStore.js`, `package.json`.

- **No hay enrutador.** `App.jsx` mapea `activeView` (string en `useNavigationStore`) a un componente de página vía un objeto `views = { tesoreria: Tesoreria, ... }`. Los ~17 componentes de página se importan **todos de forma eager** al top de `App.jsx` (líneas 8-24) — no existe code-splitting por vista hoy. `react-router-dom` no está en `package.json`.
- **Sidebar sin RBAC.** `Sidebar.jsx` renderiza `departments` (de `src/data/departments.js`) sin ningún filtro de permisos — cualquier sesión ve los 5 departamentos y ~17 módulos completos. No existe `src/hooks/` con contenido (carpeta vacía).
- **Auth local, no Supabase.** `App.jsx` usa `getSession()`/`logout()` de `src/lib/dbAuth.js` con `useState`, no hay `onAuthStateChange` ni sesión real de Supabase todavía (Fase 2 del plan de migración, pendiente).
- **Stores ya desacoplados por dominio** — buen punto de partida, no hace falta rediseñar Zustand.
- **Dependencias actuales:** React 19, Zustand 5, Supabase JS 2, Zod 4, react-hook-form, Sonner, Recharts, Tailwind 4, lucide-react. Nada de librerías pesadas (pdf.js, model-viewer, fabric.js, etc.) instalado todavía — bundle limpio hoy.

Estos cuatro puntos (sin router/code-splitting, sidebar sin RBAC, auth local, stores ok) son la base de los hallazgos en la sección 6.

---

## 3. Arquitectura de Backend (Supabase)

### 3.1 Orden de migración (ya definido, resumen operativo)

| Fase | Migración(es) | Contenido | Estado |
|---|---|---|---|
| 1 | `001_claude_readonly_role.sql` | Rol de solo lectura para Claude | ✅ ejecutada |
| 2 | `002_perfiles_rbac.sql` | `perfiles`, `permisos`, `auth_rol()`, trigger `handle_new_user` — reemplaza `dbAuth.js` admin/ada | pendiente |
| 3 | `003_categorias_configuracion_cuentas.sql` | `categorias`, `configuracion`, `cuentas` (reemplaza saldos sueltos) | pendiente |
| 4 | `004_tesoreria_transacciones_rpc.sql` | `transacciones` + `fn_registrar_transaccion` + `fn_registrar_traslado_entre_cuentas` + `vw_saldos_cuentas` | pendiente |
| 5 | `005_contratistas_pagos_rpc.sql` | `contratistas`, `pagos_contratistas`, `fn_registrar_abono_contratista` | pendiente |
| 6-7 | `006_empleados_completo.sql`, `007_pagos_nomina_rpc.sql` | `empleados` (con `pin_hash`), `pagos_nomina`, `fn_registrar_pago_nomina` | pendiente |
| 8-9 | `008_proyectos_servicios.sql`, `009_proyecto_equipo.sql` | `proyectos`, `servicios_proyecto`, `fn_metricas_proyecto`, tabla puente para RLS/PowerSync | pendiente |
| 10 | `010_visitas_registro_horas.sql` | `visitas`, `visita_asistentes`, `registro_horas` + arranque PowerSync | pendiente |
| 11-12 | `011_calendario_tributario.sql`, `012_archivos_portal_cliente.sql` | Módulos de menor prioridad | pendiente |

Cada migración: `CREATE TABLE` con `tenant_id`, políticas RLS (incluyendo una para `claude_readonly` o vista sin columnas sensibles), y RPC si mueve dinero. Se generan con `/ada-sql` una por una, no todas de antemano.

### 3.2 API Routes (Vercel) — cuándo se activan

`api/` está vacío hoy. Se crea la primera ruta solo cuando algo la necesite de verdad:
- Webhook receiver si se conecta Chatwoot (sección 5).
- Generación de PDFs/imágenes server-side (Satori), si se retoma el módulo Canva-like.
- Cualquier operación que requiera `SUPABASE_SERVICE_ROLE_KEY`.

Regla no negociable ya en CLAUDE.md: Zod valida el body desde la primera ruta que se cree, sin excepción.

### 3.3 PowerSync — punto de entrada exacto

Entra en la Fase 8 (`010_visitas_registro_horas.sql`), no antes. Sincroniza solo `visitas`, `visita_asistentes`, `registro_horas` (+ copias de lectura de `proyectos`/`empleados` para poblar selects offline), filtradas por la tabla puente `proyecto_equipo` (Fase 9 del plan, creada junto con Proyectos para no bloquear luego). El resto de la app sigue siendo Supabase-directo, sin PowerSync.

---

## 4. Arquitectura de Frontend

### 4.1 Routing y code-splitting — decisión

**No se introduce `react-router-dom`.** El patrón actual (Zustand + objeto `views`) funciona bien para una app interna sin URLs profundas que compartir, y reescribirlo no aporta valor ahora. El cambio necesario es más quirúrgico: envolver cada entrada de `views` en `App.jsx` con `React.lazy(() => import('./pages/...'))` + un único `<Suspense fallback={<Skeleton />}>` alrededor de `<Page />`. Esto por sí solo separa el bundle por módulo sin tocar el resto de la arquitectura, y es **prerrequisito** para meter model-viewer/pdf.js/Pannellum en el módulo 7 sin inflar el bundle inicial (confirmado como riesgo por el análisis del optimizador).

Excepción: si más adelante se necesita compartir un link directo (ej. token de Portal de Cliente, sección 4.4), ese caso puntual sí necesita una ruta URL real — se resuelve con un mini-router dedicado solo para esa entrada pública, no para toda la app.

### 4.2 RBAC — piezas a crear (Fase 2 del plan de migración)

- `src/hooks/usePermission.js` — lee `perfiles.rol` de la sesión de Supabase + tabla `permisos` (cacheada), expone `usePermission(modulo, accion)`.
- `src/components/UI/SinAcceso.jsx` — guard visual estándar.
- `src/data/departments.js` gana un campo `permisoRequerido` por módulo; `Sidebar.jsx` filtra `departments`/`modules` con `usePermission` antes de renderizar (hoy no filtra nada — hallazgo CRÍTICO, ver sección 6).
- `App.jsx` valida permiso antes de montar `Page`, no solo la sidebar (ocultar el link no basta, alguien podría forzar `activeView` vía estado).

### 4.3 Estructura de carpetas objetivo

```
src/
  lib/
    db*.js              → ya existe, migra mock→Supabase módulo por módulo
    supabase.js         → ya existe
    powersync.js         → NUEVO (Fase 8) — cliente PowerSync, solo importado
                            de forma lazy desde el módulo de campo
  hooks/
    usePermission.js     → NUEVO (Fase 2)
    useAuth.js            → NUEVO (Fase 2) — envuelve supabase.auth.*
  components/
    UI/
      SinAcceso.jsx       → NUEVO (Fase 2)
    archivos/             → NUEVO (módulo 7) — visores lazy
      ModelViewer3D.jsx   (model-viewer, lazy)
      VisorPDF.jsx        (pdf.js, lazy, worker en /public/workers/)
      Recorrido360.jsx    (Pannellum, lazy)
    integraciones/        → NUEVO (opcional, baja prioridad)
      ChatwootWidget.jsx  (script embebido, lazy, solo si el módulo está activo)
  pages/
    proyectos/
      VisitaCampo.jsx     → NUEVO (Fase 8) — vista offline-first
  data/
    departments.js        → gana `permisoRequerido` por módulo
api/                       → vacío hoy, se puebla bajo demanda (ver 3.2)
```

### 4.4 Portal de Cliente (módulo 8) — nota de arquitectura

Es el único caso donde "afuera de la app interna" es literal: acceso externo sin cuenta de empleado. Arquitectura recomendada cuando se aborde: **no** reutilizar el sistema de `perfiles`/roles internos; usar un token/link único por proyecto (ya sugerido en `docs/especificacion/08-portal-cliente.md`) validado por una API Route que arma una vista de solo lectura — evita mezclar RLS de usuarios internos con acceso de clientes externos. Reutiliza los mismos visores de `src/components/archivos/`.

---

## 5. Mapa de integración de repos seleccionados (`REPOSITORIOS_GITHUB.md`)

| Herramienta | Veredicto | Cómo se integra | Dónde vive el código | Cuándo |
|---|---|---|---|---|
| **PowerSync** | ✅ adoptar | SDK cliente (`@powersync/web`), réplica lógica de Postgres | `src/lib/powersync.js`, lazy | Fase 8 |
| **model-viewer** | ✅ adoptar | Web component, `<script type="module">` lazy | `src/components/archivos/ModelViewer3D.jsx` | Módulo 7 |
| **pdf.js** | ✅ adoptar | Lazy + worker propio | `src/components/archivos/VisorPDF.jsx` | Módulo 7 |
| **Pannellum** | ✅ adoptar | Lazy, librería pequeña | `src/components/archivos/Recorrido360.jsx` | Módulo 7/8 |
| **Chatwoot** | 🔜 opcional, baja prioridad | Self-host separado (VPS), widget embebido + webhook en `api/` | `src/components/integraciones/ChatwootWidget.jsx` + `api/webhooks/chatwoot.js` (futuro) | Después de Fase 9, no bloquea nada del core |
| **fabric.js / Excalidraw / Satori** | 📖 diferido | Sin módulo activo que las necesite aún (Portal/Canva no priorizado) | N/A todavía | Se define punto de entrada cuando se retome módulo 8 |
| **OpenProject** | ❌ descartado | — | — | Proyectos se construye 100% custom (ya tiene lógica de rentabilidad/GBA que OpenProject no modela) |
| **Zulip** | ❌ descartado por ahora | — | — | Sobredimensionado para el tamaño del equipo; revaluar solo si se pide chat interno explícito |

Nota de seguridad de integración (ya señalada por el revisor): Chatwoot vive en su propia base de datos, **fuera** de Supabase — no hereda RLS. Cualquier dato que cruce hacia/desde Supabase debe pasar por una API Route con validación Zod, nunca acceso directo de Chatwoot a Postgres de Supabase.

---

## 6. Hallazgos de arquitectura

### CRÍTICOS (2)
- [ ] Sidebar sin filtro de permisos — `src/components/UI/Sidebar.jsx` renderiza todos los departamentos/módulos a cualquier sesión autenticada, sin `usePermission()`. Solución: implementar RBAC (Fase 2) antes de dar acceso a más de un rol real.
- [ ] Auth basada en `localStorage` con credenciales hardcodeadas — `src/lib/dbAuth.js` (ya identificado en sesión previa). Bloquea cualquier despliegue real fuera del equipo actual. Solución: Fase 2 del plan de migración.

### ALTOS (2)
- [ ] Sin code-splitting por vista — `src/App.jsx` importa las ~17 páginas de forma eager. No rompe nada hoy (bundle pequeño), pero bloquea integrar model-viewer/pdf.js (módulo 7) sin inflar el bundle inicial. Solución: `React.lazy` + `Suspense` por entrada de `views` (sección 4.1), antes de instalar cualquier librería pesada.
- [ ] `activeView` no valida permisos al montar `Page` — incluso si se filtra la Sidebar, nada impide forzar una vista sin acceso vía estado. Solución: guard en `App.jsx`, no solo en el menú.

### MEDIOS (1)
- [ ] `departments.js` no tiene metadato de permisos — hay que decidir la forma (`permisoRequerido: 'tesoreria.leer'`) antes de escribir la migración de `permisos` (Fase 2), para que el seed SQL y el frontend usen las mismas claves.

### BAJOS (0)
Ninguno relevante en esta pasada.

---

## 7. Recomendaciones priorizadas

1. Cerrar Fase 2 (Auth + `perfiles` + RBAC) — desbloquea los dos hallazgos CRÍTICOS a la vez.
2. Al cerrar Fase 2, aplicar de una vez el `React.lazy`/`Suspense` en `App.jsx` (hallazgo ALTO) — es un cambio pequeño y evita tener que volver a tocar ese archivo más adelante para el módulo 7.
3. Definir la forma exacta de `permisoRequerido` en `departments.js` junto con la matriz de `docs/especificacion/10-autenticacion-rbac.md` (documento aún no escrito — prerrequisito de la migración 002, señalado también en el plan de migración).
4. No instalar ninguna librería de la sección 5 marcada "diferido" u "opcional" todavía — mantiene el bundle limpio hasta que el módulo correspondiente esté priorizado.

## Próximo paso sugerido

Escribir `docs/especificacion/10-autenticacion-rbac.md` (roles reales del equipo × 9 módulos × acción) y generar la migración `002_perfiles_rbac.sql` con `/ada-sql` — es el único documento que falta antes de poder sembrar RBAC en SQL.
