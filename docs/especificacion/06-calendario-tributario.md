# Módulo 6 — Impuestos / Calendario Tributario

**Prioridad:** #6.
**Offline:** no.
**Estado actual:** funcional en mock con datos reales de la empresa ya cargados (no vienen del export de Firebase — se escribieron directamente en `dbCalendario.js`).

## Qué hace
Calendario de obligaciones recurrentes (impuestos, servicios, nómina de aportes) con alertas de proximidad.

## Obligaciones reales ya cargadas
| Nombre | Frecuencia | Día | Monto de referencia |
|---|---|---|---|
| Movistar | Mensual | 25 | — |
| Planillas (seguridad social) | Mensual | 5 | — |
| Leasing | Mensual | 11 | $1.906.000 |
| Industria y Comercio (ICA) | Bimestral | 10 | Sep/Nov/Ene/Mar/May/Jul |
| Primas de servicios | Semestral | 30 | Junio y Diciembre |

## Pantallas
1. **Vista calendario** — react-big-calendar (decidido en el manual de arranque), próximos pagos ordenados por proximidad.
2. **CRUD de obligaciones** — nombre, frecuencia (mensual/bimestral/semestral), día del mes, monto, notas.

## Conexión pendiente de definir con el usuario
Hoy este calendario es informativo (`getProximosPagos()`), no genera transacciones. Evaluar si al llegar la fecha de un pago debería poder crear un borrador de transacción en Tesorería con un clic, en vez de que la usuaria lo registre de cero.
