---
name: ada-sql
description: >
  Genera migraciones SQL numeradas para ADA Gestión con RLS, índices,
  RPCs atómicas para tesorería, y marca lo pendiente en PROYECTO_CONTEXTO.md.
---

# Migración SQL — ADA Gestión

Al ejecutar este skill con un requerimiento (ej: "crea la tabla de proyectos"):

1. Revisa las migraciones existentes en `supabase/` para determinar el próximo número de fase
2. Genera el archivo `supabase/migration_faseN_nombre.sql` con:
   - `CREATE TABLE` con `id uuid DEFAULT gen_random_uuid() PRIMARY KEY`
   - `tenant_id text NOT NULL DEFAULT 'ada'` como 2ª columna
   - Timestamps: `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`
   - Columnas específicas del requerimiento
   - Índices relevantes
   - **RLS habilitado + políticas** (USING + WITH CHECK — nunca solo USING)
   - Si es operación de dinero: **RPC atómica** con `SELECT FOR UPDATE NOWAIT`
   - Trigger para `updated_at`
3. Actualiza `PROYECTO_CONTEXTO.md` sección 4 marcando la migración como ⚠️ pendiente de ejecutar
4. Muestra el SQL al usuario para revisión antes de ejecutar en Supabase
