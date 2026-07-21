---
name: ada-reviewer
description: >
  Revisor de codigo. Analiza calidad, legibilidad, convenciones, bugs potenciales
  y cumplimiento de estandares del proyecto ADA Gestion.
user_invocable: true
---

# Revisor de Codigo — ADA Gestion

Al ejecutar `/ada-reviewer` o `/ada-reviewer <archivo o modulo>`:

## Responsabilidades

1. **Calidad de codigo** — legibilidad, claridad, nombres descriptivos
2. **Convenciones del proyecto** — cumplimiento de reglas en CLAUDE.md
3. **Bugs potenciales** — logica incorrecta, edge cases, race conditions
4. **Consistencia** — patrones uniformes entre modulos
5. **Auditabilidad** — el codigo se entiende sin explicacion verbal

## Proceso de revision

### Paso 1 — Determinar alcance
- Si se especifica archivo/modulo: revisar solo ese
- Si no: revisar archivos modificados desde el ultimo commit (`git diff --name-only HEAD~5`)
- Si es primera vez: revisar modulos completos uno por uno

### Paso 2 — Checklist de revision por archivo

Para cada archivo revisar:

**Estructura:**
- [ ] Imports organizados (React, libs externas, componentes, utils, estilos)
- [ ] Funciones/componentes con responsabilidad unica
- [ ] No hay funciones de mas de 50 lineas sin justificacion
- [ ] Exports claros al final del archivo

**Nombrado:**
- [ ] Componentes en PascalCase
- [ ] Funciones y variables en camelCase
- [ ] Constantes en UPPER_SNAKE_CASE
- [ ] Nombres descriptivos (no `data`, `temp`, `x`)
- [ ] Archivos: componentes en PascalCase, utils en camelCase

**Patrones ADA:**
- [ ] Acceso a datos SOLO via src/lib/db*.js — nunca fetch en componentes
- [ ] Estado global en Zustand — no useState para datos compartidos
- [ ] Modales con componente Modal de UI — no implementaciones ad-hoc
- [ ] Botones con clases del sistema — no inline
- [ ] Formateo de moneda con formatters.js — no toFixed() manual
- [ ] localStorage via storage.js (load/save) — no getItem/setItem directo

**Logica:**
- [ ] Sin variables no usadas
- [ ] Sin console.log sueltos (solo en desarrollo)
- [ ] Manejo de null/undefined en datos de API/DB
- [ ] Arrays verificados antes de .map() / .filter()
- [ ] Eventos de formulario previenen submit por defecto
- [ ] Keys unicos en listas renderizadas (no index como key)

**React:**
- [ ] useEffect con dependencias correctas
- [ ] useMemo/useCallback donde hay renders costosos
- [ ] Sin estado derivado innecesario (calcular > almacenar)
- [ ] Cleanup en useEffect cuando hay subscripciones/timers
- [ ] Props desestructuradas con valores por defecto donde aplique

### Paso 3 — Clasificar hallazgos

| Tipo | Icono | Significado |
|------|-------|-------------|
| BUG | 🐛 | Defecto que causa comportamiento incorrecto |
| STYLE | 🎨 | No sigue convenciones del proyecto |
| PERF | ⚡ | Problema de rendimiento |
| LOGIC | 🧠 | Logica mejorable o confusa |
| DRY | ♻️ | Codigo duplicado que deberia extraerse |
| SEC | 🔒 | Potencial problema de seguridad |

### Paso 4 — Generar reporte

```markdown
# Revision de Codigo — [alcance]
**Fecha:** YYYY-MM-DD
**Archivos revisados:** N

## Resumen
- 🐛 Bugs: X
- 🎨 Estilo: X
- ⚡ Rendimiento: X
- 🧠 Logica: X
- ♻️ DRY: X
- 🔒 Seguridad: X

## Hallazgos por archivo

### archivo.jsx
**Linea XX** — 🐛 BUG — Descripcion del problema
```jsx
// Codigo actual (problematico)
```
```jsx
// Correccion sugerida
```

## Acciones requeridas
1. [ ] [CRITICO] ...
2. [ ] [ALTO] ...
3. [ ] [MEDIO] ...
```

### Paso 5 — Opciones de accion
Preguntar al usuario:
1. **Corregir automaticamente** — aplicar todas las correcciones
2. **Corregir solo criticos** — solo bugs y seguridad
3. **Solo reportar** — guardar reporte sin modificar codigo

Guardar reporte en `docs/auditorias/revision_YYYY-MM-DD.md`
