---
name: ada-optimizer
description: >
  Optimizador de rendimiento. Analiza bundle size, renders, carga, memoria
  y propone optimizaciones concretas para ADA Gestion.
user_invocable: true
---

# Optimizador de Rendimiento — ADA Gestion

Al ejecutar `/ada-optimizer` o `/ada-optimizer <area>`:

## Responsabilidades

1. **Bundle size** — imports innecesarios, tree-shaking, code splitting
2. **Renders** — re-renders innecesarios, memoizacion, keys
3. **Carga inicial** — lazy loading, suspense, skeleton loaders
4. **Memoria** — leaks, listeners sin cleanup, closures retenidas
5. **Datos** — queries eficientes, cache, paginacion

## Proceso de optimizacion

### Paso 1 — Analisis de bundle
```bash
# Verificar tamano del build
npm run build
# Analizar output
```
- Identificar las 5 dependencias mas pesadas
- Detectar imports completos que deberian ser parciales (ej: `import _ from 'lodash'` vs `import debounce from 'lodash/debounce'`)
- Verificar que iconos se importen individualmente (`import { X } from 'lucide-react'`)

### Paso 2 — Analisis de renders
Para cada pagina/componente principal:

| Verificacion | Como detectar |
|-------------|---------------|
| Re-renders por props | Buscar objetos/arrays creados inline en JSX (`style={{}}`, `onClick={() => fn(x)}`) |
| Estado innecesario | useState que podria ser variable derivada |
| Context excesivo | Context que cambia frecuentemente y afecta muchos componentes |
| Zustand selectores | Verificar que stores usen selectores granulares, no `useStore()` completo |
| Listas sin keys estables | Buscar `.map((item, index) => <X key={index}>` — usar id |

### Paso 3 — Analisis de carga
- [ ] Rutas con lazy loading (React.lazy + Suspense)
- [ ] Imagenes optimizadas (formatos, tamanos, lazy load)
- [ ] Fuentes optimizadas (preload, display swap)
- [ ] CSS purgado (Tailwind purge configurado)
- [ ] localStorage: datos no excesivamente grandes

### Paso 4 — Analisis de memoria
- [ ] useEffect con cleanup (removeEventListener, clearInterval, abort controllers)
- [ ] Subscripciones a stores desconectadas en unmount
- [ ] No guardar refs a elementos DOM desmontados
- [ ] Closures en timers no retienen estado stale

### Paso 5 — Preparacion para Supabase/PowerSync
- [ ] Queries con SELECT especifico (no select *)
- [ ] Paginacion en listas largas (proyectos, movimientos)
- [ ] Indices previstos para queries frecuentes
- [ ] Cache strategy definida para datos que cambian poco (categorias, settings)

### Paso 6 — Generar reporte

```markdown
# Optimizacion de Rendimiento — ADA Gestion
**Fecha:** YYYY-MM-DD

## Metricas actuales
- Build size: XX KB (gzip)
- Dependencias: XX
- Componentes: XX
- Paginas: XX

## Oportunidades de mejora

### Alto impacto
1. [ ] Descripcion — ahorro estimado — complejidad

### Medio impacto
1. [ ] ...

### Bajo impacto (nice-to-have)
1. [ ] ...

## Plan de implementacion
[Orden sugerido de optimizaciones]
```

Guardar en `docs/auditorias/optimizacion_YYYY-MM-DD.md`

## Reglas
- No optimizar prematuramente — solo cuando hay problema medible
- Preferir solucion simple sobre compleja (useMemo no siempre es mejor)
- Medir antes y despues de cada cambio
