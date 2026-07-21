---
name: ada-qa
description: >
  QA y Testing. Verifica funcionalidad, edge cases, flujos de usuario,
  validaciones y genera plan de pruebas para ADA Gestion.
user_invocable: true
---

# QA y Testing — ADA Gestion

Al ejecutar `/ada-qa` o `/ada-qa <modulo>`:

## Responsabilidades

1. **Funcionalidad** — cada feature hace lo que debe
2. **Edge cases** — datos vacios, nulos, extremos, caracteres especiales
3. **Flujos de usuario** — navegacion completa, happy path + errores
4. **Validaciones** — formularios, inputs, limites
5. **Regresiones** — cambios nuevos no rompen lo existente
6. **Datos** — integridad, persistencia, sincronizacion entre modulos

## Proceso de QA

### Paso 1 — Inventario de funcionalidades
Listar todas las funcionalidades del modulo bajo prueba:

```markdown
## Modulo: [nombre]
| # | Funcionalidad | Tipo | Estado |
|---|--------------|------|--------|
| 1 | Crear registro | CRUD | ⬜ |
| 2 | Editar registro | CRUD | ⬜ |
| 3 | Eliminar registro | CRUD | ⬜ |
| 4 | Filtrar lista | UI | ⬜ |
| 5 | ... | ... | ⬜ |
```

### Paso 2 — Casos de prueba por funcionalidad

Para cada funcionalidad, verificar:

**Happy path:**
- [ ] Funciona con datos validos normales
- [ ] Resultado correcto visible en la UI
- [ ] Datos persisten despues de refrescar pagina
- [ ] Notificacion de exito mostrada

**Datos limite:**
- [ ] Campos vacios — muestra error de validacion
- [ ] Texto muy largo (>500 chars)
- [ ] Numeros negativos en campos de dinero
- [ ] Numeros con decimales excesivos
- [ ] Fechas en el pasado / futuro lejano
- [ ] Caracteres especiales (ñ, tildes, emojis)

**Errores:**
- [ ] Submit doble (click rapido)
- [ ] Conexion lenta / sin internet
- [ ] Datos corruptos en localStorage
- [ ] Sesion expirada

**Integracion entre modulos:**
- [ ] Pago de contratista se refleja en Tesoreria
- [ ] Pago de nomina se refleja en Tesoreria
- [ ] Visita nueva aparece en el proyecto correcto
- [ ] Bitacora se asocia al proyecto correcto
- [ ] Saldos se recalculan al agregar/editar/eliminar

### Paso 3 — Prueba de navegacion

- [ ] Todas las rutas del sidebar funcionan
- [ ] Breadcrumbs correctos
- [ ] Back button del navegador no rompe la app
- [ ] Login redirect funciona
- [ ] Logout limpia y vuelve a login
- [ ] Responsive: funciona en mobile (< 768px)

### Paso 4 — Prueba de datos

- [ ] localStorage se guarda correctamente (inspeccionar DevTools > Application)
- [ ] Datos no se duplican al refrescar
- [ ] IDs son unicos
- [ ] Fechas en formato consistente
- [ ] Montos con formato colombiano correcto ($1.234.567)

### Paso 5 — Generar reporte

```markdown
# Reporte QA — [modulo]
**Fecha:** YYYY-MM-DD
**Version:** vX.X.X

## Resumen
- Total casos: XX
- Pasaron: XX (✅)
- Fallaron: XX (❌)
- No aplican: XX (➖)
- Cobertura: XX%

## Casos fallidos (detalle)
| # | Caso | Resultado esperado | Resultado actual | Severidad |
|---|------|-------------------|-----------------|-----------|
| 1 | ... | ... | ... | CRITICO/ALTO/MEDIO/BAJO |

## Bugs reportados
1. [ ] [BUG-001] Descripcion — pasos para reproducir — severidad

## Recomendaciones
- ...
```

Guardar en `docs/auditorias/qa_YYYY-MM-DD_[modulo].md`
