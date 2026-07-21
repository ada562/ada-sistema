# Módulo 4 — Bitácora / Visitas

**Prioridad:** #4 — pero es el **caso de uso crítico de offline** ("en obra sin señal"), confirmado por la usuaria como el requisito más importante actualmente del proyecto.
**Offline:** SÍ, crítico. Primer candidato para PowerSync.
**Estado actual:** funcional en mock, 28 registros reales (jun-jul 2026), tabla unificada (Bitácora y Visitas son el mismo dato, diferenciado por `tipo`).

## Qué hace
Registro de visitas de obra, reuniones de diseño y otros eventos ligados a un proyecto: quién asistió, qué se discutió/avanzó, notas narrativas largas (a veces con menciones @persona), costo si aplica, si ya se facturó.

## Por qué es el requisito offline crítico
El equipo (arquitectos, diseñadores, coordinadores) va a obra sin señal, necesita registrar avances, tomar notas, marcar asistentes, y que quede sincronizado cuando reconecten — sin perder el registro ni bloquear el trabajo. Este es el módulo que justifica arquitecturalmente meter PowerSync al proyecto (ver manual de arranque §3.2).

## Pantallas
1. **Listado por proyecto** — cronológico, tipo de visita, asistentes, resumen de notas.
2. **Registrar visita/bitácora** — proyecto, tipo (visita_obra / reunión_diseño / obsequio), fecha, tema, asistentes (multi-select de empleados), notas (texto largo), monto, facturado.
3. **Vista de campo (offline-first)** — versión simplificada optimizada para celular/tablet en obra: formulario mínimo (proyecto ya preseleccionado si viene de un flujo, asistentes, notas, foto) que funciona sin conexión y sincroniza al reconectar.

## Patrón de datos real observado
- Las notas son narrativas largas y detalladas (ej. "El diseñador Pablo Novoa visita la obra, se reúne con Erick y Alirio para revisar el tema de demolición..."), no campos estructurados — el formulario debe soportar texto libre extenso, no limitarlo.
- `attendeeIds` es un array de empleados — normalizado en `visita_asistentes` (N:N), ver modelo de datos.
- El campo `topic` a veces contiene "Arquitectura" o "Interiorismo" — podría convertirse en un enum/catálogo si se confirma que son categorías fijas.

## Offline / PowerSync — alcance recomendado para el primer sprint offline
1. Sync rules: el usuario en campo solo necesita ver/escribir visitas de **sus proyectos asignados** (no toda la base).
2. Cola de escritura local (SQLite vía PowerSync) para: crear visita, agregar asistente, adjuntar foto.
3. Resolución de conflictos: last-write-wins por campo + tabla de auditoría (quién cambió qué), igual que en el proyecto hermano (Casinos La Riviera).
4. Fotos: subir a Supabase Storage en cuanto haya señal; mientras tanto, guardar localmente y mostrar estado "pendiente de subir".

## Conexiones
- Proyectos (`proyecto_id`)
- Empleados (`visita_asistentes`)
- Tesorería (si `monto > 0` y se factura, debería poder generar transacción — no está automatizado hoy en el mock, evaluar si se necesita)
