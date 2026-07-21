---
name: ada-docs
description: >
  Documentacion tecnica. Genera y mantiene documentacion de modulos, API,
  modelo de datos, changelog y guias de desarrollo para ADA Gestion.
user_invocable: true
---

# Documentacion Tecnica — ADA Gestion

Al ejecutar `/ada-docs` o `/ada-docs <tipo>`:

## Tipos de documentacion

### 1. `/ada-docs modulo <nombre>`
Genera documentacion completa de un modulo:

```markdown
# Modulo: [Nombre]

## Proposito
Que hace este modulo y por que existe.

## Archivos
| Archivo | Tipo | Descripcion |
|---------|------|-------------|
| pages/modulo/Page.jsx | Pagina | Vista principal |
| components/modulo/Form.jsx | Componente | Formulario CRUD |
| lib/dbModulo.js | Datos | Capa de acceso a datos |

## Modelo de datos
| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| id | string | Si | Identificador unico |
| ... | ... | ... | ... |

## Funciones principales
- `getAll()` — Retorna todos los registros
- `add(data)` — Crea nuevo registro
- `update(id, data)` — Actualiza registro
- `remove(id)` — Elimina registro

## Flujos de usuario
1. Usuario abre el modulo → ve lista
2. Click "Nuevo" → modal con formulario
3. Llena datos → click "Guardar"
4. Registro aparece en la lista

## Integraciones
- Se conecta con: [otros modulos]
- Afecta: [saldos, reportes, etc.]

## Capturas
[Descripcion de la UI principal]
```

Guardar en `docs/modulos/[nombre].md`

### 2. `/ada-docs api`
Documenta todas las funciones de la capa de datos:

Para cada archivo `src/lib/db*.js`:
```markdown
## dbModulo.js

### getAll()
- **Retorna:** Array de objetos
- **localStorage key:** `ada_key`
- **Formato:** [esquema]

### add(data)
- **Parametros:** { campo1, campo2 }
- **Retorna:** objeto creado con id
- **Side effects:** actualiza localStorage, crea movimiento en Tesoreria (si aplica)
```

Guardar en `docs/api-reference.md`

### 3. `/ada-docs modelo`
Genera diagrama del modelo de datos completo:

```markdown
# Modelo de Datos — ADA Gestion

## Entidades

### Proyectos
- id, nombre, cliente, estado, presupuesto, visitPackage
- Relaciones: tiene muchas Visitas, Bitacoras, Servicios, Pagos

### Empleados
- id, nombre, cargo, salarioLegal, salarioNoConstitutivo
- Relaciones: tiene muchos PagosNomina

[... todas las entidades]

## Diagrama de relaciones
Proyecto 1--* Visita
Proyecto 1--* Bitacora
Proyecto 1--* Servicio
Empleado 1--* PagoNomina
Contratista 1--* PagoContratista
```

Guardar en `docs/modelo-datos.md`

### 4. `/ada-docs changelog`
Genera/actualiza el changelog:

```markdown
# Changelog — ADA Gestion

## [v0.X.X] — YYYY-MM-DD

### Agregado
- Modulo X con funcionalidad Y

### Cambiado
- Mejora en Z

### Corregido
- Bug en W
```

Guardar/actualizar `CHANGELOG.md`

### 5. `/ada-docs estado`
Genera reporte del estado actual completo del proyecto:

- Modulos implementados vs pendientes
- Funcionalidades por modulo
- Deuda tecnica
- Metricas (archivos, lineas, componentes)

Guardar en `docs/estado-proyecto_YYYY-MM-DD.md`
