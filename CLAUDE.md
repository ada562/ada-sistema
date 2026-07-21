# ADA Gestion — App de gestion 360 para firma de arquitectura/diseno de interiores

## AL INICIAR SESION (obligatorio)
1. Leer PROYECTO_CONTEXTO.md — seccion "Proxima Sesion"
2. Ejecutar `git log --oneline -10` para contexto reciente
3. Los hooks automaticos verifican migraciones pendientes
4. Preguntar al usuario si hay novedades antes de proceder

## AL CERRAR SESION (obligatorio)
Actualizar PROYECTO_CONTEXTO.md con los cambios + git commit + push

---

## Stack (no cambiar sin evaluacion)
| Capa | Tecnologia |
|------|-----------|
| Frontend | React 19 + Vite 6 + Tailwind CSS v4 |
| Estado | Zustand 5 |
| Backend | Supabase (Postgres + Auth + Storage + Realtime) |
| Offline | PowerSync (futuro) |
| Deploy | Vercel (auto-deploy desde main) |
| Dominio | app.adainteriors.co (Hostinger DNS) |
| AI | Anthropic SDK (Claude) |

## Metodologia
- **FRONT PRIMERO**, pero el modelo de datos se disena EN PARALELO (no despues)
- **TODO** acceso a datos en `src/lib/db*.js` — mock hoy, Supabase manana. Nunca fetch directo en componentes
- **Rebanada vertical** primero (un modulo end-to-end) antes de abrir todos los modulos en abanico
- **localStorage** actual con patron `load(key, fallback)` / `save(key, data)` via `src/lib/storage.js`

---

## Equipo de Agentes AI

### Comandos disponibles (slash commands)

| Comando | Agente | Funcion | Cuando se activa automaticamente |
|---------|--------|---------|--------------------------------|
| `/ada-architect` | Arquitecto | Estructura, patrones, escalabilidad, modelo de datos | Al crear nuevo modulo/pagina |
| `/ada-reviewer` | Revisor | Calidad de codigo, convenciones, bugs, consistencia | Al hacer commit con >3 archivos |
| `/ada-optimizer` | Optimizador | Bundle size, renders, carga, memoria | Al hacer build |
| `/ada-security` | Seguridad | Auth, RLS, OWASP, datos sensibles, XSS | Al modificar archivos de auth/seguridad |
| `/ada-qa` | QA | Funcionalidad, edge cases, flujos, validaciones | Al modificar formularios/modales |
| `/ada-docs` | Documentador | Modulos, API, modelo de datos, changelog | Al hacer push sin docs |
| `/ada-deploy` | DevOps | Build, deploy, env vars, rollback | Al push a main |
| `/ada-sql` | DBA | Migraciones SQL, validacion, documentacion | Al escribir .sql en migrations/ |
| `/ada-sql-status` | DBA | Actualizar estado de migraciones | Manual |
| `/ada-session-start` | Sesion | Briefing inicio de sesion | Manual |
| `/ada-context-sync` | Sesion | Cierre de sesion, sync contexto | Manual |

### Hooks automaticos (se ejecutan solos)

Los hooks viven en `hooks/` y se configuran en `.claude/settings.json`.
No requieren intervencion manual — alertan cuando detectan situaciones relevantes:

| Hook | Evento | Que detecta |
|------|--------|-------------|
| `migration-check-session` | Inicio sesion | Migraciones pendientes de ejecutar o documentar |
| `migration-post-write` | Write/Edit .sql | Archivo SQL sin documentar en MIGRATIONS.md |
| `migration-validator` | Bash supabase | Comandos de migracion sin verificacion previa |
| `agent-architect-on-new-module` | Write pagina/db | Nuevo modulo que necesita revision arquitectonica |
| `agent-reviewer-on-commit` | git commit | Commit grande (>3 archivos) sin revision |
| `agent-security-on-auth` | Write/Edit auth | Cambio en archivo critico de seguridad |
| `agent-optimizer-on-build` | npm run build | Build que necesita analisis de tamano |
| `agent-qa-on-crud` | Write/Edit form | Formulario modificado que necesita pruebas |
| `agent-docs-on-feature` | git push | Push sin documentacion en docs/ |
| `agent-deploy-on-push` | git push main | Deploy automatico — verificar en 2 min |

---

## Reglas de codigo (no negociables)

1. **Codigo completo** — nunca esqueletos con `// TODO` ni catch vacio
2. **Responsive** desde el primer commit (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
3. **Error handling real** — toast con Sonner, nunca `console.log(e)` solo, nunca `alert()`/`confirm()` nativos
4. **Skeleton loaders**, no spinners genericos
5. **SELECT especifico** de columnas — nunca `.select('*')` en produccion
6. **Una migracion SQL por feature**, numerada: `NNN_nombre.sql` en `supabase/migrations/`
7. **Sistema de botones**: componente `<Button>` o constantes — nunca clases inline sueltas
8. **Formateo colombiano**: moneda COP, fechas DD/MM/YYYY, usar `formatters.js`
9. **localStorage via storage.js** — nunca `getItem`/`setItem` directo en componentes

## Seguridad (no negociable)

- **RLS activo** en TODAS las tablas de Supabase — nunca crear tabla sin politicas
- **Operaciones de dinero** = RPCs atomicas con `SELECT FOR UPDATE NOWAIT` + audit trail
- **SUPABASE_SERVICE_ROLE_KEY** solo en API Routes, NUNCA en el frontend
- **Validacion Zod** en todos los inputs de API Routes
- **tenant_id** como 2da columna de toda tabla nueva: `DEFAULT 'ada'` (SaaS-ready)
- **Credenciales** nunca en codigo fuente — siempre `.env` (excluido de git)

## RBAC (contrato para cada modulo nuevo)

1. Registrar el modulo en el registry de permisos
2. Migracion SQL sembrando permisos por rol
3. `usePermission()` en el componente — nunca `role === 'admin'` hardcodeado
4. Guard `SinAcceso` al inicio + filtrar tabs por permiso

---

## Estructura de carpetas

```
src/
  lib/            → CAPA DE DATOS UNICA (mock hoy, Supabase manana)
    storage.js    → load() / save() para localStorage
    db*.js        → un archivo por entidad
    formatters.js → formato COP, fechas, etc.
    supabase.js   → cliente Supabase
  components/
    UI/           → Button, Skeleton, Modal, Sidebar, Layout
    <modulo>/     → componentes especificos del modulo
  pages/
    <modulo>/     → una carpeta por departamento
  store/          → Zustand stores
  hooks/          → usePermission, custom hooks
  data/           → departments.js, roles/permisos

hooks/              → Scripts de hooks automaticos (bash)
supabase/
  migrations/       → SQL numerados (NNN_nombre.sql)
  MIGRATIONS.md     → Registro historico de migraciones
docs/
  auditorias/       → Reportes de arquitecto, revisor, seguridad, QA
  modulos/          → Documentacion por modulo
  modelo-datos.md   → Diagrama de entidades
.claude/
  skills/           → Definiciones de agentes AI
  settings.json     → Configuracion de hooks y permisos
api/                → Vercel API Routes (futuro)
```

## Flujo de trabajo recomendado

```
1. /ada-session-start          → ver estado y pendientes
2. Desarrollar feature          → hooks alertan automaticamente
3. /ada-reviewer               → revisar calidad antes de commit
4. git commit + push            → hooks de deploy alertan
5. /ada-deploy status           → verificar deploy
6. /ada-context-sync            → cerrar sesion y sincronizar
```

## Auditorias periodicas (cada 2 semanas minimo)

```
/ada-architect                 → estructura y escalabilidad
/ada-security                  → vulnerabilidades
/ada-optimizer                 → rendimiento
/ada-qa                        → funcionalidad y edge cases
/ada-docs estado               → documentacion actualizada
```
