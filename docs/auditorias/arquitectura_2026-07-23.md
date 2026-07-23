# Auditoria Arquitectonica — ADA Gestion
**Fecha:** 2026-07-23
**Alcance:** Portal de empleado (Mi Bitacora, Tareas + reportes de avance, Permisos de ausencia) y su conexion con el lado admin/gerencia (Bitacoras.jsx, Bitacora CEO)

## Puntaje general: 8/10

El modulo cumple el patron de capa de datos unica, tiene RLS hermetico (sin huecos entre empleados) y reutiliza bien componentes compartidos (`BitacoraSemanaGrid`). Los puntos que bajan el puntaje son de **escalabilidad de fetch** (no de seguridad) y una **duplicacion de logica de parseo** que puede desincronizarse silenciosamente.

## Archivos revisados
- `src/pages/proyectos/MiBitacora.jsx`, `src/pages/proyectos/Bitacoras.jsx`, `src/components/proyectos/BitacoraSemanaGrid.jsx`
- `src/pages/proyectos/Tareas.jsx`, `src/lib/dbTareas.js`, `src/lib/dbTareaReportes.js`, `src/store/useTareasStore.js`, `src/store/useTareaReportesStore.js`
- `src/pages/rrhh/Permisos.jsx`, `src/lib/dbPermisosAusencia.js`
- `src/lib/dbTimelogs.js`, `src/store/useTimelogsStore.js`, `src/lib/dbAuth.js`, `src/store/useAuthStore.js`, `src/hooks/usePermission.js`
- `api/admin/set-empleado-password.js`, `src/data/departments.js`
- Migraciones `013, 014, 022, 024, 025, 026` (RLS de `registro_horas`, `tareas`, `acceso_diario`, `permisos_ausencia`, `tarea_reportes`)

## Hallazgos

### CRITICOS (0)
Ninguno. No hay fetch directo a Supabase en paginas/componentes fuera de `src/lib/db*.js`, y no se encontro ningun hueco de RLS que permita a un empleado leer o escribir datos de otro empleado.

### ALTOS (2)

- [ ] **Fetch-all sin ventana temporal en `tareas` y `tarea_reportes`** — `src/lib/dbTareas.js:16-24` (`getTareas()`) y `src/lib/dbTareaReportes.js:24-32` (`getTareaReportes()`) traen **todas** las filas del tenant (todos los empleados, toda la historia) en cada `fetchAll()`. Esto se dispara: al montar `Tareas.jsx`, y de nuevo por Realtime cada vez que **cualquier** empleado crea/edita/borra una tarea o sube un reporte (`useTareasStore.js:41-51`, `useTareaReportesStore.js:33-44` escuchan el canal completo sin filtro por empleado y llaman `fetchAll()` entero). `tarea_reportes` es la tabla que mas crece (metadata de foto/audio/video por cada avance, sin borrado automatico), asi que sera la primera en volverse pesada al crecer el equipo o la antiguedad de los datos. Filtrar el propio empleado no ayuda aqui porque el problema es del lado admin (ve todo) y del propio realtime (retriggerea a todos los que tengan la pagina abierta.
  - **Solucion propuesta:** para `tareas`, filtrar por rango de mes visible (`fecha >= inicio_mes AND fecha <= fin_mes`) en vez de traer toda la tabla; para `tarea_reportes`, cargar solo bajo demanda por `tarea_id` (al abrir `DetalleTareaModal`) en vez de precargar todo el historial de reportes de toda la empresa. Esto tambien reduce el payload de Realtime.

- [ ] **`registro_horas` para el lado admin (`Bitacoras.jsx`) trae toda la historia sin paginar** — mismo patron que arriba mediante `useTimelogsStore`. No es nuevo de este modulo (ya existia), pero como el portal de empleado ahora alimenta esa misma tabla desde mas fuentes (Mi Bitacora + Permisos que autocompleta via RPC), el volumen de filas crece mas rapido que antes.
  - **Solucion propuesta:** cuando se aborde la Fase de "mas usuarios" del roadmap, paginar por semana/mes en la vista admin en vez de traer todo el historial completo al store.

### MEDIOS (2)

- [ ] **Logica de parseo de "Permiso" duplicada y ligeramente distinta** — `BitacoraSemanaGrid.jsx:36-42` define `PERMISO_NOTE_REGEX = /^\[Permiso:(Salud|Personal)\]\s?(.*)$/` + `parsePermisoNote()` + `buildPermisoNote()` (usados para **escribir**); `Bitacoras.jsx:21-27` redefine su propio `PERMISO_NOTE_REGEX = /^\[Permiso:(Salud|Personal)\]/` (sin capturar la descripcion) solo para **leer/etiquetar** (`labelSinProyecto()`). Hoy no rompe nada porque uno es subset del otro, pero si el formato de la nota cambia en un lugar (por ejemplo, se agrega un tercer motivo o se cambia el separador) hay que acordarse de tocar los dos archivos — y no hay ningun tipo de test que lo detecte.
  - **Solucion propuesta:** mover `PERMISO_NOTE_REGEX`, `isPermisoNote`, `parsePermisoNote`, `buildPermisoNote` a un archivo compartido, por ejemplo `src/lib/bitacoraHelpers.js`, e importarlo desde ambos lugares.

- [ ] **Convencion de nombres mezclada ingles/espanol en la capa de datos del portal** — `dbTimelogs.js` usa `addTimelog/updateTimelog/deleteTimelog` (ingles); `dbTareas.js` usa `addTarea/toggleTarea/deleteTarea` (mixto); `dbPermisosAusencia.js` y `dbTareaReportes.js` usan `crearSolicitudPermiso/resolverPermisoAusencia/crearTareaReporte/eliminarTareaReporte` (espanol). No es un bug, pero dificulta que alguien nuevo (o vos mismo en 6 meses) adivine el nombre de una funcion sin abrir el archivo.
  - **Solucion propuesta:** al tocar estos archivos por otra razon, alinear a una sola convencion (sugerido: espanol, ya que la mayoria del dominio — "tarea", "permiso", "bitacora" — ya esta en espanol en el resto del proyecto).

### BAJOS (2)

- [ ] **`useVisitasStore` abre dos suscripciones Realtime separadas** (`visitas` y `visita_asistentes`) que disparan `fetchAll()` cada una de forma independiente — funciona bien pero podria colapsarse en un solo `.subscribe()` con dos `.on()` para evitar doble refetch cuando ambos cambian casi al mismo tiempo (ej: crear una visita con asistentes).
- [ ] **`fn_registrar_acceso_diario()` se llama directo con `supabase.rpc(...)` dentro de `useAuthStore.js:39`**, sin pasar por un `src/lib/db*.js`. Es aceptable porque el RPC no retorna datos y es idempotente, pero por consistencia con el resto del proyecto (donde toda llamada a Supabase vive en `lib/db*.js`) valdria la pena envolverlo en una funcion de una linea en `dbAuth.js` o un nuevo `dbAccesoDiario.js`.

## RLS — estado (sin huecos detectados)

| Tabla | Empleado | Admin/RRHH | Mecanismo destacado |
|---|---|---|---|
| `registro_horas` | solo propio + semana actual (bloqueo de semanas pasadas) | todo, sin bloqueo temporal | RLS + validacion tambien en frontend |
| `tareas` | solo propio, sin limite de fecha (agenda libre) | todo | separacion intencional vs `registro_horas` |
| `tarea_reportes` | solo propio (crear/leer/borrar) | solo lectura (sin crear/borrar) | policy de Storage bucket ademas de la tabla |
| `permisos_ausencia` | crear (min. 15 dias de anticipacion), sin UPDATE (revocado a nivel de grant) | aprobar/rechazar solo via RPC `fn_resolver_permiso_ausencia()` | RPC SECURITY DEFINER autocompleta `registro_horas` |
| `acceso_diario` | sin INSERT directo | lectura completa | unico INSERT posible es via RPC `fn_registrar_acceso_diario()` |

Ninguna de estas tablas permite a un empleado leer o escribir el registro de otro. El diseño de "revocar UPDATE y forzar RPC" en `permisos_ausencia` es un buen patron a replicar si en el futuro se necesita otro flujo de aprobacion.

## Diagrama de dependencias

```
MiBitacora.jsx ─┬─ useTimelogsStore ──→ dbTimelogs.js ──→ registro_horas
                ├─ useVisitasStore ───→ dbVisitas.js ───→ visitas / visita_asistentes
                └─ useEmpleadosStore ─→ dbEmpleados.js ─→ empleados (RLS: solo fila propia)
                         │
                         └─ BitacoraSemanaGrid (compartido con Bitacoras.jsx y BitacoraCeo.jsx)

Tareas.jsx ─────┬─ useTareasStore ────→ dbTareas.js ───────→ tareas
                └─ useTareaReportesStore → dbTareaReportes.js → tarea_reportes + Storage 'tarea-reportes'

Permisos.jsx ───── usePermisosAusenciaStore → dbPermisosAusencia.js
                                                  ├─ INSERT directo (solicitud empleado)
                                                  └─ RPC fn_resolver_permiso_ausencia()
                                                        └─ autocompleta registro_horas al aprobar

useAuthStore.js ── login empleado → RPC fn_registrar_acceso_diario() → acceso_diario
```

## Recomendaciones priorizadas
1. Cambiar `tarea_reportes` a carga bajo demanda por tarea (no todo el historial de la empresa) — es lo mas barato de arreglar y lo que mas crece.
2. Acotar `tareas` a un rango de mes visible en vez de traer toda la tabla.
3. Extraer `PERMISO_NOTE_REGEX` y helpers a `src/lib/bitacoraHelpers.js` para que no se desincronicen entre `BitacoraSemanaGrid.jsx` y `Bitacoras.jsx`.
4. (Opcional, cuando se toquen estos archivos igual) unificar convencion de nombres español/ingles en `db*.js` del portal.

## Proximo paso sugerido
Ninguno de estos hallazgos es urgente ni bloquea el uso actual (equipo pequeño, poco volumen todavia). Se pueden dejar en el backlog de deuda tecnica P2 y resolver cuando se ataque la Fase 8-12 del roadmap (mas usuarios/escalabilidad), salvo que quieras que arregle el punto 3 (duplicacion de regex) ahora mismo — es un cambio chico y de bajo riesgo.
