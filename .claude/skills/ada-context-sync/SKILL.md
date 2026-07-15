---
name: ada-context-sync
description: >
  Cierre de sesión para ADA Gestión: actualiza PROYECTO_CONTEXTO.md con los
  cambios realizados, hace commit y push.
---

# Cierre de sesión — ADA Gestión

Al ejecutar este skill:

1. Revisa qué archivos cambiaron en esta sesión (`git diff --stat`)
2. Actualiza `PROYECTO_CONTEXTO.md`:
   - Fecha de actualización + resumen de 1 línea
   - Estado de módulos (si cambió)
   - Migraciones SQL nuevas (marcar pendientes con ⚠️)
   - Deuda técnica nueva (si se detectó)
   - Sección 9 "Próxima Sesión" con los siguientes pasos concretos
3. Hace `git add` de los archivos relevantes
4. Crea un commit descriptivo
5. Push a la rama actual
6. Confirma al usuario que todo quedó sincronizado
