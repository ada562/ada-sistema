#!/bin/bash
# Hook: PostToolUse (Bash) — git commit
# Detecta commits y recuerda ejecutar revision de codigo

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"command"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')

if echo "$COMMAND" | grep -qi "git commit"; then
  # Contar archivos cambiados
  CHANGED=$(cd /c/dev/ada-gestion 2>/dev/null && git diff --name-only HEAD~1 2>/dev/null | wc -l | tr -d ' ')

  if [ "$CHANGED" -gt 3 ]; then
    echo "================================================"
    echo "  REVISOR: Commit con $CHANGED archivos modificados"
    echo "  Considera ejecutar /ada-reviewer para"
    echo "  verificar calidad del codigo."
    echo "================================================"
  fi
fi
