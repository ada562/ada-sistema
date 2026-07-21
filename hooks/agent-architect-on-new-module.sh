#!/bin/bash
# Hook: PostToolUse (Write)
# Detecta creacion de nuevos modulos/paginas y recuerda revision arquitectonica

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Detectar nuevos archivos de paginas o capa de datos
if echo "$FILE_PATH" | grep -qiE "src/pages/.*\.jsx$|src/lib/db.*\.js$"; then
  # Verificar si es archivo nuevo (no existia antes)
  BASENAME=$(basename "$FILE_PATH")

  # Solo alertar para archivos de pagina principal o nuevos db
  if echo "$FILE_PATH" | grep -qiE "src/pages/[^/]+/[A-Z].*\.jsx$|src/lib/db[A-Z].*\.js$"; then
    echo "================================================"
    echo "  ARQUITECTO: Nuevo modulo detectado"
    echo "  $BASENAME"
    echo "  Verifica que siga la estructura del proyecto:"
    echo "  - Pagina en src/pages/<modulo>/"
    echo "  - Datos en src/lib/db<Modulo>.js"
    echo "  - Componentes en src/components/<modulo>/"
    echo "  - Ruta registrada en departments.js"
    echo "  Ejecuta /ada-architect para auditoria."
    echo "================================================"
  fi
fi
