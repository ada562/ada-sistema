#!/bin/bash
# Hook: PostToolUse (Bash) — git push
# Recuerda documentar antes de pushear a produccion

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"command"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')

if echo "$COMMAND" | grep -qi "git push"; then
  # Verificar si hay docs desactualizadas
  DOCS_DIR="/c/dev/ada-gestion/docs"

  if [ ! -d "$DOCS_DIR" ] || [ -z "$(ls -A $DOCS_DIR 2>/dev/null)" ]; then
    echo "================================================"
    echo "  DOCS: Push detectado sin documentacion"
    echo "  La carpeta docs/ esta vacia."
    echo "  Ejecuta /ada-docs estado para generar"
    echo "  documentacion del proyecto."
    echo "================================================"
  fi
fi
