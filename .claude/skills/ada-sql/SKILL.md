---
name: ada-sql
description: >
  Genera, valida y documenta migraciones SQL numeradas para ADA Gestión.
  Revisa el SQL para errores, numera secuencialmente, y mantiene un registro
  histórico completo en MIGRATIONS.md.
user_invocable: true
---

# Migración SQL — ADA Gestión

Al ejecutar `/ada-sql <descripción del requerimiento>`:

## Paso 1 — Determinar número de migración

1. Lee `supabase/MIGRATIONS.md` para encontrar la última migración registrada
2. Si no existe, empieza desde `001`
3. Asigna el siguiente número secuencial con formato `NNN` (001, 002, 003...)

## Paso 2 — Generar el archivo SQL

Crea el archivo `supabase/migrations/NNN_nombre_descriptivo.sql` siguiendo estas reglas:

### Estructura obligatoria para CREATE TABLE:
```sql
-- ============================================
-- Migración #NNN: Descripción breve
-- Fecha: YYYY-MM-DD
-- Autor: ADA Gestión (generado con Claude)
-- ============================================

-- Descripción detallada de qué hace esta migración
-- y por qué se necesita.
```

- `id uuid DEFAULT gen_random_uuid() PRIMARY KEY`
- `tenant_id text NOT NULL DEFAULT 'ada'` como 2da columna
- Timestamps: `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`
- Columnas específicas del requerimiento
- Índices relevantes (siempre indexar `tenant_id` y FKs)
- **RLS habilitado + políticas** (USING + WITH CHECK — nunca solo USING)
- Si es operación de dinero: **RPC atómica** con `SELECT FOR UPDATE NOWAIT`
- Trigger para `updated_at` usando función compartida `update_updated_at_column()`

### Para ALTER TABLE / modificaciones:
- Usar `IF NOT EXISTS` / `IF EXISTS` donde sea posible para idempotencia
- Incluir comentario con la razón del cambio
- Si elimina columnas, documentar qué datos se pierden

### Para funciones RPC:
- Usar `CREATE OR REPLACE FUNCTION`
- Incluir `SECURITY DEFINER` o `SECURITY INVOKER` según corresponda
- Documentar parámetros y retorno

## Paso 3 — Validar el SQL

Revisar el SQL generado buscando estos errores comunes:

1. **Referencias a tablas/columnas inexistentes** — verificar contra migraciones previas
2. **Tipos de datos incorrectos** — uuid, text, integer, numeric, timestamptz, boolean, jsonb
3. **Foreign keys sin tabla destino** — verificar que la tabla referenciada existe o se crea primero
4. **Políticas RLS incompletas** — debe tener USING y WITH CHECK
5. **Falta de índices en FKs** — toda FK debe tener índice
6. **Conflictos de nombres** — verificar que no exista tabla/función con el mismo nombre
7. **Orden de ejecución** — las dependencias deben crearse antes
8. **Falta CREATE EXTENSION** — si usa extensiones (pgcrypto, etc.)
9. **Transaccionalidad** — operaciones de dinero deben ser atómicas

Si encuentra errores, corregirlos ANTES de guardar el archivo.

Mostrar al usuario un resumen de la validación:
```
✅ Validación de migración #NNN
- [✓] Sintaxis SQL correcta
- [✓] Referencias a tablas verificadas
- [✓] RLS configurado con USING + WITH CHECK
- [✓] Índices en foreign keys
- [✓] Sin conflictos de nombres
- [⚠️] Nota: requiere migración #XXX ejecutada previamente
```

## Paso 4 — Documentar en MIGRATIONS.md

Actualizar `supabase/MIGRATIONS.md` agregando la nueva entrada. El archivo tiene este formato:

```markdown
# Registro de Migraciones — ADA Gestión

> Historial completo de todas las migraciones SQL de la base de datos.
> Cada migración está numerada secuencialmente y documentada con su propósito,
> tablas afectadas, y estado de ejecución.

## Resumen

| # | Archivo | Fecha | Descripción | Estado |
|---|---------|-------|-------------|--------|
| 001 | 001_crear_tabla_proyectos.sql | 2026-07-17 | Tabla de proyectos | ⚠️ Pendiente |

---

## Detalle de Migraciones

### #001 — Crear tabla de proyectos
- **Archivo:** `migrations/001_crear_tabla_proyectos.sql`
- **Fecha:** 2026-07-17
- **Estado:** ⚠️ Pendiente de ejecutar
- **Descripción:** Crea la tabla principal de proyectos con campos para...
- **Tablas afectadas:** `proyectos` (CREATE)
- **Dependencias:** Ninguna
- **Notas:** Primera migración del sistema
```

Para cada migración documentar:
- Número y nombre descriptivo
- Archivo SQL correspondiente
- Fecha de creación
- Estado: `⚠️ Pendiente` | `✅ Ejecutada` | `❌ Revertida`
- Descripción de qué hace y por qué
- Tablas/funciones afectadas (CREATE, ALTER, DROP)
- Dependencias de otras migraciones
- Notas relevantes (breaking changes, datos que se pierden, etc.)

## Paso 5 — Mostrar resultado al usuario

Mostrar:
1. El SQL completo generado (para revisión)
2. El resumen de validación
3. Instrucciones para ejecutar:
   ```
   Para ejecutar esta migración en Supabase:
   1. Ve a https://supabase.com/dashboard → tu proyecto → SQL Editor
   2. Pega el contenido de supabase/migrations/NNN_nombre.sql
   3. Ejecuta y verifica que no haya errores
   4. Vuelve aquí y ejecuta: /ada-sql-status NNN ejecutada
   ```

## Reglas importantes

- **NUNCA** ejecutar SQL directamente en Supabase — solo generar y documentar
- **SIEMPRE** validar antes de guardar
- **SIEMPRE** documentar en MIGRATIONS.md
- Las migraciones son **append-only** — nunca modificar una migración ya ejecutada
- Para corregir una migración ejecutada, crear una nueva migración correctiva
- Mantener el número secuencial sin gaps (001, 002, 003...)
