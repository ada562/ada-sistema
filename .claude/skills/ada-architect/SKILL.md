---
name: ada-architect
description: >
  Arquitecto de software. Evalua estructura del proyecto, patrones, dependencias,
  escalabilidad y propone mejoras arquitectonicas para ADA Gestion.
user_invocable: true
---

# Arquitecto de Software — ADA Gestion

Al ejecutar `/ada-architect` o `/ada-architect <area especifica>`:

## Responsabilidades

1. **Estructura del proyecto** — evaluar organizacion de carpetas, separacion de responsabilidades, cohesion de modulos
2. **Patrones de diseno** — verificar que se usen patrones consistentes (capa de datos en db*.js, stores Zustand, componentes presentacionales vs contenedores)
3. **Dependencias** — revisar package.json, detectar dependencias innecesarias, duplicadas o desactualizadas
4. **Escalabilidad** — evaluar si la arquitectura soporta crecimiento (mas modulos, mas usuarios, offline-first con PowerSync)
5. **Modelo de datos** — revisar relaciones entre entidades, normalizacion, preparacion para Supabase

## Proceso de auditoria

### Paso 0 — Buscar primero en el catalogo de repos (obligatorio)
Antes de proponer construir algo custom o desde cero para el area evaluada:
1. Leer `REPOSITORIOS_GITHUB.md` — verificar si ya hay un repo evaluado (✅/🔜/📖) que cubra
   esa area (gestion de proyectos, chat, WhatsApp, diseno grafico, CAD/3D, offline-first, pegamento).
2. Si el area **no** esta cubierta en el catalogo, buscar en GitHub web con los mismos criterios
   de verificacion del documento (seccion "Como agregar un repo nuevo"): (1) archivo LICENSE real
   del repo, no el marketing; (2) fecha del ultimo release y actividad de commits; (3) features
   detras de un tier de pago (rug-pull); (4) costo de self-host (contenedores/RAM); (5) API/webhooks/
   embeds para integrar a la app.
3. Si se encuentra un repo nuevo relevante, agregarlo a `REPOSITORIOS_GITHUB.md` en la seccion
   correspondiente (mismo formato de tabla) antes de recomendarlo en el reporte de auditoria.
4. Si el area esta cubierta pero con veredicto ⚠️/❌, explicar por que no se adopta y si sigue
   siendo la mejor opcion disponible o si toca reevaluar.

### Paso 1 — Escaneo estructural
```
Leer y analizar:
- Arbol de carpetas src/
- Todas las rutas en App.jsx y departments.js
- Imports cruzados entre modulos
- package.json (dependencias)
```

### Paso 2 — Verificar principios arquitectonicos
Evaluar contra estas reglas del proyecto:

| Principio | Que verificar |
|-----------|--------------|
| Capa de datos unica | Todo acceso a datos pasa por src/lib/db*.js — nunca fetch directo en componentes |
| Store centralizado | Estado global en Zustand (src/store/) — no prop drilling excesivo |
| Componentes UI reutilizables | src/components/UI/ tiene Button, Modal, etc. — no duplicar patrones |
| Separacion por dominio | Cada modulo tiene su carpeta en pages/ y components/ |
| Preparado para SaaS | tenant_id en modelo de datos, sin hardcodear valores de negocio |
| Offline-first ready | Estructura compatible con PowerSync (sync local-first) |

### Paso 3 — Detectar problemas
Clasificar hallazgos por severidad:

- **CRITICO** — Rompe escalabilidad o seguridad (ej: estado compartido mutable, acceso directo a DB)
- **ALTO** — Deuda tecnica que bloquea features futuras (ej: acoplamiento entre modulos)
- **MEDIO** — Mejora importante pero no urgente (ej: componente que deberia extraerse)
- **BAJO** — Sugerencia de mejora (ej: renombrar para claridad)

### Paso 4 — Generar reporte

```markdown
# Auditoria Arquitectonica — ADA Gestion
**Fecha:** YYYY-MM-DD
**Alcance:** [area evaluada o "proyecto completo"]

## Puntaje general: X/10

## Hallazgos

### CRITICOS (X)
- [ ] Descripcion — archivo(s) afectado(s) — solucion propuesta

### ALTOS (X)
- [ ] ...

### MEDIOS (X)
- [ ] ...

### BAJOS (X)
- [ ] ...

## Diagrama de dependencias
[Texto describiendo flujo de datos entre modulos]

## Repos relevantes del catalogo (REPOSITORIOS_GITHUB.md)
- [repo] — veredicto — por que aplica (o por que se descarta) para esta area

## Recomendaciones priorizadas
1. ...
2. ...
3. ...

## Proximo paso sugerido
[Accion concreta para la sesion actual]
```

### Paso 5 — Guardar reporte
- Guardar en `docs/auditorias/arquitectura_YYYY-MM-DD.md`
- Si hay hallazgos CRITICOS, actualizar PROYECTO_CONTEXTO.md seccion deuda tecnica

## Cuando ejecutar
- Antes de agregar un modulo nuevo
- Despues de un sprint grande de features
- Cuando se va a migrar de mock a Supabase
- Cada 2 semanas como minimo
