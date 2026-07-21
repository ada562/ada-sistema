#!/bin/bash
# Hook: PostToolUse (Bash) — git push a main
# Recuerda verificar el deploy despues de push

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"command"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')

if echo "$COMMAND" | grep -qi "git push.*main\|git push.*origin"; then
  echo "================================================"
  echo "  DEPLOY: Push a produccion detectado"
  echo "  Vercel hara auto-deploy."
  echo "  Ejecuta /ada-deploy status en ~2 min"
  echo "  para verificar que el deploy fue exitoso."
  echo "  URL: app.adainteriors.co"
  echo "================================================"
fi
