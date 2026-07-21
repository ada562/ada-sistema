# Modelo de Datos — ADA Gestión

**Fuente:** reconstruido a partir de dos fuentes cruzadas —
1. Los datos reales exportados del prototipo Firebase anterior (`legado-adaapp/firebase_export/*.json`, 15/07/2026).
2. La capa de datos mock ya construida en `src/lib/db*.js`, que **ya consume esos JSON** como semilla (`load('ada_x', xData)`).

Es decir: el modelo de abajo no es especulativo — es el que el front actual ya está usando en producción mock. El trabajo de este documento es **formalizarlo como esquema relacional para Supabase**, corrigiendo el error del prototipo original (todo en un JSON gigante) con una fila por registro y claves foráneas reales.

**Convención de todas las tablas (regla de CLAUDE.md):** `id uuid PK`, `tenant_id text DEFAULT 'ada'` como 2ª columna, RLS activo, `created_at timestamptz DEFAULT now()`.

---

## 1. Diagrama de relaciones (alto nivel)

```
proyectos ──1:N── servicios_proyecto
proyectos ──1:N── visitas ──N:N── empleados (via visita_asistentes)
proyectos ──1:N── registro_horas ──N:1── empleados
proyectos ──1:N── transacciones (nullable)
servicios_proyecto ──1:N── transacciones (nullable)

contratistas ──1:N── pagos_contratistas ──1:N── transacciones (vía contractor_payment_id)

empleados ──1:N── pagos_nomina ──1:1── transacciones (auto-generada, vía nomina_payment_id)

configuracion (1 fila por tenant) ── usada por Tesorería y Nómina para cálculos
categorias (catálogo ingreso/gasto) ── referenciada por transacciones.categoria
calendario_tributario ── independiente, sin FK a otras tablas
```

---

## 2. Tablas

### 2.1 `proyectos`
Fuente: `firebase_export/projects.json` (39 registros reales) + `dbProyectos.js`.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | hoy `id_xxxxx` texto — migrar a uuid, mapear ids legado en columna `legacy_id text` |
| tenant_id | text | default 'ada' |
| nombre | text | `name` |
| cliente | text | `client` |
| tipo_servicio | text | `serviceType` (ej. "DELUXE", "LUXE") |
| estado | text | `status`: Activo / Pausado / Finalizado |
| fecha_inicio | date | `startDate` |
| valor_contrato | numeric(14,2) | `contractValue`, COP sin decimales en la práctica |
| iva_pct | numeric(5,2) | `ivaPct` |
| notas | text | |
| es_gba | boolean | `esDeGBA` — proyecto ligado a la entidad financiera GBA (ver §3) |
| paquete_visitas | jsonb | `visitPackage: {visita_obra, reunion_diseno, obsequio}` — cupos incluidos en el contrato |
| created_at, updated_at | timestamptz | |

**Índices:** `(tenant_id, estado)`, `(tenant_id, es_gba)`.

### 2.2 `servicios_proyecto`
Fuente: `services.json` + `dbServicios.js`. Son **sub-contratos dentro de un proyecto** (ej. proyecto "ALEJANDRA CASTILLO" tiene servicio principal "LUXE" + servicio adicional "ACABADOS").

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| tenant_id | text | |
| proyecto_id | uuid FK → proyectos | |
| nombre | text | |
| estado | text | |
| fecha_inicio | date | |
| valor_contrato | numeric(14,2) | |
| iva_pct | numeric(5,2) | |
| cuenta_cobro | text | |
| es_principal | boolean | `isPrimary` — solo un servicio principal por proyecto (constraint a nivel app o índice único parcial) |
| notas | text | |

### 2.3 `empleados`
Fuente: `employees.json` (campos mínimos reales) + `dbEmpleados.js` (esquema **ya ampliado** más allá de lo que trae el JSON — historial laboral completo, seguridad social, documentos).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| tenant_id | text | |
| nombre | text | `name` |
| cedula | text | |
| fecha_nacimiento | date | `birthDate` |
| genero, estado_civil | text | |
| foto_url | text | referencia a Supabase Storage, no base64 |
| telefono, email, direccion, ciudad | text | |
| contacto_emergencia_* | text (4 campos) | nombre, relación, teléfono, dirección |
| cargo | text | `role` |
| departamento | text | |
| supervisor_id | uuid FK → empleados (nullable, self-ref) | hoy es texto libre `supervisor` |
| fecha_ingreso | date | `startDate` |
| tipo_contrato | text | |
| contrato_hasta | date | `contractUntil` — usado para alertas de vencimiento (`getExpiringContracts`) |
| tarifa_mensual | numeric(12,2) | `monthlyRate` |
| salario_no_constitutivo | numeric(12,2) | `nonConstitutiveSalary` |
| carga_pct | numeric(5,2) | `cargaPct` — % de carga prestacional sobre este empleado |
| estado | text | Activo / Vacaciones / Incapacidad / Retirado |
| pin_hash | text | **hoy PIN en texto plano (`pin`) — migrar a hash**, se usa como login rápido en campo |
| eps, pension, arl, caja_compensacion | text | seguridad social Colombia |
| doc_cedula, doc_hoja_vida, doc_contrato, doc_certificados | boolean o mejor `documentos jsonb[]` con URLs a Storage | hoy son flags booleanos, no hay archivo real todavía |

**Nota de seguridad (para /ada-security):** `pin` en texto plano en localStorage hoy. Al migrar, hashear (bcrypt) y nunca exponerlo en `SELECT *`.

### 2.4 `contratistas`
Fuente: `contractors.json` + `dbContratistas.js`.

| Campo | Tipo |
|---|---|
| id | uuid PK |
| tenant_id | text |
| nombre | text |
| telefono | text |
| email | text |
| activo | boolean |
| notas | text |

### 2.5 `pagos_contratistas`
Fuente: `contractorPayments.json`. Es el "estado de cuenta" del contratista — factura/cotización (`amount`) vs. lo efectivamente pagado (`paidAmount`), con abonos parciales.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| tenant_id | text | |
| contratista_id | uuid FK → contratistas | |
| fecha | date | fecha de la cuenta de cobro |
| fecha_abono | date nullable | último abono |
| fecha_pago_total | date nullable | se llena cuando `monto_pagado >= monto` |
| monto | numeric(12,2) | valor total acordado |
| monto_pagado | numeric(12,2) default 0 | acumulado de abonos |
| descripcion | text | |

**Regla de negocio ya codificada** (`registrarAbono()` en dbContratistas.js): cada abono **crea automáticamente una fila en `transacciones`** (gasto, categoría CONTRATISTAS). En Supabase esto debe ser **una función RPC atómica** que inserte en `pagos_contratistas` y `transacciones` en la misma transacción SQL (hoy son dos `save()` separados a localStorage — sin atomicidad).

### 2.6 `pagos_nomina`
Fuente: `payrollPayments.json` + `dbNomina.js`.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| tenant_id | text | |
| empleado_id | uuid FK → empleados | |
| fecha | date | |
| tipo | text | enum: `legal` \| `no_constitutivo` \| `prima_legal` \| `prima_no_constitutivo` |
| quincena | smallint | 1 o 2 |
| periodo_inicio, periodo_fin | date | |
| semestre | smallint nullable | para primas (1 o 2) |
| monto | numeric(12,2) | |
| metodo | text | banco / efectivo / nequi |
| notas | text | |

**Regla de negocio ya codificada:** `registrarPagoNomina()` crea el pago **y** una transacción de gasto (categoría "Nómina") enlazada por `nominaPaymentId`. Mismo caso que contratistas: candidato a RPC atómica.

### 2.7 `transacciones` — el corazón del sistema (Tesorería)
Fuente: `transactions.json` (117 movimientos reales, jun–jul 2026) + `dbTesoreria.js`.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| tenant_id | text | |
| fecha | date | |
| tipo | text | `ingreso` \| `gasto` |
| cuenta | text nullable | `banco` \| `efectivo` \| `nequi` \| **NULL cuando es movimiento GBA puro** (ver §3) |
| monto | numeric(14,2) | |
| categoria | text | referencia a `categorias` (hoy string libre, no FK — ver §2.9) |
| proyecto_id | uuid FK → proyectos, nullable | ~40% de las transacciones no están ligadas a proyecto (gastos generales de operación) |
| servicio_id | uuid FK → servicios_proyecto, nullable | |
| contratista_id | uuid FK → contratistas, nullable | visto en datos recientes (`contractorId`) |
| pago_contratista_id | uuid FK → pagos_contratistas, nullable | enlaza el gasto con el abono que lo generó |
| nomina_payment_id | uuid FK → pagos_nomina, nullable | enlaza el gasto con el pago de nómina que lo generó |
| descripcion | text | |
| gba_movimiento | text nullable | enum: `prestamo_otorgado` \| `prestamo_recibido` \| `pago_prestamo` \| `cobro_prestamo` — ver §3 |
| facturado | boolean default false | si ya se emitió factura/cuenta de cobro |
| created_by | uuid FK → auth.users | auditoría de quién registró el movimiento |
| created_at | timestamptz | **solo INSERT, nunca UPDATE/DELETE de monto** — es el audit trail |

**Regla no negociable de CLAUDE.md aplicada aquí:** toda escritura a `transacciones` debe pasar por una **RPC atómica** (`SELECT ... FOR UPDATE NOWAIT` sobre el saldo de la cuenta afectada) para evitar condiciones de carrera cuando dos personas registran movimientos a la vez sobre la misma cuenta (banco/efectivo/nequi). Los saldos NO se guardan en una columna — se calculan sumando `transacciones` sobre el saldo inicial (`configuracion.saldo_inicial_*`), exactamente como hace hoy `getAccountBalances()`.

### 2.8 `visitas` (Bitácora + Visitas unificadas)
Fuente: `visits.json` (28 registros reales) + `dbVisitas.js`. **Ojo:** en el prototipo, Bitácora y Visitas son la misma tabla, diferenciada por el campo `tipo`. Mantener esa unificación en Supabase (evita duplicar modelo).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| tenant_id | text | |
| proyecto_id | uuid FK → proyectos | |
| tipo | text | `visita_obra` \| `reunion_diseno` \| `obsequio` (coincide con `paquete_visitas` del proyecto) |
| fecha | date | |
| tema | text | `topic` |
| notas | text | texto largo — narrativa de obra, a veces con menciones @persona |
| monto | numeric(12,2) default 0 | costo/valor de la visita si aplica |
| facturado | boolean | `invoiced` |

### 2.9 `visita_asistentes` (tabla puente)
El array `attendeeIds` del JSON original se normaliza en una tabla N:N real.

| Campo | Tipo |
|---|---|
| visita_id | uuid FK → visitas |
| empleado_id | uuid FK → empleados |

PK compuesta `(visita_id, empleado_id)`.

### 2.10 `registro_horas` (Timelogs)
Fuente: `timelogs.json` + `dbTimelogs.js`. Alimenta el cálculo de rentabilidad por proyecto (`getProjectMetrics` cruza `días × tarifa_diaria_empleado`).

| Campo | Tipo |
|---|---|
| id | uuid PK |
| tenant_id | text |
| empleado_id | uuid FK → empleados |
| proyecto_id | uuid FK → proyectos |
| fecha | date |
| dias | numeric(4,2) | fracciones válidas: 0.25, 0.5, 1, 2, etc. |
| nota | text |

### 2.11 `categorias`
Fuente: `categories.json` — hoy es **un JSON con dos arrays de strings** (`gasto: [...]`, `ingreso: [...]`), no una tabla. Se normaliza:

| Campo | Tipo |
|---|---|
| id | uuid PK |
| tenant_id | text |
| tipo | text: `ingreso` \| `gasto` |
| nombre | text |
| activa | boolean default true |

Una vez creada esta tabla, `transacciones.categoria` pasa a ser FK (`categoria_id`) en vez de texto libre — elimina errores de tipeo que ya se ven en los datos reales (ej. "TRASNPORTE" mal escrito junto a "TRANSPORTE").

### 2.12 `configuracion`
Fuente: `settings.json` + `dbSettings.js`. Una sola fila por tenant — parámetros usados en cálculos de nómina y cotizaciones.

| Campo | Tipo | Valor real actual |
|---|---|---|
| tenant_id | text PK | 'ada' |
| dias_laborales_mes | smallint | 23 |
| carga_prestacional_pct | numeric(5,2) | 29 |
| iva_pct | numeric(5,2) | 19 |
| imprevistos_pct | numeric(5,2) | 5 |
| administracion_pct | numeric(5,2) | 15 |
| utilidad_pct | numeric(5,2) | 30 |
| saldo_inicial_banco | numeric(14,2) | 2.792.626 |
| saldo_inicial_efectivo | numeric(14,2) | 4.868.250 |
| saldo_inicial_nequi | numeric(14,2) | 201.471 |
| saldo_inicial_fecha | date | fecha de corte del saldo inicial — **falta en el JSON original, agregar** (sin esto, calcular saldo a una fecha pasada es ambiguo) |

### 2.13 `calendario_tributario`
Fuente: `dbCalendario.js` — **no viene del export**, son datos por defecto ya escritos a mano en el mock (Movistar, Planillas, Leasing, ICA, Primas). Confirma que este módulo (#6 del plan, "Impuestos/Calendario") ya tiene un esqueleto de datos reales de la empresa.

| Campo | Tipo |
|---|---|
| id | uuid PK |
| tenant_id | text |
| nombre | text |
| frecuencia | text: mensual / bimestral / semestral |
| dia_del_mes | smallint |
| monto | numeric(12,2) |
| notas | text |

### 2.14 `compras` (Purchases)
Fuente: `purchases.json` → **array vacío**, sin uso real todavía y sin `db*.js` propio. Placeholder — no crear tabla hasta que haya un caso de uso concreto (evita modelar en el vacío).

### 2.15 Auth / usuarios
Fuente: `dbAuth.js` — hoy usuario `admin`/`ada` **en texto plano en localStorage**. Al migrar: **Supabase Auth** (`auth.users`) + tabla `perfiles` (id FK → auth.users, tenant_id, nombre, rol) para el RBAC. Esto es deuda P2 ya anotada en `PROYECTO_CONTEXTO.md`; con este modelo queda además especificado el reemplazo concreto.

---

## 3. Caso especial: GBA

`GBA` aparece dos veces en los datos, con significados distintos que hay que preservar:

1. **`proyectos.es_gba`** — marca proyectos que pertenecen a la línea de negocio/cliente "GBA" (ej. "ALBURQUERQUE GBA", "AP 9 GBA"). Es una **etiqueta de proyecto**.
2. **`transacciones.gba_movimiento`** — GBA actúa además como **una entidad financiera externa que presta y recibe dinero** de ADA (`prestamo_otorgado`, `prestamo_recibido`, `pago_prestamo`, `cobro_prestamo`), con `cuenta = NULL` porque el dinero no entra/sale de banco/efectivo/nequi directamente sino que es un movimiento de deuda entre ADA y GBA.

**Recomendación para el modelo de datos definitivo:** antes de escribir la migración SQL, confirmar con la usuaria si "GBA" es una empresa relacionada/persona natural con la que ADA tiene cuentas cruzadas — de ser así, merece su propia tabla `entidades_relacionadas` (id, nombre, tipo) en vez de vivir solo como un enum de texto en `transacciones`, para poder mostrar un "estado de cuenta con GBA" igual que se hace con contratistas.

---

## 4. Lo que el modelo actual NO resuelve todavía

- **Offline (PowerSync):** este esquema es el que PowerSync replicará localmente. El módulo de campo (visitas + registro_horas) es el candidato a sync rules primero, según el manual de arranque.
- **Portal de cliente / Archivos por proyecto (3D, PDF, renders):** no hay entidades para esto en los datos exportados — se diseñan desde cero cuando se aborde ese módulo (prioridad baja según el manual).
- **RLS y RBAC:** este documento define tablas y relaciones, no políticas. Las políticas RLS y el RPC atómico de `transacciones` van en la migración SQL (`/ada-sql`), no aquí.
