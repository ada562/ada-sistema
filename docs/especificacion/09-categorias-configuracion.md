# Módulo 9 — Categorías / Configuración

**Prioridad:** #9 (soporte transversal a todos los demás).
**Offline:** no.
**Estado actual:** funcional en mock.

## Qué hace
Catálogos y parámetros globales usados por Tesorería, Proyectos y Nómina.

## Categorías
Ver `docs/especificacion/01-tesoreria.md` para el listado completo de categorías de ingreso/gasto ya en uso. Al migrar a Supabase pasan de array de strings a tabla `categorias` (ver modelo de datos §2.11) — esto habilita autocompletar sin errores de tipeo y activar/desactivar categorías sin perder el histórico.

## Configuración (parámetros globales, 1 fila por tenant)
| Parámetro | Valor actual |
|---|---|
| Días laborales por mes | 23 |
| % Carga prestacional | 29% |
| % IVA | 19% |
| % Imprevistos (cotizaciones) | 5% |
| % Administración (cotizaciones) | 15% |
| % Utilidad (cotizaciones) | 30% |
| Saldo inicial Banco | $2.792.626 |
| Saldo inicial Efectivo | $4.868.250 |
| Saldo inicial Nequi | $201.471 |

Estos porcentajes (imprevistos/administración/utilidad) sugieren que existe o existió un **módulo de cotización de proyectos (AIU)** que no está en el prototipo actual — típico de arquitectura/construcción en Colombia. Confirmar con la usuaria si se necesita una pantalla de cotización que aplique estos % automáticamente al armar una propuesta de proyecto nuevo.

## Pantallas
1. **Categorías** — listado por tipo (ingreso/gasto), activar/desactivar, crear nueva.
2. **Configuración general** — parámetros de la tabla de arriba, editable solo por rol admin/CEO.
3. **Roles y permisos** — RBAC (contrato definido en CLAUDE.md): registrar módulo, sembrar permisos por rol vía migración SQL, `usePermission()` en componentes.
