# Módulo 3 — Proyectos

**Prioridad:** #3 — reemplaza Asana.
**Offline:** sí (módulo de campo con PowerSync, junto con Bitácora/Visitas).
**Estado actual:** funcional en mock, 39 proyectos reales (varios importados automáticamente desde Excel de bitácora — señal de que la usuaria migraba manualmente antes de este sistema).

## Qué hace
Registro de proyectos con cliente, tipo de servicio, valor de contrato, estado, y sub-servicios contratados. Es el nodo central que conecta Tesorería, Bitácora/Visitas y Registro de Horas.

## Pantallas
1. **Listado de proyectos** — filtrable por estado (Activo/Pausado/Finalizado), con métricas rápidas (ingresos, gastos, rentabilidad).
2. **Detalle de proyecto** — pestañas: Info general, Servicios, Transacciones ligadas, Visitas/Bitácora, Horas registradas, Rentabilidad.
3. **Crear/editar proyecto** — nombre, cliente, tipo de servicio, fecha inicio, valor contrato, IVA%, notas, flag GBA, paquete de visitas incluidas (visita_obra / reunión_diseño / obsequio — cupos).
4. **Servicios del proyecto** — sub-contratos dentro de un proyecto (ej. proyecto "LUXE" + servicio adicional "ACABADOS"), cada uno con su propio valor e IVA.

## Cálculo de rentabilidad (ya implementado en mock, replicar en RPC/vista SQL)
```
ingresos = SUM(transacciones.monto WHERE tipo='ingreso' AND proyecto_id=X)
gastos   = SUM(transacciones.monto WHERE tipo='gasto' AND proyecto_id=X)
costo_mano_obra = SUM(registro_horas.dias × tarifa_diaria(empleado))
  donde tarifa_diaria = (tarifa_mensual + salario_no_constitutivo) / dias_laborales_mes
rentabilidad = ingresos - gastos - costo_mano_obra
```
En Supabase esto conviene como **vista materializada o función SQL**, no cálculo en el cliente — evita traer todas las transacciones al navegador para cada tarjeta de proyecto en el listado.

## Dato relevante del negocio real
Varios proyectos activos con `contractValue: 0` y notas "Importado automáticamente desde Excel de bitácora" — son proyectos que existen operativamente (tienen visitas y horas registradas) pero sin contrato formal cargado todavía. El listado debe distinguir visualmente "proyecto con contrato" vs. "proyecto operativo sin contrato" para que la usuaria sepa cuáles le falta formalizar.

## Conexiones
- Transacciones de Tesorería (`proyecto_id`, `servicio_id`)
- Visitas/Bitácora (`proyecto_id`)
- Registro de horas (`proyecto_id`)
