#!/bin/bash
# Hook: PostToolUse (Bash)
# Detecta builds y analiza el output para alertar sobre tamano

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"command"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')

if echo "$COMMAND" | grep -qi "npm run build\|vite build"; then
  echo "================================================"
  echo "  OPTIMIZADOR: Build detectado"
  echo "  Revisa el tamano del bundle en dist/"
  echo "  Si supera 500KB (gzip), ejecuta"
  echo "  /ada-optimizer para encontrar mejoras."
  echo "================================================"
fi
