#!/bin/bash
# Hook: PostToolUse (Write/Edit)
# Detecta cambios en archivos de autenticacion/seguridad

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Archivos criticos de seguridad
SECURITY_FILES="dbAuth|Login|usePermission|supabase\.js|\.env|api/"

if echo "$FILE_PATH" | grep -qiE "$SECURITY_FILES"; then
  echo "================================================"
  echo "  SEGURIDAD: Archivo critico modificado"
  echo "  $FILE_PATH"
  echo "  Considera ejecutar /ada-security para"
  echo "  verificar que no haya vulnerabilidades."
  echo "================================================"
fi
