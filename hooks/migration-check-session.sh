#!/bin/bash
# Hook: SessionStart
# Revisa si hay migraciones SQL pendientes de documentar o ejecutar

MIGRATIONS_DIR="supabase/migrations"
REGISTRY="supabase/MIGRATIONS.md"

# Verificar si existen migraciones
if [ ! -d "$MIGRATIONS_DIR" ]; then
  exit 0
fi

SQL_FILES=$(find "$MIGRATIONS_DIR" -name "*.sql" 2>/dev/null | sort)

if [ -z "$SQL_FILES" ]; then
  exit 0
fi

# Contar migraciones
TOTAL=$(echo "$SQL_FILES" | wc -l | tr -d ' ')

# Verificar cuales estan pendientes en MIGRATIONS.md
PENDING=0
NOT_DOCUMENTED=0

for f in $SQL_FILES; do
  BASENAME=$(basename "$f")
  if [ -f "$REGISTRY" ]; then
    if grep -q "$BASENAME" "$REGISTRY"; then
      if grep -q "$BASENAME.*Pendiente" "$REGISTRY"; then
        PENDING=$((PENDING + 1))
      fi
    else
      NOT_DOCUMENTED=$((NOT_DOCUMENTED + 1))
    fi
  else
    NOT_DOCUMENTED=$((NOT_DOCUMENTED + 1))
  fi
done

# Mostrar resumen solo si hay algo pendiente
if [ $PENDING -gt 0 ] || [ $NOT_DOCUMENTED -gt 0 ]; then
  echo "================================================"
  echo "  MIGRACIONES SQL - ADA Gestion"
  echo "================================================"
  echo "  Total migraciones: $TOTAL"

  if [ $PENDING -gt 0 ]; then
    echo "  Pendientes de ejecutar: $PENDING"
  fi

  if [ $NOT_DOCUMENTED -gt 0 ]; then
    echo "  Sin documentar: $NOT_DOCUMENTED"
    echo ""
    echo "  Usa /ada-sql para documentar migraciones pendientes"
  fi

  echo "================================================"
fi
