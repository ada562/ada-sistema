# Módulo 5 — Equipo / Nómina

**Prioridad:** #5.
**Offline:** no.
**Estado actual:** funcional en mock. 9 empleados reales activos. El esquema de `dbEmpleados.js` ya está **más completo que los datos del export** (historial laboral, seguridad social, documentos) — trabajo de diseño ya adelantado en sesiones previas, no repetir.

## Qué hace
Ficha completa de empleado (datos personales, contacto de emergencia, seguridad social colombiana, documentos) + registro de pagos de nómina (quincenal, primas legales y no constitutivas).

## Pantallas
1. **Listado de equipo** — nombre, cargo, estado, alertas (cumpleaños próximos, contratos por vencer).
2. **Ficha de empleado** — pestañas: Personal, Laboral, Seguridad Social, Documentos, Historial de pagos, Horas registradas.
3. **Registrar pago de nómina** — empleado, tipo (legal / no constitutivo / prima legal / prima no constitutivo), quincena o semestre, monto, método → genera gasto automático en Tesorería.
4. **Alertas** — cumpleaños próximos (`getUpcomingBirthdays`), contratos que vencen en 30 días (`getExpiringContracts`).

## Datos reales del equipo (referencia de cargos y tarifas)
CEO (Alejandra Durán Agudelo), Gerente de Proyectos, 2 Coordinadores de Carpintería, 2 Coordinadores de Diseño, Coordinador de Marketing, Auxiliar Administrativa y Contable. Tarifas mensuales entre $1.660.000 y $1.860.000 COP, carga prestacional 30% en todos los casos.

## Regla no negociable
`registrarPagoNomina()` = **RPC atómica** (inserta en `pagos_nomina` + `transacciones` en una sola transacción SQL). Mismo patrón que abonos de contratistas.

## Seguridad
- `pin` de empleado (login rápido en campo) está en texto plano en el mock actual — **hashear al migrar a Supabase**, nunca loguear ni exponer en respuestas de API.
- Datos de seguridad social (EPS, pensión, ARL) y documentos son información sensible — RLS debe restringir lectura a RRHH/administración, no a todo el equipo.

## Conexiones
- Tesorería (pago genera transacción)
- Proyectos (vía registro_horas, para costo de mano de obra)
- Bitácora/Visitas (vía visita_asistentes)
