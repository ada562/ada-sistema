# ADA Gestión — App de gestión para firma de arquitectura/diseño de interiores

## AL INICIAR SESIÓN (obligatorio)
1. Leer ARRANQUE_CLAUDE_ADA_GESTION.md y PROYECTO_CONTEXTO.md
2. Ubicarse en "Próxima Sesión — Continuar Aquí"
3. Preguntar al usuario si hay novedades antes de proceder

## AL CERRAR SESIÓN (obligatorio)
Actualizar PROYECTO_CONTEXTO.md con los cambios + git commit + push

## Stack (no cambiar sin evaluación)
React 19 — Vite 6 — Tailwind — Zustand 5 — Supabase — PowerSync (offline) — Vercel — Anthropic SDK

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

## Estructura de carpetas
```
src/lib/          → CAPA DE DATOS ÚNICA (mock hoy, Supabase mañana)
src/components/UI → Button, Skeleton, Modal (sistema de diseño)
src/pages/        → un folder por módulo
src/store/        → Zustand
src/hooks/        → usePermission, etc.
src/data/         → roles/permisos (RBAC)
docs/             → especificación y modelo de datos
supabase/         → migraciones SQL
api/              → Vercel API Routes
```
