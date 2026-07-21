#!/bin/bash
# Hook: PostToolUse (Write/Edit)
# Detecta cuando se escribe un archivo .sql en supabase/migrations/
# y recuerda validar y documentar la migracion

# Leer input del hook (JSON con tool_input)
INPUT=$(cat)

# Extraer file_path del JSON
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')

# Si no hay file_path, intentar con el campo path
if [ -z "$FILE_PATH" ]; then
  FILE_PATH=$(echo "$INPUT" | grep -o '"path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"path"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')
fi

# Verificar si es un archivo SQL en supabase/migrations
if echo "$FILE_PATH" | grep -qi "supabase.*migrations.*\.sql"; then
  BASENAME=$(basename "$FILE_PATH")
  REGISTRY="supabase/MIGRATIONS.md"

  # Verificar si ya esta documentado
  DOCUMENTED=false
  if [ -f "$REGISTRY" ]; then
    if grep -q "$BASENAME" "$REGISTRY"; then
      DOCUMENTED=true
    fi
  fi

  echo "================================================"
  echo "  MIGRACION SQL DETECTADA: $BASENAME"
  echo "================================================"

  if [ "$DOCUMENTED" = false ]; then
    echo "  Esta migracion NO esta documentada."
    echo "  Documenta en supabase/MIGRATIONS.md"
    echo "  y valida el SQL antes de ejecutar."
  else
    echo "  Migracion ya documentada en MIGRATIONS.md"
    echo "  Verifica que los cambios esten reflejados."
  fi

  echo "================================================"
fi
