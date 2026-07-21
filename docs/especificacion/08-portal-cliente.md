# Módulo 8 — Portal de Cliente

**Prioridad:** #8, marcado como "diferencial competitivo" en el manual de arranque. **Estado:** sin datos reales previos — diseño desde cero.

## Qué hace (según manual de arranque)
Acceso externo (fuera del sistema interno) para que el cliente del proyecto vea avances, renders y modelos 3D, y pueda aprobar entregables.

## Alcance propuesto
- Login separado del interno (o acceso por link único/token por proyecto — más simple para un cliente ocasional).
- Vista de solo lectura: estado del proyecto, línea de tiempo de visitas/avances (subconjunto no sensible de Bitácora), archivos del módulo 7 marcados como "visibles para cliente".
- Acción de aprobación sobre entregables específicos (ej. aprobar un render antes de pasar a la siguiente fase).

## Pendiente de definir con la usuaria
- ¿Qué datos de Bitácora/Visitas son apropiados para mostrar al cliente vs. internos únicamente? (las notas actuales son muy operativas/internas — necesitan filtro o resumen).
- ¿El portal es prioritario a corto plazo o queda para después de tener Tesorería + Proyectos + Bitácora sólidos en Supabase? Dado que hoy la prioridad confirmada es offline (Bitácora/Visitas), este módulo probablemente va después.
