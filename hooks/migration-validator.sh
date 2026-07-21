#!/bin/bash
# Hook: PreToolUse (Bash)
# Intercepta si se intenta ejecutar SQL directamente y recuerda usar el skill
# Tambien valida archivos SQL antes de que se copien a Supabase

INPUT=$(cat)

# Extraer el comando del JSON
COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"command"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')

# Detectar si se intenta ejecutar supabase CLI con migraciones
if echo "$COMMAND" | grep -qi "supabase.*migration\|supabase.*db.*push\|supabase.*db.*reset"; then
  echo "================================================"
  echo "  ATENCION: Operacion de migracion detectada"
  echo "================================================"
  echo "  Antes de ejecutar, verifica:"
  echo "  1. La migracion esta documentada en MIGRATIONS.md"
  echo "  2. El SQL fue validado con /ada-sql"
  echo "  3. Tienes respaldo de la base de datos"
  echo "================================================"
fi
