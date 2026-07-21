---
name: ada-sql-status
description: >
  Marca el estado de una migracion SQL (ejecutada, revertida) y actualiza
  el registro en MIGRATIONS.md.
user_invocable: true
---

# Actualizar Estado de Migracion

Al ejecutar `/ada-sql-status <numero> <estado>`:

## Estados validos
- `ejecutada` — La migracion fue ejecutada exitosamente en Supabase
- `revertida` — La migracion fue revertida/rollback
- `pendiente` — Marcar como pendiente de ejecutar

## Acciones

1. Lee `supabase/MIGRATIONS.md`
2. Busca la migracion con el numero indicado
3. Actualiza el estado en la tabla resumen y en el detalle:
   - `ejecutada` → `✅ Ejecutada (YYYY-MM-DD)`
   - `revertida` → `❌ Revertida (YYYY-MM-DD)`
   - `pendiente` → `⚠️ Pendiente`
4. Si se marca como `ejecutada`, agregar la fecha de ejecucion
5. Muestra confirmacion al usuario

## Ejemplo
```
/ada-sql-status 001 ejecutada
→ ✅ Migracion #001 marcada como ejecutada (2026-07-17)
```
