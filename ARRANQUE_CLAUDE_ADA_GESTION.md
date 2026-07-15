# Manual de Arranque — Claude Code para "ADA Gestión"
### Firma de Arquitectura y Diseño de Interiores · Alejandra Durán Agudelo

> **Propósito de este documento.** Es el único archivo que necesitas para que Claude Code
> arranque este proyecto **desde cero en cualquier dispositivo**, sin acceso a la conversación
> ni al proyecto de Casinos La Riviera. Contiene: el contexto del negocio, las decisiones
> técnicas ya tomadas, y **cómo configurar Claude correctamente** (CLAUDE.md, skills, hooks,
> agentes, memoria, integraciones Vercel?Supabase) para sostener un proyecto de esta magnitud.
>
> Está escrito como **transferencia de conocimiento**: replica el método probado en La Riviera
> (una app empresarial de 15 módulos en producción) adaptado a esta empresa nueva.
>
> **Versión:** 1.0 — 13/07/2026. Actualizar al cierre de cada sesión importante.

---

## 0. CÓMO USAR ESTE DOCUMENTO (léelo primero)

### Si eres una persona
Copia este archivo (y su compañero `REPOSITORIOS_GITHUB.md`) al dispositivo nuevo. Abre Claude Code
en la carpeta del proyecto y pega el prompt de la sección 0.1 como primer mensaje.

### 0.1 — Primer prompt a pegar en el dispositivo nuevo
```
Vas a arrancar el proyecto "ADA Gestión" (app de gestión para una firma de arquitectura
y diseño de interiores). Lee completo el archivo ARRANQUE_CLAUDE_ADA_GESTION.md en esta
carpeta — es tu manual de configuración y contexto. Luego:
1. Confírmame qué entendiste del proyecto y en qué punto está.
2. Pregúntame por cualquier novedad o cambio antes de tocar nada.
3. Propón el plan de la primera sesión según la sección 9 del manual.
NO escribas código todavía. Primero contexto y acuerdo.
```

### 0.2 — Regla de oro para Claude (obligatoria)
Al iniciar CUALQUIER sesión de este proyecto:
1. Leer este documento y `PROYECTO_CONTEXTO.md` (cuando exista).
2. Ubicarse en la sección "Próxima Sesión — Continuar Aquí".
3. **Preguntar al usuario si hay novedades ANTES de proceder.**
Al cerrar sesión con cambios: actualizar `PROYECTO_CONTEXTO.md` + commit + push.

---

## 1. QUÉ ES ESTE PROYECTO (contexto de negocio)

**Empresa:** Firma pequeña de arquitectura y diseño de interiores en Colombia.
**Dueña / cliente interno:** Alejandra Durán Agudelo (hermana del usuario, Santiago).
**Tamaño:** ~5–15 personas, trabajan **por proyectos**, en varias PCs, y **en obra** (sin señal).
**Meta:** una **app 360 interna** que centralice la operación y reemplace/integre las herramientas
sueltas que usan hoy.

**Herramientas actuales (SaaS) y qué hacemos con cada una:**

| Herramienta | Decisión |
|---|---|
| Asana | **Reemplazar** con módulo propio (Proyectos) — offline-first |
| Slack | **Reemplazar** con Zulip o Mattermost (self-host), integrado por API |
| WhatsApp | **Potenciar** con Chatwoot + Meta Cloud API oficial (atención a clientes) |
| Canva | **Sustituir gradualmente**: editor propio (fabric.js) + Excalidraw + Satori |
| SketchUp, AutoCAD, D5 Render | **NO reemplazar** — integrar sus salidas (3D/planos/renders) al navegador |

El catálogo completo de repos evaluados (con licencias verificadas) está en el archivo compañero
**`REPOSITORIOS_GITHUB.md`**. Léelo cuando toque decidir una integración.

### 1.1 — Hallazgo clave del prototipo existente (ajusta el foco)
La dueña ya hizo un prototipo (ver sección 2). Reveló que **el corazón del negocio NO es gestión de
proyectos tipo Asana — es TESORERÍA y control financiero de obra**: contratistas, pagos, impuestos,
cuentas por cobrar/pagar, flujo de caja en varias cuentas (Banco, Efectivo, Nequi). Por eso el
**primer módulo de la app 360 es Tesorería**, no un clon de Asana.

---

## 2. EL PROTOTIPO EXISTENTE (analizado el 13/07/2026)

**URL:** https://ada-gestion-223db.web.app (Firebase Hosting).

**Qué es:** un prototipo funcional de **una sola página HTML** (~232 KB, ~2.500 líneas de
JavaScript puro, sin framework) sobre **Firebase** (Firestore + Firebase Auth).

**Módulos que ya diseñó (usar como ESPECIFICACIÓN, reconstruir sobre el stack nuevo):**
Resumen · Equipo · Proyectos · Bitácora · Visitas · Tesorería · GBA · Contratistas · Categorías ·
Configuración. Incluye: calendario de impuestos, flujo de caja en 3 cuentas, estados de cuenta de
contratistas, nómina, cuentas por cobrar/pagar.

**Por qué NO se construye encima de este prototipo (decisión firme):**
1. **Modelo de datos roto:** guarda cada "tabla" como **un documento gigante con todo el arreglo en
   JSON** (`doc(key).set({ value: JSON.stringify(value) })`). Firestore tiene tope de 1 MB/documento;
   dos personas editando se pisan (sin control de concurrencia); no se puede filtrar/paginar en servidor.
2. **Backend equivocado para nuestro plan:** está en Firebase; todo lo decidido (Supabase/PostgreSQL,
   PowerSync para offline, playbook Riviera, RLS/RBAC) es sobre **Supabase**. No mezclar dos backends.
3. **Sin framework** — 2.500 líneas de JS a mano no escalan a 10 módulos multiusuario.
4. **Sin modo offline** (`enablePersistence` ausente) — justo el requisito crítico.

**Qué SÍ se rescata:** el diseño de pantallas, campos, flujos financieros y vocabulario del negocio.
Es el mejor documento de requisitos posible. **Verificación pendiente:** revisar las Firestore Rules
(si no están configuradas, los datos están expuestos a cualquiera con el link — riesgo real).

---

## 3. ARQUITECTURA TÉCNICA DECIDIDA

### 3.1 — Stack oficial (heredado de La Riviera, probado en producción)
| Capa | Tecnología |
|---|---|
| Frontend | React 19 · Vite 6 · Tailwind 3.4.x |
| Estado | Zustand 5 |
| UI | Lucide React (iconos) · Recharts (gráficos) · Sonner (notificaciones) · GSAP (animaciones) |
| Formularios | React Hook Form + Zod |
| Base de datos | **Supabase** (PostgreSQL) |
| Deploy | **Vercel** (auto-deploy de `main`) |
| API serverless | Vercel API Routes (`api/*.js`) |
| **Offline** | **PowerSync** (SQLite local ? Postgres Supabase) |
| IA (si aplica) | Anthropic SDK (Claude) — modelo económico por defecto |

### 3.2 — El requisito offline (define la arquitectura)
Los empleados deben poder trabajar **en obra sin señal**: actualizar avances, tareas, fotos, notas;
y al reconectar, sincronizar para que todos vean los cambios. Esto obliga a **local-first**:
- La app lee/escribe siempre contra una **copia local** (SQLite en el dispositivo) ? funciona sin señal.
- **PowerSync** empuja/trae cambios contra Supabase al reconectar, con cola de escritura y reintentos.
- Resolución de conflictos para equipo pequeño: **last-write-wins por campo** + bitácora de quién
  cambió qué (audit trail, igual que en Riviera).
- **Alcance realista:** solo el **módulo de campo** (avances, checklists, fotos, notas) necesita
  offline. Tesorería avanzada, portal de cliente y reportes pueden ser online-only al inicio.

**Motor:** PowerSync (partner oficial de Supabase). Licencia del servicio FSL (no restringe uso
interno); SDKs Apache/MIT. Plan B: ElectricSQL (Apache puro, pero solo sync de lectura) o RxDB.

### 3.3 — El truco que hace segura la construcción "front primero"
**TODO el acceso a datos vive en UNA carpeta** (`src/lib/db*.js`, patrón `dbCaja.js` de Riviera).
Hoy esas funciones devuelven datos falsos (mock); mañana devuelven datos de Supabase/PowerSync.
Cambiar de mock a real = tocar **esa carpeta**, no las 50 pantallas. Esto permite construir todo el
frontend rápido sin quedar atrapados si el modelo de datos cambia.

---

## 4. CONFIGURACIÓN DE CLAUDE CODE DESDE CERO

> Esta es la parte de "cómo construir Claude adecuadamente". Replica la configuración de La Riviera.
> Todo lo de esta sección se hace **una vez**, al montar el proyecto en un dispositivo nuevo.

### 4.1 — Entorno del dispositivo
Requisitos: **Node.js 20+**, **git**, un editor (VS Code con la extensión de Claude Code), y
**Claude Code** instalado y logueado.

**?? REGLA CRÍTICA — NO poner el repo en OneDrive/Drive/Dropbox.** En La Riviera el repo quedó dentro
de OneDrive y eso sincronizó `.env` con llaves secretas a la nube de Microsoft, más `.git/` y
`node_modules/` (decenas de miles de archivos). `.gitignore` NO protege contra la nube.
**Ubicación correcta:** `C:\dev\ada-gestion` (o `~/dev/ada-gestion` en Mac/Linux). Fuera de cualquier
carpeta sincronizada.

### 4.2 — Estructura de carpetas del proyecto
```
ada-gestion/
?? CLAUDE.md                      # instrucciones permanentes (sección 4.3)
?? PROYECTO_CONTEXTO.md           # registro vivo — leer al inicio, actualizar al cierre
?? ARRANQUE_CLAUDE_ADA_GESTION.md # este documento (copiarlo aquí)
?? REPOSITORIOS_GITHUB.md         # catálogo de repos/integraciones
?? .env                           # llaves — NUNCA se commitea, NUNCA en OneDrive
?? .env.example                   # plantilla sin valores reales (sí se commitea)
?? .gitignore                     # incluir: .env, node_modules, dist, .vercel
?? .claude/
?   ?? settings.json              # hooks, permisos, modelo (sección 4.4)
?   ?? skills/                    # skills del proyecto (sección 4.5)
?? docs/
?   ?? especificacion/            # 1 doc por módulo: pantallas, flujos, campos, conexiones
?   ?? modelo-datos/              # entidades, relaciones, esquema SQL
?? supabase/
?   ?? migration_fase*.sql        # migraciones numeradas en orden
?? api/                           # Vercel API Routes (operaciones server-side)
?? src/
    ?? lib/                       # CAPA DE DATOS ÚNICA (mock hoy, Supabase mañana)
    ?? components/UI/             # Button, Skeleton, Modal, chips (sistema de diseño)
    ?? pages/                     # un folder por módulo
    ?? store/                     # Zustand
    ?? hooks/                     # usePermission, etc.
    ?? data/                      # roles/permisos (RBAC)
```

### 4.3 — CLAUDE.md (plantilla completa)
Crear `CLAUDE.md` en la raíz con este contenido (adaptado de Riviera):

```markdown
# ADA Gestión — App de gestión para firma de arquitectura/diseño de interiores

## AL INICIAR SESIÓN (obligatorio)
1. Leer ARRANQUE_CLAUDE_ADA_GESTION.md y PROYECTO_CONTEXTO.md
2. Ubicarse en "Próxima Sesión — Continuar Aquí"
3. Preguntar al usuario si hay novedades antes de proceder

## AL CERRAR SESIÓN (obligatorio)
Actualizar PROYECTO_CONTEXTO.md con los cambios + git commit + push

## Stack (no cambiar sin evaluación)
React 19 · Vite 6 · Tailwind 3.4 · Zustand 5 · Supabase · PowerSync (offline) · Vercel · Anthropic SDK

## Metodología (sección 6 del manual de arranque)
- FRONT PRIMERO, pero el modelo de datos se diseña EN PARALELO (no después)
- TODO acceso a datos en src/lib/db*.js — mock hoy, Supabase mañana. Nunca fetch directo en componentes.
- Rebanada vertical primero (Tesorería end-to-end) antes de abrir todos los módulos en abanico

## Reglas de código (heredadas de Riviera)
1. Código completo — nunca esqueletos con // TODO ni catch vacío
2. Responsive desde el primer commit (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3)
3. Error handling real: toast.error() + logError() — nunca console.log(e) solo
4. Skeleton loaders, no spinners genéricos
5. Sonner para notificaciones — nunca alert()/confirm() nativos
6. SELECT específico de columnas — nunca .select('*') en producción
7. Una migración SQL por feature, numerada: migration_faseN_nombre.sql
8. Sistema de botones: componente <Button> o constantes btn.* — nunca clases inline a mano

## Seguridad (no negociable — sección 8)
- RLS activo en TODAS las tablas de Supabase — nunca crear tabla sin políticas
- Operaciones de dinero = RPCs atómicas con SELECT FOR UPDATE NOWAIT + audit trail
- SUPABASE_SERVICE_ROLE_KEY y ANTHROPIC_API_KEY solo en API Routes, NUNCA en el frontend
- Validación Zod en todos los inputs de API Routes
- tenant_id como 2ª columna de toda tabla nueva (SaaS-ready): DEFAULT 'ada'

## RBAC (contrato para cada módulo nuevo)
- Registrar el módulo en el registry de permisos
- Migración SQL sembrando permisos por rol
- usePermission() en el componente — nunca role === 'admin' hardcodeado
- Guard SinAcceso al inicio + filtrar tabs por permiso

## Convivencia con Ponytail (si el plugin está activo)
Ponytail (modo full) fuerza la solución más simple que funciona. NUNCA recorta lo pedido
explícitamente aquí (RBAC, RLS, offline, seguridad, error handling). SÍ muerde en: reusar
helpers antes de escribir nuevos, cero dependencias npm sin evaluar, diffs mínimos.
```

### 4.4 — settings.json (hooks, permisos, modelo)
Crear `.claude/settings.json`. Estructura mínima recomendada (las claves reales que usa La Riviera son:
`env`, `permissions`, `model`, `hooks`, `enabledPlugins`, `effortLevel`, `statusLine`):

```jsonc
{
  "model": "claude-sonnet-5",          // económico y capaz. NO usar Fable 5 (caro, prohibido por costo)
  "permissions": {
    "allow": [
      "Bash(npm run:*)", "Bash(npm install:*)", "Bash(npm list:*)",
      "Bash(git status:*)", "Bash(git add:*)", "Bash(git commit:*)", "Bash(git push:*)",
      "Read(//c/Users/**)", "WebFetch(domain:raw.githubusercontent.com)"
    ]
  },
  "hooks": {
    "SessionStart": [
      { "matcher": "startup", "hooks": [
        { "type": "command", "command": "echo 'ADA Gestión — recuerda leer PROYECTO_CONTEXTO.md'" }
      ]}
    ]
  }
}
```

**Sobre los hooks** (automatizaciones que ejecuta el harness, no Claude):
- **SessionStart** ? recordatorio/briefing de inicio (en Riviera imprime un banner y datos del proyecto).
- **UserPromptSubmit** ? inyecta contexto según el prompt (en Riviera sugiere skills y activa
  "completitud" cuando el prompt tiene varias solicitudes). Empezar **sin** estos; agregarlos cuando
  el proyecto crezca — un hook mal hecho estorba más que ayuda.
- **PreToolUse** ? guardias antes de editar archivos sensibles (en Riviera, el guard de caja).
- **Stop** ? acciones al terminar el turno.
**Recomendación de arranque:** empezar con settings.json MÍNIMO (modelo + permisos + 1 recordatorio).
No copiar los 34 KB de hooks de Riviera — la mayoría son específicos de ese proyecto (caja, Kassius,
MCP de código). Agregar hooks propios solo cuando resuelvan un dolor real y repetido.

### 4.5 — Skills (qué son, formato, cuáles crear)
Un **skill** es una carpeta con un `SKILL.md` (o un archivo `.md` suelto) con este frontmatter:
```markdown
---
name: ada-sql
description: >
  Genera migraciones SQL numeradas para ADA Gestión: RLS, índices,
  RPCs atómicas para tesorería, y marca lo pendiente en PROYECTO_CONTEXTO.md.
---
# Contenido del skill: instrucciones detalladas que Claude sigue al invocarlo
```
Se guardan en `.claude/skills/<nombre>/SKILL.md`. Se invocan con `Skill("nombre")` o el usuario
escribe `/nombre`.

**Skills a crear (adaptar los de Riviera, no inventar de cero):**
| Skill | Para qué | Prioridad |
|---|---|---|
| `ada-session-start` | Briefing de inicio: lee contexto, git log, pendientes | Alta |
| `ada-context-sync` | Cierre de sesión: actualiza PROYECTO_CONTEXTO + commit + push | Alta |
| `ada-sql` | Migraciones numeradas con RLS + tenant_id + RPCs atómicas | Alta |
| `ada-scaffold` | Genera módulo/página con todos los patrones (responsive, RBAC, error handling) | Media |
| `ada-rbac` | Aplica el contrato RBAC completo a un módulo | Media |
| `ada-deploy` | Pipeline: build ? SQL pendiente ? commit ? push ? monitor Vercel | Media |
| Agent Team: `ada-arquitecto` ? `ada-revisor` ? `ada-optimizador` | Diseñar módulos nuevos (>2 tablas) antes de codificar | Media |

**Cómo adaptarlos:** copiar el `SKILL.md` equivalente de Riviera
(`turnos-app/.claude/skills/riviera-*`) y reemplazar: nombre del proyecto, casinos?nada, reglas de
tesorería en vez de caja, tema visual propio. **No arrancar con los 30 skills de Riviera** — empezar
con `ada-session-start`, `ada-context-sync` y `ada-sql`; agregar el resto cuando el módulo lo pida.

### 4.6 — Sistema de memoria persistente
Claude Code guarda memoria en `~/.claude/projects/<hash-del-proyecto>/memory/`. Cada memoria es un
archivo con frontmatter (`name`, `description`, `type: user|feedback|project|reference`) + un índice
`MEMORY.md` (una línea por memoria). Sirve para recordar entre sesiones: preferencias del usuario,
decisiones de negocio no obvias, deuda técnica. **Cada proyecto tiene su propia carpeta de memoria** —
la de ADA será independiente de la de Riviera automáticamente (distinto hash de ruta).

### 4.7 — Documento de contexto vivo (PROYECTO_CONTEXTO.md)
El registro que se lee al inicio y se actualiza al cierre de cada sesión. Estructura mínima:
```markdown
# ADA Gestión — Contexto del Proyecto
**Actualizado:** <fecha> — <resumen de la última sesión en 1 línea>
**Versión app:** v0.x.0

## 1. Estado general
## 2. Módulos (estado: ?? diseño / ?? en progreso / ? producción)
## 3. Modelo de datos (link a docs/modelo-datos/)
## 4. Migraciones SQL (aplicadas / ? pendientes de ejecutar en Supabase)
## 5. Deuda técnica (P1 crítico / P2 / P3)
## 9. Próxima Sesión — Continuar Aquí   ? lo primero que se lee
```
**Convención:** marcar SQL pendiente de ejecutar con `?` para que el briefing lo detecte.

### 4.8 — Agent Team (diseño antes de codificar)
Para módulos nuevos de >2 tablas/componentes, lanzar en secuencia: **arquitecto** (diseña
componentes/tablas/RPCs/flujo) ? **revisor** (critica contra los patrones del proyecto, detecta
duplicación) ? **optimizador** (comprime al MVP mínimo). Esto evita construir de más. En Claude Code
se hace con el `Task`/`Agent` tool lanzando subagentes, o con skills dedicados.

---

## 5. INTEGRACIONES: SUPABASE + VERCEL + POWERSYNC

### 5.1 — Supabase (una vez)
1. Crear un **proyecto Supabase nuevo** (separado 100% de cualquier otro). Región cercana a Colombia.
2. Guardar en `.env` local (NUNCA commitear):
   ```
   VITE_SUPABASE_URL=...            # ok en frontend
   VITE_SUPABASE_ANON_KEY=...       # ok en frontend (RLS protege)
   SUPABASE_SERVICE_ROLE_KEY=...    # SOLO en Vercel API Routes / server
   ```
3. Poner los mismos valores (sin los `VITE_` privados) también en **Vercel ? Settings ? Environment
   Variables**. `SERVICE_ROLE_KEY` va solo en Vercel (server), nunca con prefijo `VITE_`.
4. Migraciones SQL: se ejecutan en Supabase ? SQL Editor ? New query ? Run. Numeradas en orden.

### 5.2 — Vercel (una vez)
1. Conectar el repo de GitHub a un **proyecto Vercel nuevo**. Auto-deploy de la rama `main`.
2. Framework preset: Vite. Build: `npm run build`. Output: `dist`.
3. Variables de entorno (paso 5.1.3). Redeploy tras cambiarlas.
4. `api/*.js` se despliegan como funciones serverless automáticamente.
5. Dominio: configurar CNAME cuando la empresa tenga uno (ej. `app.` de su dominio).

### 5.3 — PowerSync (para el módulo offline)
1. Crear proyecto en PowerSync Cloud (plan Free) o self-host "Open Edition" (Docker).
2. Conectar PowerSync al Postgres de Supabase (guía oficial: docs.powersync.com/integrations/supabase).
   Requiere activar **logical replication** en Supabase (Supabase ya lo expone).
3. Definir **sync rules**: qué tablas y qué filas ve cada usuario (por proyecto/rol) en su copia local.
4. En el frontend: SDK de PowerSync (`@powersync/web`) + adaptador. La capa `src/lib/db*.js` habla con
   PowerSync (local) y este sincroniza con Supabase. **Empezar SOLO por el módulo de campo.**

### 5.4 — GitHub
Repo privado nuevo. Commit + push tras cada cambio significativo (regla heredada de Riviera).
`.gitignore` debe incluir: `.env`, `node_modules/`, `dist/`, `.vercel/`.

---

## 6. METODOLOGÍA DE CONSTRUCCIÓN (el "cómo")

**Front primero — SÍ, pero con el modelo de datos en paralelo.** Secuencia acordada:

1. **Especificación** (`docs/especificacion/`): 1 doc por módulo con pantallas, flujos, campos y
   conexiones. Fuente: el prototipo de la hermana (sección 2).
2. **Modelo de datos** (`docs/modelo-datos/`): entidades, campos, relaciones. **En el mismo paso que
   la especificación** — cada pantalla implica datos. Es barato y se revisa antes de codear.
   ?? NO repetir el error del prototipo ("un JSON gigante"): **una fila por registro**, relaciones
   con claves foráneas.
3. **Rebanada vertical: Tesorería** de punta a punta — front + capa de datos + Supabase + offline.
   Prueba que la fundación aguanta antes de abrir todo en abanico.
4. **Front del resto de módulos** contra la capa de datos (mock), con el modelo ya validado.
5. **Backend de infraestructura** (RLS, RBAC, RPCs de dinero, PowerSync en todos) sobre modelo probado.

**El riesgo a evitar:** el "big bang" — construir los 10 módulos completos con datos falsos antes de
conectar ni uno a Supabase real. Mitigación: la rebanada vertical del paso 3.

---

## 7. MÓDULOS A CONSTRUIR (mapa prototipo ? app 360)

Orden por prioridad (Tesorería primero, según reveló el prototipo):

| # | Módulo | Qué hace | Offline | Notas |
|---|---|---|---|---|
| 1 | **Tesorería** | Flujo de caja multi-cuenta (Banco/Efectivo/Nequi), ingresos/egresos, cuentas por cobrar/pagar | Parcial | Corazón del negocio. Dinero = RPCs atómicas + audit trail |
| 2 | **Contratistas** | Estados de cuenta, pagos, saldos | No | Ligado a Tesorería |
| 3 | **Proyectos** | Proyectos con cliente/presupuesto/etapas (reemplaza Asana) | Sí | Módulo de campo = offline-first con PowerSync |
| 4 | **Bitácora / Visitas** | Registro de obra: avances, checklists, fotos, notas | **Sí (crítico)** | El caso de uso "en obra sin señal" |
| 5 | **Equipo / Nómina** | Empleados, pagos de nómina | No | |
| 6 | **Impuestos / Calendario** | Calendario de obligaciones tributarias | No | react-big-calendar |
| 7 | **Archivos por proyecto** | Ver modelos 3D (glTF), planos (PDF), renders, 360 | No | model-viewer + pdf.js + Pannellum |
| 8 | **Portal de cliente** | El cliente ve avances/renders/3D y aprueba | No | Diferencial competitivo |
| 9 | Categorías / Configuración | Catálogos, ajustes, roles | No | |

---

## 8. SEGURIDAD NO NEGOCIABLE (heredado de Riviera)

- **RLS activo en TODAS las tablas.** Nunca crear una tabla sin sus políticas.
  (Ojo bug recurrente: `FOR ALL USING(true)` sin `WITH CHECK(true)` bloquea INSERT en PG15 —
  siempre agregar ambos.)
- **Operaciones de dinero = RPCs atómicas** con `SELECT ... FOR UPDATE NOWAIT`, en una sola
  transacción, con manejo de `lock_not_available`. Tesorería/Contratistas dependen de esto.
- **Audit trail** de movimientos financieros: tabla solo-INSERT, sin DELETE.
- **Llaves secretas** (`SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`) SOLO en API Routes server-side.
  Nunca en el frontend, nunca con prefijo `VITE_`.
- **Validación Zod** en todo input de API Route.
- **Endpoints de IA con autenticación** (si se usan): exigir sesión válida, no dejarlos abiertos
  (lección Riviera: un endpoint de IA abierto = cualquiera gasta tus créditos con curl).
- **tenant_id** en toda tabla nueva (`DEFAULT 'ada'`) — deja la puerta abierta a multi-empresa sin
  reescribir después.
- **Firestore del prototipo:** revisar/asegurar sus reglas o migrar los datos y apagarlo.

---

## 9. EL PRIMER DÍA — CHECKLIST EJECUTABLE

Cuando el usuario apruebe arrancar, en orden:

- [ ] 1. Crear carpeta `C:\dev\ada-gestion` (FUERA de OneDrive) + `git init` + repo privado en GitHub.
- [ ] 2. Copiar aquí este manual + `REPOSITORIOS_GITHUB.md`.
- [ ] 3. Scaffold Vite + React + Tailwind + Zustand (`npm create vite@latest`, preset React).
- [ ] 4. Crear `CLAUDE.md` (sección 4.3), `.claude/settings.json` mínimo (4.4), `.gitignore`, `.env.example`.
- [ ] 5. Crear proyecto Supabase nuevo + proyecto Vercel nuevo (sección 5). Guardar `.env` local.
- [ ] 6. Crear `PROYECTO_CONTEXTO.md` (4.7) con la sección 9 "Próxima Sesión".
- [ ] 7. Crear skills `ada-session-start`, `ada-context-sync`, `ada-sql` (adaptados de Riviera).
- [ ] 8. **Primer entregable real:** `docs/especificacion/` — documentar los 10 módulos del prototipo
       + `docs/modelo-datos/` — entidades y relaciones. **Esto se revisa con el usuario antes de codear.**
- [ ] 9. Rebanada vertical de **Tesorería** (front + capa de datos + Supabase). Sin offline todavía.
- [ ] 10. Integrar PowerSync en el módulo de campo (Bitácora/Visitas).

**El primer commit debe ser la especificación, no código.**

---

## 10. REGLAS DE COSTO Y MODELO

- **NO usar Claude Fable 5** para este proyecto — es caro y está marcado como prohibido por presupuesto
  en el entorno del usuario. (Nota: el `settings.json` global del dispositivo actual tiene
  `"model": "claude-fable-5[1m]"` — cambiarlo con `/model` a un modelo económico como Sonnet 5 antes
  de trabajar en ADA.)
- La construcción de esta app **no necesita el modelo más caro** — necesita el método correcto (este
  documento). Sonnet 5 es capaz y económico para el 95% del trabajo.
- Higiene de sesión: `/clear` entre tareas distintas; no cargar documentos que la sesión no toca;
  briefing de inicio que lea solo lo necesario (no el contexto completo cada vez).
- Los subagentes de investigación (evaluar un repo, auditar un módulo) son baratos y valen la pena;
  úsalos en paralelo.

---

## APÉNDICE — Diferencias clave con La Riviera (para no copiar de más)

| La Riviera | ADA Gestión |
|---|---|
| 5 casinos + CORP, IDs canónicos | Sin casinos — quitar toda esa lógica |
| Sin offline (100% Vercel+Supabase) | **Offline-first (PowerSync)** — infra nueva |
| Sin VPS | Necesita 1 VPS Docker (~US$20-40/mes) para Chatwoot/Zulip |
| 17 roles del organigrama | Roles simples (dueña, diseñador, contador, obra) |
| Tema "Corporate Light" propio | Definir tema propio de la firma (su identidad visual) |
| Módulo caja (denominaciones, arqueos) | Módulo tesorería (cuentas, contratistas, impuestos) |
| Coljuegos (regulador) | Sin regulador especial (DIAN/impuestos normales) |
| 30 skills | Empezar con 3, crecer bajo demanda |

**No transplantar mecánicamente.** Copiar el MÉTODO (arquitectura, seguridad, RBAC, capa de datos,
disciplina de contexto), no el contenido específico del casino.

---
*Documento de arranque — ADA Gestión. Escrito el 13/07/2026 con el conocimiento del setup de
Casinos La Riviera. Mantener actualizado.*

