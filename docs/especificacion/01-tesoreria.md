# Módulo 1 — Tesorería

**Prioridad:** #1 — corazón del negocio (hallazgo del análisis del prototipo, ver manual de arranque §1.1).
**Offline:** parcial — el registro de gastos menores en obra podría necesitarlo a futuro, pero no es el foco inicial de PowerSync (ese es Bitácora/Visitas).
**Estado actual:** funcional en mock, usando datos reales del prototipo anterior (117 transacciones reales, jun–jul 2026).

## Qué hace
Controla el flujo de caja de la empresa en **3 cuentas**: Banco, Efectivo, Nequi. Cada movimiento es un ingreso o un gasto, opcionalmente ligado a un proyecto/servicio, con categoría y descripción.

## Pantallas
1. **Resumen de cuentas** — saldo actual de Banco/Efectivo/Nequi (saldo inicial + suma de movimientos).
2. **Listado de transacciones** — filtrable por fecha, cuenta, tipo, proyecto, categoría, facturado/no facturado.
3. **Registrar movimiento** — formulario: fecha, tipo (ingreso/gasto), cuenta, monto, categoría, proyecto (opcional), servicio (opcional), descripción, facturado.
4. **Traslado entre cuentas** — caso especial: un ingreso en una cuenta + un gasto espejo en otra, mismo monto, categoría "TRASLADO ENTRE CUENTAS" (patrón visto repetidamente en los datos reales).

## Flujos de negocio (extraídos de los datos reales)
- **Traslado entre cuentas:** se registran SIEMPRE como par de movimientos (gasto en origen + ingreso en destino), no como una operación atómica de "transferencia" — replicar este patrón o mejorarlo con una función dedicada que genere ambos movimientos en una sola transacción SQL.
- **Movimientos GBA:** cuenta = NULL, llevan `gba_movimiento` (préstamo otorgado/recibido, pago/cobro de préstamo). Ver `docs/modelo-datos/entidades.md` §3.
- **Ingresos por proyecto:** cuando hay `proyecto_id`, la categoría suele coincidir con el tipo de servicio del proyecto (DELUXE, LUXE, VISITAS DE OBRA).
- **Auto-generación desde otros módulos:** Contratistas (abonos) y Nómina (pagos) generan transacciones automáticamente — ver sus specs. Tesorería debe poder mostrar de dónde vino cada movimiento auto-generado (badge "generado desde Nómina/Contratistas").

## Categorías reales en uso (semilla para tabla `categorias`)
**Gasto:** Contratistas, Créditos Bancarios, Gastos Bancarios, Impuestos, Liquidaciones, Nómina (+ Gerencia/Coordinación/Base/Publicidad), Aportes Salariales, Personales, Préstamos Empleados, Propiedades y Servicios Públicos, Proveedores, Seguridad Social, Tarjeta de Crédito, Renting, Publicidad y Mercadeo, Licencias, Suministros de Oficina, Traslado entre Cuentas, Otros Gastos, Honorarios, GBA, Transporte (+ variantes), Luxe/Fachadas/Deluxe/Servicio Principal/Acabados.
**Ingreso:** Devolución Préstamo, Traslado entre Cuentas, Otros Ingresos, Deluxe, Luxe, Acabados, Iluminación, Enchapes, Carpintería, Asesoría Express, Diseño por Espacio, Visitas de Obra, Arquitectura, ADA Learning, Especificaciones GBA, GBA, Proyecto Principal, Fachadas, Servicio Principal.

**Nota de limpieza:** hay categorías con error de tipeo en los datos reales (ej. "TRASNPORTE" vs "TRANSPORTE"). Al normalizar a tabla, unificar antes de migrar — no arrastrar el error.

## Seguridad y reglas no negociables
- Toda escritura = **RPC atómica** con `SELECT ... FOR UPDATE NOWAIT` sobre el saldo de la cuenta afectada.
- `transacciones` es **solo INSERT** — nunca DELETE, corrección = movimiento de reverso con nota.
- Auditoría: `created_by` obligatorio.

## Conexiones con otros módulos
- **Proyectos:** `getProjectMetrics()` cruza transacciones + registro_horas para calcular rentabilidad por proyecto.
- **Contratistas:** abonos generan gasto automático.
- **Nómina:** pagos generan gasto automático.
- **Calendario Tributario:** los próximos pagos (impuestos, planillas) deberían poder generar un borrador de transacción pendiente.
