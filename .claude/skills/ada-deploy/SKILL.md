---
name: ada-deploy
description: >
  DevOps y despliegue. Gestiona builds, deploy a Vercel, variables de entorno,
  verificacion post-deploy y rollback para ADA Gestion.
user_invocable: true
---

# DevOps y Despliegue — ADA Gestion

Al ejecutar `/ada-deploy` o `/ada-deploy <accion>`:

## Acciones disponibles

### 1. `/ada-deploy check` — Pre-deploy checklist

Ejecutar antes de cada deploy:

```bash
# 1. Build limpio
npm run build

# 2. Verificar errores
# (analizar output del build)

# 3. Auditoria de seguridad
npm audit

# 4. Verificar .gitignore
# (.env, node_modules, dist/)

# 5. Git status limpio
git status
```

Checklist:
- [ ] Build exitoso sin warnings criticos
- [ ] No hay console.log sueltos en produccion
- [ ] Variables de entorno configuradas en Vercel
- [ ] .env NO esta en el repositorio
- [ ] Todas las migraciones SQL ejecutadas
- [ ] Ultimo commit pusheado

### 2. `/ada-deploy production` — Deploy a produccion

1. Verificar rama actual (debe ser `main`)
2. Ejecutar pre-deploy check
3. Push a main (Vercel auto-deploy)
4. Verificar deployment en Vercel dashboard
5. Probar URL de produccion (app.adainteriors.co)

### 3. `/ada-deploy status` — Estado del deploy

1. Verificar ultimo commit en GitHub
2. Verificar status del deploy en Vercel
3. Verificar que la URL de produccion responde
4. Reportar estado

### 4. `/ada-deploy env` — Variables de entorno

Listar variables necesarias por ambiente:

| Variable | Local (.env) | Vercel | Requerida |
|----------|-------------|--------|-----------|
| VITE_SUPABASE_URL | ✅ | ✅ | Si |
| VITE_SUPABASE_ANON_KEY | ✅ | ✅ | Si |
| SUPABASE_SERVICE_ROLE_KEY | ❌ (solo API) | ✅ | Si (API Routes) |

**REGLA:** Variables con `VITE_` son publicas (visibles en el frontend).
Variables sin `VITE_` son privadas (solo API Routes).

### 5. `/ada-deploy rollback` — Revertir deploy

1. Identificar ultimo deploy estable
2. Guiar al usuario para revertir en Vercel dashboard
3. O hacer git revert del commit problematico

## Verificacion post-deploy

Despues de cada deploy exitoso, verificar:
- [ ] Login funciona
- [ ] Navegacion entre modulos
- [ ] CRUD basico en al menos un modulo
- [ ] Datos persisten (localStorage en produccion, Supabase cuando migre)
- [ ] Logo visible
- [ ] Sin errores en consola del navegador

## Reporte

```markdown
# Deploy Report — YYYY-MM-DD HH:MM
**Ambiente:** Produccion
**URL:** app.adainteriors.co
**Commit:** [hash] — [mensaje]
**Estado:** ✅ Exitoso | ❌ Fallido

## Verificacion post-deploy
- Login: ✅/❌
- Navegacion: ✅/❌
- CRUD: ✅/❌
- Datos: ✅/❌

## Notas
[observaciones]
```
