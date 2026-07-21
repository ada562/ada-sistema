# Repositorios de GitHub — Alejandra Durán Agudelo Interiores

Catálogo de repositorios open source evaluados para la app 360 de la firma de arquitectura
y diseño de interiores. Misma metodología del catálogo de Casinos La Riviera: **licencia
verificada contra el archivo LICENSE real** (no el marketing), último release, costo de
self-host, superficie de integración y veredicto.

**Contexto:** 5-15 empleados, trabajo por proyectos, varias PCs. SaaS actuales a reemplazar/integrar:
Asana, Slack, WhatsApp, Canva, D5 Render, SketchUp, AutoCAD.
**Stack de referencia de la app 360:** React + Supabase + Vercel (playbook La Riviera).

**Leyenda:** ✅ recomendado · 🔜 pendiente de adoptar · 📖 referencia · ⚠️ con reservas · ❌ descartado

*Última actualización: 13/07/2026 — 1ª ronda (4 agentes de investigación en paralelo, ~30 repos verificados).*

---

## 1. Gestión de proyectos (reemplazo de Asana)

| Repo | Estado | Licencia verificada | Último release | Veredicto |
|---|---|---|---|---|
| [OpenProject](https://github.com/opf/openproject) | ✅ ⭐ | GPLv3 (LICENSE real; NO es open-core — Enterprise vende soporte/add-ons, sin rug-pull) | 17.6.0 — 08/07/2026 | **La apuesta segura**: Kanban + Gantt real + campos custom por proyecto (cliente/presupuesto) + API REST v3 completa (OpenAPI) + webhooks + español. Docker compose, 4GB RAM hasta 200 usuarios. Único pero: SSO es add-on Enterprise (irrelevante si la app 360 maneja el auth) |
| [Taiga](https://github.com/taigaio/taiga-back) | ✅ | MPL-2.0 (cambió DE AGPL a MPL en 2021 — se volvió MÁS permisiva) | 6.10.2 — 02/07/2026, commits diarios | Custom fields nativos, webhooks, la licencia más limpia del grupo. ~5 contenedores. Mejor si prefieren Scrum/Kanban sobre Gantt formal. No confundir con "Taiga Next"/Tenzu (proyecto aparte inmaduro) |
| [Worklenz](https://github.com/Worklenz/worklenz) | ⚠️ | AGPL-3.0 ok interno, sin split CE/EE | v2.1.7 — 02/2026, push 06/2026 | Gantt nativo + español confirmado + app móvil + portal de cliente, PERO API sin documentar, sin webhooks confirmados, sin SSO (issue abierto) — débil para integrar a la app 360 |
| [Vikunja](https://github.com/go-vikunja/vikunja) | ⚠️ | AGPL-3.0 ok interno (ya sin la cláusula no-compete de 2021) | v2.3.0 — 04/2026 | El self-host más simple (1 contenedor, 1GB RAM), OIDC gratis en core, webhooks HMAC — pero **sin custom fields** (request abierto desde 2021): cliente/presupuesto solo vía labels |
| [Leantime](https://github.com/Leantime/leantime) | ⚠️ | AGPL core, **rug-pull parcial**: custom fields / Program Mgmt / Strategy son plugins de PAGO | v3.9.8 — 08/07/2026 | Muy activo y el mejor español LatAm (es-419), pero el campo que la firma necesita (custom fields) es de pago. JSON-RPC, no REST |
| [Plane](https://github.com/makeplane/plane) | ⚠️ | AGPL-3.0 real (CE); open-core: SSO y app móvil = Commercial Edition | v1.3.1 — 05/2026, push diario | CE cubre Kanban/Gantt/custom fields/API/webhooks, pero móvil self-host requiere edición de pago. ~13 contenedores |
| [Huly](https://github.com/hcengineering/platform) | ❌ | EPL-2.0 real | v0.7.426 — 05/07/2026 | **Su cloud cierra el 20/07/2026 por falta de fondos**; self-host 8-15 contenedores / 16GB RAM; el Gantt del marketing NO existe (issue #177 lo confirma). Demasiado pesado y riesgoso |
| [Focalboard](https://github.com/mattermost-community/focalboard) | ❌ | Dual MIT/AGPL confuso | v8.0.0 — 06/2024 | Banner propio: "not maintained". Muerto |
| [ERPNext/Frappe](https://github.com/frappe/erpnext) | ❌ base 360 | Frappe=MIT, ERPNext=GPL-3.0, apps nuevas AGPL | v16.27.0 — 13/07/2026 (vivísimo) | Calidad alta pero acoplamiento total: no se puede aislar "Proyectos" sin correr ~10 contenedores + auth propio que compite con Supabase. Reevaluar SOLO si un día necesitan contabilidad/inventario ERP completos |
| [Odoo Community](https://github.com/odoo/odoo) | ❌ base 360 | LGPLv3 real (Enterprise=OEEL-1 propietaria, repo privado) | Odoo 19.3 — 05/2026, commits diarios | **El Gantt de Proyectos NO está en Community** (verificado en el código fuente: no existe vista Gantt en `addons/project/views`) — es Enterprise. Sin REST nativo (módulo OCA aparte). Mismo problema de doble auth |

## 2. Chat de equipo (reemplazo de Slack)

| Repo | Estado | Licencia verificada | Último release | Veredicto |
|---|---|---|---|---|
| [Zulip](https://github.com/zulip/zulip) | ✅ ⭐ | **Apache-2.0 puro, TODO el código, cero paywall self-host**; desde 2026 gobernado por la Zulip Foundation (sin ánimo de lucro — mínimo riesgo de rug-pull) | Server 12.0 — 04/2026, muy activo | Hilos por tema = ideal para organizar conversación por cliente/proyecto. REST API + 100+ integraciones + bots. Postgres+RabbitMQ+Redis+Memcached (instalador de 1 comando) |
| [Mattermost](https://github.com/mattermost/mattermost) | ✅ | Binarios MIT / fuente AGPL; v11 (10/2025) partió el free: **Team Edition** (MIT, self-host, ≤250 usuarios, sin SSO) vs "Entry" (rate-limited) | v11.x — activo 2026 | El stack más simple (1 binario Go + Postgres, 2-4GB). Team Edition sobra para 5-15 personas. Webhooks compatibles con Slack |
| [Rocket.Chat](https://github.com/RocketChat/Rocket.Chat) | ⚠️ | CE=MIT (fuera de `ee/`), EE propietaria; plan Pro retirado a legacy 04/2026 — reacomodo continuo hacia pago | 8.6.0 — 03/07/2026 | CE limitada a 100 usuarios concurrentes, MongoDB (stack más pesado), historial de mover features a pago. Tercera opción |

## 3. WhatsApp — atención de clientes

| Repo | Estado | Licencia verificada | Último release | Veredicto |
|---|---|---|---|---|
| [Chatwoot](https://github.com/chatwoot/chatwoot) | ✅ ⭐ | MIT core (dir `enterprise/` aparte; self-host CE completo gratis) | v4.13.0 — 04/2026, release c/2 semanas | **Bandeja compartida multiagente ToS-safe**: canal WhatsApp vía **Meta Cloud API oficial** (sin riesgo de baneo — clave para una firma que envía renders/propuestas formales). Widget JS embebible en la app 360, REST API + webhooks, español nativo. Rails+Postgres+Redis ~4GB |
| [Evolution API](https://github.com/EvolutionAPI/evolution-api) | ⚠️ fallback | Apache-2.0 + cláusula de atribución visible obligatoria | v2.3.7 estable (12/2024); rc 2.4.0 05/2026; issues activos jul/2026 | Ya validado en el proyecto Riviera; motor Baileys NO oficial = riesgo real de baneo del número con volumen. Solo como puente mientras se hace el onboarding de Meta Business. Integra nativo con Chatwoot |
| [WAHA](https://github.com/devlikeapro/waha) | ⚠️ | Apache-2.0; desde v2026.6.1 TODAS las features Plus pasaron al core gratis (de-paywall real) | v2026.6.1+ | Intercambiable con Evolution API (mismos motores no oficiales), 1 solo contenedor. Sin ventaja clara sobre Evolution aquí |

## 4. Diseño gráfico (reemplazo de Canva)

| Repo | Estado | Licencia verificada | Último release | Veredicto |
|---|---|---|---|---|
| [fabric.js](https://github.com/fabricjs/fabric.js) | ✅ ⭐ | MIT | v7.4.0 — 2026 | **Base del mini-editor propio tipo Canva** embebido en la app 360: texto editable, filtros, export PNG/SVG/JSON (plantillas de la firma en Supabase). Más completo out-of-the-box que Konva |
| [Excalidraw](https://github.com/excalidraw/excalidraw) | ✅ | MIT | push diario, 127k⭐ | Paquete npm embebible — moodboards y bocetos/esquemas rápidos con clientes |
| [@vercel/og / Satori](https://github.com/vercel/satori) | ✅ | MIT | satori 0.26.0 — 03/2026 | Piezas automáticas desde datos (ficha de proyecto → imagen con logo/fotos/datos). Ya probado en Riviera |
| [Immich](https://github.com/immich-app/immich) | 🔜 | AGPL-3.0 ok interno | v3.0 — 07/2026, release mensual, 107k⭐ | Banco de fotos de obras/proyectos con apps móviles y búsqueda por IA. Solo si el volumen justifica servicio aparte; si no, Supabase Storage |
| [Penpot](https://github.com/penpot/penpot) | 📖 | MPL-2.0 (repo completo, sin gate de features) | v2.16.2 — 01/07/2026 | Excelente para diseño UI/producto, pero NO reemplaza Canva para piezas de marketing con fotos/plantillas |
| [Revideo](https://github.com/redotvideo/revideo) | 📖 | MIT | vivo, pero el equipo migró su foco a Midrender (comercial) | Video programático (reels de proyectos). Vigilar cadencia antes de apostar |
| [react-konva](https://github.com/konvajs/react-konva) | 📖 | MIT | v19.2.5 — 06/2026 | Alternativa a fabric para el editor — integración React más nativa pero menos features de texto/filtros |
| [tldraw](https://github.com/tldraw/tldraw) | ❌ | **Propietaria** ("tldraw license") | activo | Confirmado: requiere license key en producción; tier gratis obliga watermark. No es open source real |
| [LidoJS canva-clone](https://github.com/lidojs/canva-clone) | ❌ | **SIN archivo LICENSE** (= all rights reserved) | push 06/2025 | Solo leer como referencia; ilegal reutilizar |
| [open-design (Clawnify)](https://github.com/clawnify/open-design) | 📖 | MIT | creado 04/2026, 15⭐ | Canva-clone MIT prometedor pero de 3 meses de vida — riesgo de abandono, re-evaluar en 6 meses |

## 5. CAD / 3D / AEC — integración de D5, SketchUp y AutoCAD

> **Decisión de arquitectura: NO se reemplazan las herramientas de autoría.** SketchUp, AutoCAD y D5
> siguen siendo donde el equipo diseña. La app 360 integra sus SALIDAS (modelos, planos, renders)
> para que clientes y equipo las vean en el navegador, por proyecto.

| Repo | Estado | Licencia verificada | Último release | Veredicto |
|---|---|---|---|---|
| [google/model-viewer](https://github.com/google/model-viewer) | ✅ ⭐ | Apache-2.0 | v4.3.1 — 06/2026 | **La ruta más corta para 3D en el navegador**: SketchUp → export glTF/GLB (exportador oficial Khronos) → Supabase Storage → `<model-viewer>` (Web Component, cae directo en React sin wrapper) |
| [pdf.js](https://github.com/mozilla/pdf.js) | ✅ | Apache-2.0 | maduro | Planos: AutoCAD → PDF → visor embebido. La vía práctica y honesta para 2D |
| [vagran/dxf-viewer](https://github.com/vagran/dxf-viewer) | 🔜 | MPL-2.0 | v1.0.48 — 06/2026 | Si se necesita toggle de capas interactivo: AutoCAD → DXF → visor three.js. Solo DXF, NO DWG |
| [Pannellum](https://github.com/mpetroff/pannellum) | 🔜 | MIT | maduro | Visor de panorámicas 360° de D5 Render embebido en la app |
| [Speckle server](https://github.com/specklesystems/speckle-server) | 🔜 futuro | Apache-2.0 (carve-out propietario solo en `workspaces/`+`gatekeeper/`, no necesarios) | v2.31.14 — 06/2026 | Hub de interop AEC con versionado de modelos: conectores AutoCAD/Revit/Rhino v2026.7.0 activos; viewer npm Apache-2.0; API GraphQL. **Conector SketchUp aún beta** ("not ready for general use") — adoptar cuando madure o si entra AutoCAD 3D/Revit al flujo |
| [ThatOpen/engine_components](https://github.com/ThatOpen/engine_components) (ex IFC.js) | 📖 | MIT (web-ifc MPL-2.0) | v3.4.0 — 04/2026 | Solo si algún día necesitan BIM/IFC real (colaboración con constructoras). Overkill para mostrar interiores |
| [Online3DViewer](https://github.com/kovacsv/Online3DViewer) | 📖 | MIT | v0.18.0 — 12/2025 | Multi-formato (OBJ/FBX/IFC) pero cadencia lenta; model-viewer lo domina para glTF |
| [mlightcad/cad-viewer](https://github.com/mlightcad/cad-viewer) | ⚠️ | MIT, pero el path DWG depende de libredwg-web (GPL-3.0) | v1.5.7 — 06/2026 | El único visor DWG open source real — joven, sin XRefs, crashes con algunos DWG. Probar con archivos reales antes de exponer a clientes |
| [xeokit-sdk](https://github.com/xeokit/xeokit-sdk) | ❌ | **AGPL-3.0 + comercial dual** | v2.6.112 — 06/2026 | AGPL contamina una app propietaria servida por red — exigiría licencia comercial |
| LibreDWG / BIMserver / ODA | ❌ | GPL-3 / AGPL / comercial | — | Parser de bajo nivel / peso enterprise / no es open source pese al nombre |
| **Autoría alternativa** (1 línea c/u) | 📖 | — | — | FreeCAD 1.1: BIM real pero paradigma mecánico, no reemplaza SketchUp · Blender 5.1+Cycles: único reemplazo parcial creíble de D5 pero curva alta · Bonsai/BlenderBIM 0.8.5: la apuesta BIM OSS más seria a futuro — observar, no migrar · LibreCAD/SweetHome3D: no profesionales para este caso |

## 6. Offline-first — sincronización local ↔ Supabase (requisito: trabajar en obra sin señal)

> **Requisito del negocio (13/07/2026):** actualizar proyectos/tareas/fotos/notas en obra sin internet
> y sincronizar al reconectar. Ningún reemplazo de Asana lo soporta → el módulo Proyectos se construye
> custom y offline-first en la app 360. Verificado por agente dedicado (licencias contra LICENSE real).

| Repo | Estado | Licencia verificada | Último release | Veredicto |
|---|---|---|---|---|
| [PowerSync](https://github.com/powersync-ja) | ✅ ⭐ | Servicio: FSL-1.1-ALv2 (solo prohíbe revender un sync-service competidor — irrelevante para uso interno; convierte a Apache-2.0 a los 2 años). SDKs cliente: Apache-2.0/MIT | v1.22.0 — 06/2026 | **LA elección**: partner oficial de Supabase (guía en docs.powersync.com), SQLite local + cola de escritura offline + reintentos resueltos de fábrica, sin cambiar el modelo de datos. Self-host Open Edition gratis; plan Free del cloud probablemente alcanza para 5-15 usuarios |
| [ElectricSQL](https://github.com/electric-sql/electric) | 📖 plan B | Apache-2.0 puro (LICENSE verificado) | activo 2026 (pivot de marca a electric.ax, mismo motor) | Licencia perfecta PERO solo sync de LECTURA (shapes Postgres→cliente) — la cola de escrituras offline hay que construirla (TanStack DB / optimistic state). Más ensamblaje que PowerSync |
| [RxDB](https://github.com/pubkey/rxdb) | 📖 | Apache-2.0 core; plugins Pro de pago (el de replicación Supabase es estándar, gratis) | 17.2.0 — 05/2026 | Alternativa madura (desde 2018) con replicación bidireccional Supabase vía PostgREST+Realtime que respeta RLS. Segunda opción sólida |
| Patrón artesanal (PWA + Service Worker + cola IndexedDB) | 📖 | código propio | — | Viable y documentado por la comunidad Supabase para casos simples (LWW, un editor por proyecto), pero todo el orden/reintento/versionado lo mantiene el equipo. Solo si se quiere cero dependencias |
| [Zero (Rocicorp)](https://zero.rocicorp.dev/) | ⚠️ | Apache-2.0 (compromiso de no cambiar) | GA 1.0 — 06/2026 | Recién sale de 2 años de alfa — muy joven para ser el único motor de sync del equipo. Re-evaluar en 2027 |
| [WatermelonDB](https://github.com/nozbe/watermelondb) | ⚠️ | MIT | 0.28 — 04/2025 | Foco React Native, web/PWA secundario, sin adapter Supabase (protocolo de sync a mano) |
| [TinyBase](https://github.com/tinyplex/tinybase) | ⚠️ | MIT | v8.2 — 05/2026 | Sólido pero sin persister Supabase (feature request abierto, issue #204) |
| [Yjs](https://github.com/yjs/yjs) / [Automerge](https://github.com/automerge/automerge) | ❌ este caso | MIT | activos | Son CRDTs de DOCUMENTO (edición simultánea del mismo texto tipo Google Docs), no sync de tablas. Solo si un día se necesita co-edición en vivo de notas largas. Caso real (Cinapse) migró de Automerge a PowerSync por costo/memoria |
| [Triplit](https://github.com/aspen-cloud/triplit) | ❌ | AGPL-3.0 | repo activo pero empresa "Inactive" en trackers (03/2026) | Riesgo doble: copyleft fuerte + posible abandono. Backend propio, no capa sobre Supabase |
| [Jazz](https://github.com/garden-co/jazz) | ❌ | MIT | activo 2026 | Es su propia BD (CoJSON) — obligaría a sacar los datos de Supabase, no a sincronizarlos |

## 7. Pegamento e infraestructura (heredado del catálogo Riviera, aplica igual)

| Repo | Estado | Licencia | Para qué |
|---|---|---|---|
| [Activepieces](https://github.com/activepieces/activepieces) | 🔜 | MIT (core) | Automatización visual entre las piezas (Zapier OSS) — licencia impecable, soporta MCP/Claude |
| [n8n](https://github.com/n8n-io/n8n) | 📖 | Sustainable Use (ok uso interno) | Alternativa con más conectores si Activepieces se queda corto |
| [Uptime Kuma](https://github.com/louislam/uptime-kuma) | 🔜 | MIT | Monitoreo del VPS y los servicios self-hosted desde el día 1 |
| [DocuSeal](https://github.com/docusealco/docuseal) | 🔜 | AGPL ok interno | Firma electrónica de contratos con clientes (cotizaciones/actas aprobadas) — Ley 527/1999 |
| [Cal.com](https://github.com/calcom/cal.com) | 📖 | MIT desde 04/2026 | Agendar visitas de obra / citas con clientes |

---

## Arquitectura 360 recomendada (resumen decisión 13/07/2026)

1. **Corazón custom (playbook Riviera):** app React + Supabase + Vercel con los módulos que son el
   negocio: Proyectos (cliente, presupuesto, etapas), Archivos por proyecto con visores embebidos
   (model-viewer para 3D, pdf.js para planos, galería de renders, Pannellum 360), Portal de cliente,
   Cotizaciones. Aquí está el diferencial — nadie vende "app 360 para estudio de interiores".
2. **Anclas self-hosted en 1 VPS** (~US$20-40/mes, Docker): Chatwoot (WhatsApp oficial),
   Zulip o Mattermost (chat equipo), Uptime Kuma. Integradas a la app por API/webhooks/widget.
3. **Asana:** decisión pendiente — OpenProject como puente inmediato (adoptar ya, integrar por API)
   o construir el módulo Proyectos custom directo en la app (recomendado a mediano plazo).
4. **Canva:** Satori para piezas automáticas + mini-editor fabric.js en la app + Excalidraw para moodboards.
5. **Regla de adaptación:** NUNCA forkear los self-hosted (se pierde el upgrade path) — integrar por
   API/webhook/embed y personalizar por configuración/tema. Código propio solo en la app 360.

---

## Cómo agregar un repo nuevo

Verificar SIEMPRE: (1) archivo LICENSE real en el repo, no el marketing; (2) fecha del último
release y actividad de commits; (3) qué features están detrás de un tier de pago (rug-pull);
(4) costo de self-host (contenedores/RAM); (5) API/webhooks/embeds para integrar a la app 360.
