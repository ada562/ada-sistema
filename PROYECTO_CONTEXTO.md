# ADA Gestión — Contexto del Proyecto
**Actualizado:** 2026-07-15 — Proyecto inicializado desde cero
**Versión app:** v0.1.0

## 1. Estado general
Proyecto recién creado. Stack configurado: React 19 + Vite 6 + Tailwind + Zustand + Supabase.
Datos del prototipo Firebase extraídos como referencia (firebase_export/).

## 2. Módulos (estado)
| # | Módulo | Estado |
|---|--------|--------|
| 1 | Tesorería | 🟡 diseño (próximo) |
| 2 | Contratistas | ⬜ pendiente |
| 3 | Proyectos | ⬜ pendiente |
| 4 | Bitácora / Visitas | ⬜ pendiente |
| 5 | Equipo / Nómina | ⬜ pendiente |
| 6 | Impuestos / Calendario | ⬜ pendiente |
| 7 | Archivos por proyecto | ⬜ pendiente |
| 8 | Portal de cliente | ⬜ pendiente |
| 9 | Categorías / Configuración | ⬜ pendiente |

## 3. Modelo de datos
Por diseñar. Referencia: datos extraídos de Firebase en firebase_export/.
Entidades identificadas: employees, projects, services, transactions, contractors,
contractorPayments, payrollPayments, timelogs, visits, purchases, categories, settings.

## 4. Migraciones SQL
Ninguna aún. Supabase por crear.

## 5. Deuda técnica
- P1: Crear proyecto Supabase y configurar .env
- P2: Definir modelo de datos relacional a partir de los JSON de Firebase
- P3: Definir identidad visual de la firma

## 9. Próxima Sesión — Continuar Aquí
1. Crear proyecto Supabase + configurar .env
2. Diseñar especificación del módulo Tesorería (docs/especificacion/tesoreria.md)
3. Diseñar modelo de datos relacional (docs/modelo-datos/)
4. Rebanada vertical: Tesorería front + capa de datos
