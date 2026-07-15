---
name: ada-session-start
description: >
  Briefing de inicio de sesión para ADA Gestión: lee el contexto del proyecto,
  muestra el estado actual, pendientes y punto de continuación.
---

# Inicio de sesión — ADA Gestión

Al ejecutar este skill:

1. Lee `PROYECTO_CONTEXTO.md` — sección "Próxima Sesión — Continuar Aquí"
2. Ejecuta `git log --oneline -10` para ver los últimos cambios
3. Busca migraciones SQL pendientes (marcadas con ⚠️ en PROYECTO_CONTEXTO.md)
4. Muestra un resumen al usuario con:
   - Estado general del proyecto
   - Módulos en progreso
   - Deuda técnica P1
   - Lo que toca hacer en esta sesión
5. **Pregunta al usuario si hay novedades antes de proceder**
