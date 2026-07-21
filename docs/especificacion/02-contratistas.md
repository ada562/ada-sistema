# Módulo 2 — Contratistas

**Prioridad:** #2 — ligado directamente a Tesorería.
**Offline:** no.
**Estado actual:** funcional en mock, 5 contratistas reales, 5 cuentas de cobro reales.

## Qué hace
Gestiona proveedores externos (fotógrafos, asesores, diseñadores freelance, etc.) y sus cuentas de cobro, con seguimiento de abonos parciales hasta pago total.

## Pantallas
1. **Listado de contratistas** — nombre, teléfono, email, estado (activo/inactivo).
2. **Ficha de contratista** — resumen financiero: total facturado, total pagado, pendiente, # de cuentas de cobro (`getContratistaResumen()`).
3. **Cuentas de cobro** — por contratista: fecha, descripción, monto, monto pagado, estado (pendiente/parcial/pagado).
4. **Registrar abono** — monto, fecha, método de pago (banco/efectivo/nequi) → genera automáticamente un gasto en Tesorería (categoría CONTRATISTAS).

## Flujo de negocio clave
```
Cuenta de cobro creada (monto=X, pagado=0)
  → Abono 1 (registrarAbono) → pagado += abono → gasto en Tesorería
  → Abono 2 (registrarAbono) → pagado += abono → gasto en Tesorería
  → cuando pagado >= monto → fecha_pago_total se completa automáticamente
```

## Regla no negociable
`registrarAbono()` debe ser una **RPC atómica** que inserte en `pagos_contratistas` (actualiza `monto_pagado`) y en `transacciones` (gasto) en la misma transacción SQL — hoy son dos escrituras separadas sin atomicidad real (localStorage).

## Datos reales de referencia
Contratistas actuales: Sergio Pineda (asesoría financiera), Valeria Luna Ramírez (redes sociales), Carlos Eduardo López Ramos, Carolina Valencia, Nataly Galvez (páginas web, pago por Nequi).
