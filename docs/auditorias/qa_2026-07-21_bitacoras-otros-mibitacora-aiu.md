# Reporte QA — Bitácoras (Otros/Reposición/Festivo), Mi Bitácora (portal empleado), AIU, Arqueo de Caja
**Fecha:** 2026-07-21
**Alcance:** Flujos nuevos de la sesión — fila fija "Otros" en `BitacoraSemanaGrid.jsx` (usada por `MiBitacora.jsx` y `Bitacoras.jsx`), cálculo de AIU en `ProyectoDetalle.jsx`, Arqueo de Caja (`ArqueoCaja.jsx` + migración 015).

## Resumen
- Total casos revisados: 14
- Pasaron: 12 (✅)
- Fallaron: 1 (❌) — **corregido en esta misma sesión**
- No aplican / no verificables sin datos reales: 1 (➖ — Mi Bitácora requiere `empleados.user_id` vinculado, pendiente de la tarea de Auth)
- Cobertura: revisión de código completa (lectura de los 4 archivos + migración 014/015); no hubo prueba manual en navegador (no se levantó el entorno esta sesión)

## Casos fallidos (detalle)

| # | Caso | Resultado esperado | Resultado actual (antes del fix) | Severidad |
|---|------|-------------------|-----------------|-----------|
| 1 | Fila "Otros": escribir días, luego Tab a la descripción, completarla y hacer blur | Se guarda un registro con los días y la descripción | **Bug (ver detalle abajo)** | ALTO |

### Bug encontrado: pérdida de datos en la fila "Otros" (`BitacoraSemanaGrid.jsx`)

`commitOtrosCell(date)` estaba enganchado a `onBlur` de **cada uno** de los dos inputs de la celda "Otros" (días y descripción) por separado. Como la función borra ambos drafts (`daysKey` y `noteKey`) incondicionalmente apenas se dispara, el blur del primer campo destruía el valor que el usuario acababa de escribir en el segundo, antes de que llegara a confirmarlo. Dos escenarios reproducibles, para una fila nueva (sin registro previo):

- **Escenario A — Tab de días → descripción:** el blur del input de días limpia ambos drafts; como la descripción todavía está vacía, `commitOtrosCell` cae en `!noteValue` y muestra el toast de error "Describe qué hiciste para guardar el registro de 'Otros'" sin guardar nada — el número de días que el usuario acababa de escribir desaparece del input (vuelve a estar vacío porque no hay `entry`).
- **Escenario B — Tab de descripción → días (el más grave, silencioso):** el blur del input de descripción limpia ambos drafts; como no hay `rawDays` (nunca se tocó ese campo todavía), `daysValue` cae a `0` → rama `daysValue <= 0`, sin `entry` que borrar → la función retorna sin guardar y **sin ningún toast**. El texto de descripción que el usuario acababa de escribir desaparece de la UI sin ninguna señal de error.

Este bug afectaba **ambos** puntos de entrada que comparten el componente: `MiBitacora.jsx` (portal empleado) y la pestaña "Calendario" de `Bitacoras.jsx` (vista admin) — confirmado que esta última también renderiza `BitacoraSemanaGrid` (línea 151). La pestaña "Historial" de `Bitacoras.jsx` usa un modal (`FormBitacoraGlobal`) con guardado único al hacer clic en "Crear/Guardar", no por blur — no comparte el bug.

**Corrección aplicada:** el `onBlur` se movió del par de `<input>` al `<div>` contenedor de la celda, usando el patrón estándar de React para controles compuestos: solo confirma (`commitOtrosCell`) cuando el nuevo foco (`e.relatedTarget`) queda **fuera** de ambos inputs de esa celda (`!e.currentTarget.contains(e.relatedTarget)`). Así, moverse entre los dos campos de la misma celda con Tab ya no dispara un guardado prematuro — solo se confirma una vez, con ambos valores completos, al salir realmente de la celda.

## Otros casos verificados (sin hallazgos)

| # | Caso | Resultado |
|---|------|-----------|
| 2 | Festivo: marcar/desmarcar, disabled mientras hay Reposición activa | ✅ correcto |
| 3 | Reposición: solo disponible sáb/dom, exige horas > 0 antes de marcar | ✅ correcto |
| 4 | Semana pasada con `lockPastWeeks=true` (Mi Bitácora): inputs deshabilitados | ✅ correcto |
| 5 | `Bitacoras.jsx` admin: `lockPastWeeks=false`, puede editar semanas pasadas | ✅ correcto, es el comportamiento documentado |
| 6 | Cálculo de fecha "lunes de la semana" (`dateWeek.js`) vs. `fn_semana_actual_inicio()` en Postgres | ✅ coincide para los 7 valores de `getDay()` |
| 7 | Mi Bitácora: resolución de "mi propio empleado" vía RLS (`employees[0]`) | ✅ correcto por diseño, documentado inline; sin `id` hardcodeado en frontend |
| 8 | Mi Bitácora: `FormMiVisita` restringe fecha a la semana actual (min/max + validación explícita) | ✅ correcto, doble candado |
| 9 | Mi Bitácora: si no hay empleado vinculado (`user_id` sin match) | ✅ muestra mensaje de fallback, no rompe |
| 10 | Historial (`Bitacoras.jsx`): filtro "Otros (sin proyecto)" | ✅ correcto, filtra por `projectId === null` |
| 11 | `FormBitacoraGlobal`: nota obligatoria solo si `isOtros` | ✅ coincide con el CHECK de migración 014 |
| 12 | AIU en `ProyectoDetalle.jsx`: administración/imprevistos/utilidad calculados solo sobre mano de obra | ✅ consistente con su propio label en la UI ("AIU sobre mano de obra") |
| 13 | Arqueo de Caja: RLS + `fn_audit_trigger`, tabla insert-only (no permite editar/borrar un arqueo ya hecho) | ✅ correcto, mismo patrón documentado que `pagos_nomina`/`pagos_contratistas` |
| 14 | Arqueo de Caja: FK compuesta `(tenant_id, cuenta)` tras el fix de migración 015 | ✅ corre sin error, confirmado por el usuario en producción |

## Bugs reportados
1. [x] **[BUG-001]** Fila "Otros" en `BitacoraSemanaGrid.jsx` pierde el valor de un campo (días o descripción) al usar Tab entre los dos inputs de la misma celda, en un caso sin mostrar ningún error. Afecta `MiBitacora.jsx` y la pestaña Calendario de `Bitacoras.jsx`. **Corregido en esta sesión** (commit pendiente de push).

## Recomendaciones
- Ninguna adicional — el único hallazgo real de este alcance ya quedó corregido. No se detectaron problemas en Mi Bitácora, AIU ni Arqueo de Caja.
- Falta prueba manual en navegador real (con datos reales de `empleados.user_id` vinculados) para confirmar el flujo de Mi Bitácora end-to-end — bloqueado hasta completar la tarea pendiente de crear cuentas de Supabase Auth para empleados.
