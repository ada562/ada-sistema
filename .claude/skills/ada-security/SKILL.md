---
name: ada-security
description: >
  Agente de seguridad. Audita autenticacion, autorizacion, RLS, XSS, inyeccion,
  datos sensibles y cumplimiento de politicas de seguridad de ADA Gestion.
user_invocable: true
---

# Seguridad — ADA Gestion

Al ejecutar `/ada-security` o `/ada-security <area>`:

## Responsabilidades

1. **Autenticacion** — login, sesiones, tokens, logout
2. **Autorizacion** — RBAC, permisos, guards de ruta
3. **Datos sensibles** — claves, tokens, PII en codigo/logs
4. **Supabase RLS** — politicas en todas las tablas, sin bypass
5. **Input validation** — XSS, inyeccion SQL, sanitizacion
6. **OWASP Top 10** — cobertura general

## Proceso de auditoria

### Paso 1 — Autenticacion y sesiones

| Verificacion | Estado |
|-------------|--------|
| Login con credenciales seguras | |
| Sesion expira despues de inactividad | |
| Token almacenado de forma segura | |
| Logout limpia toda la sesion | |
| No hay credenciales hardcodeadas en codigo | |
| Proteccion contra fuerza bruta (rate limit) | |
| Password no viaja en texto plano | |

Revisar archivos:
- `src/lib/dbAuth.js` — logica de autenticacion
- `src/pages/Login.jsx` — formulario
- `src/App.jsx` — guard de autenticacion

### Paso 2 — Autorizacion y RBAC

| Verificacion | Estado |
|-------------|--------|
| Permisos definidos por rol | |
| usePermission() en componentes protegidos | |
| No hay role === 'admin' hardcodeado | |
| Rutas protegidas con guard | |
| API Routes validan permisos del lado servidor | |
| No se puede escalar privilegios desde el frontend | |

Revisar archivos:
- `src/data/departments.js` — modulos y permisos
- `src/hooks/` — hooks de permisos
- `src/store/` — stores con datos sensibles

### Paso 3 — Datos sensibles

Buscar en TODO el proyecto:
```
Patrones a detectar:
- Claves API en texto plano (SUPABASE_KEY, API_KEY, SECRET)
- Passwords en codigo fuente
- Datos sensibles en localStorage sin encriptar
- console.log con datos de usuario/pago
- .env archivos commiteados en git
- Tokens en URLs (query strings)
```

Verificar .gitignore incluye:
- [ ] `.env` / `.env.local` / `.env.production`
- [ ] `node_modules/`
- [ ] Archivos con credenciales

### Paso 4 — Supabase RLS (cuando aplique)

Para cada tabla en migraciones SQL:
- [ ] RLS habilitado (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] Politica SELECT con USING
- [ ] Politica INSERT con WITH CHECK
- [ ] Politica UPDATE con USING + WITH CHECK
- [ ] Politica DELETE con USING
- [ ] tenant_id filtrado en todas las politicas
- [ ] No hay politicas permisivas (true) en produccion

### Paso 5 — Input validation

| Superficie | Que verificar |
|-----------|---------------|
| Formularios | Validacion antes de enviar, tipos correctos, limites |
| URLs/rutas | No inyeccion en parametros de ruta |
| Datos de API | Validacion Zod en API Routes |
| Renders | No `dangerouslySetInnerHTML` sin sanitizar |
| SQL | Queries parametrizadas, no concatenacion de strings |

### Paso 6 — OWASP Top 10 adaptado a la app

1. **Broken Access Control** — RLS + RBAC + guards
2. **Cryptographic Failures** — datos sensibles encriptados
3. **Injection** — SQL parametrizado, no eval()
4. **Insecure Design** — separacion frontend/backend
5. **Security Misconfiguration** — headers, CORS, .env
6. **Vulnerable Components** — npm audit, dependencias actualizadas
7. **Auth Failures** — sesiones seguras
8. **Data Integrity** — RPCs atomicas para dinero
9. **Logging Failures** — audit trail en operaciones criticas
10. **SSRF** — no fetch a URLs del usuario sin validar

### Paso 7 — Generar reporte

```markdown
# Auditoria de Seguridad — ADA Gestion
**Fecha:** YYYY-MM-DD
**Nivel de riesgo general:** CRITICO | ALTO | MEDIO | BAJO

## Vulnerabilidades encontradas

### CRITICAS (requieren accion inmediata)
1. [ ] ...

### ALTAS (resolver antes de produccion)
1. [ ] ...

### MEDIAS (resolver en proximo sprint)
1. [ ] ...

### BAJAS (mejoras sugeridas)
1. [ ] ...

## Estado de cumplimiento
- Autenticacion: ✅/⚠️/❌
- Autorizacion RBAC: ✅/⚠️/❌
- RLS Supabase: ✅/⚠️/❌
- Datos sensibles: ✅/⚠️/❌
- Input validation: ✅/⚠️/❌
- OWASP Top 10: X/10

## Plan de remediacion
[Acciones priorizadas]
```

Guardar en `docs/auditorias/seguridad_YYYY-MM-DD.md`

## REGLAS NO NEGOCIABLES
- Credenciales NUNCA en frontend — solo API Routes
- RLS en TODAS las tablas — sin excepcion
- Operaciones de dinero = RPC atomica + audit trail
- Validacion Zod en toda entrada de API
- npm audit clean antes de cada deploy a produccion
