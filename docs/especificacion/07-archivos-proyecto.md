# Módulo 7 — Archivos por Proyecto

**Prioridad:** #7. **Estado:** sin datos reales previos — no existía en el prototipo Firebase. Diseño desde cero cuando se aborde.

## Qué hace (según manual de arranque)
Visualizar en el navegador las salidas de las herramientas de diseño que la firma ya usa y **no se van a reemplazar** (SketchUp, AutoCAD, D5 Render): modelos 3D, planos, renders, recorridos 360.

## Alcance propuesto
- Modelos 3D (glTF/GLB) vía `model-viewer`.
- Planos y documentos PDF vía `pdf.js`.
- Recorridos 360° vía Pannellum.
- Organización por proyecto, con versión/fecha de cada archivo.
- Storage: Supabase Storage, un bucket por tipo o por proyecto (definir al implementar).

## Pendiente de definir con la usuaria
- ¿Quién sube los archivos (diseñador, coordinador) y con qué límite de tamaño?
- ¿Se necesita control de versiones (ej. "Render v2 reemplaza a v1" pero se conserva el histórico)?
- ¿Este módulo debe ser visible también desde el Portal de Cliente (#8)?
