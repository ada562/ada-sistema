#!/bin/bash
# Hook: PostToolUse (Write/Edit)
# Detecta cambios en componentes CRUD y recuerda hacer QA

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Detectar formularios y componentes CRUD
if echo "$FILE_PATH" | grep -qiE "Form.*\.jsx$|Modal.*\.jsx$"; then
  BASENAME=$(basename "$FILE_PATH")
  echo "================================================"
  echo "  QA: Formulario modificado — $BASENAME"
  echo "  Verifica edge cases:"
  echo "  - Campos vacios"
  echo "  - Datos limite (numeros negativos, texto largo)"
  echo "  - Submit doble"
  echo "  Ejecuta /ada-qa <modulo> para prueba completa."
  echo "================================================"
fi
