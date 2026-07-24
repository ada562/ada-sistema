-- 029_presupuesto_cotizacion.sql
-- Proposito: modulo "Presupuesto" por proyecto. Primera entrega: solo la
-- vista "Cotizacion" (categorias de obra con items -- cantidad, costo,
-- estado, anotaciones -- subtotal + Acompanamiento de obra, total). Pedido
-- explicito de la usuaria mostrando ejemplos reales (cotizacion PINAMAR
-- 1701) y aclarando que "Cotizacion" y las hojas de margen (Compras y
-- Proveedores, costo original vs costo ADA) van todas bajo un mismo modulo
-- "Presupuesto" -- se sienta la estructura general ahora (columna 'modo')
-- pero solo se construye la UI de Cotizacion en este corte; 'compra' queda
-- listo para una siguiente entrega sin nueva migracion.
--
-- Se crean 2 tablas nuevas en vez de extender 'servicios_proyecto': ese
-- modelo es 1 fila = 1 contrato/servicio (usado tambien para clasificar
-- horas en Bitacora, migracion 028) y no tiene granularidad de items. Se
-- deja un link opcional 'servicio_id' por si una categoria de presupuesto
-- coincide con un servicio ya existente.
--
-- Visibilidad: admin + gerencia unicamente (igual que 'servicios_proyecto'
-- y 'proyectos.valor_contrato') -- incluye margenes/ganancia ADA en el
-- modo 'compra', informacion comercialmente sensible que no debe llegar a
-- coordinador ni empleado.
--
-- Dependencias: 002 (auth_rol), 004 (fn_audit_trigger), 010 (proyectos,
-- servicios_proyecto).

BEGIN;

CREATE TABLE public.presupuesto_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  servicio_id uuid REFERENCES public.servicios_proyecto(id) ON DELETE SET NULL,
  grupo text,
  nombre text NOT NULL,
  modo text NOT NULL DEFAULT 'obra' CHECK (modo IN ('obra','compra')),
  acompanamiento_pct numeric(5,2) NOT NULL DEFAULT 10,
  orden int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_presupuesto_categorias_proyecto ON public.presupuesto_categorias (proyecto_id);
CREATE INDEX idx_presupuesto_categorias_servicio ON public.presupuesto_categorias (servicio_id);

CREATE TABLE public.presupuesto_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  categoria_id uuid NOT NULL REFERENCES public.presupuesto_categorias(id) ON DELETE CASCADE,
  descripcion text NOT NULL,
  cantidad numeric(12,2) NOT NULL DEFAULT 1,
  costo_unitario numeric(14,2) NOT NULL DEFAULT 0,
  costo_original numeric(14,2),
  costo_ada numeric(14,2),
  proveedor text,
  personal text,
  estado text NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente','Aprobado','En producción','Entregado')),
  porcentaje_avance numeric(5,2),
  fecha_probable_fin date,
  anotaciones text,
  orden int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_presupuesto_items_categoria ON public.presupuesto_items (categoria_id);

ALTER TABLE public.presupuesto_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY claude_readonly_select_presupuesto_categorias ON public.presupuesto_categorias
  FOR SELECT TO claude_readonly USING (true);
CREATE POLICY claude_readonly_select_presupuesto_items ON public.presupuesto_items
  FOR SELECT TO claude_readonly USING (true);

CREATE POLICY presupuesto_categorias_select ON public.presupuesto_categorias
  FOR SELECT TO authenticated
  USING (auth_rol() IN ('admin','gerencia'));

CREATE POLICY presupuesto_categorias_write ON public.presupuesto_categorias
  FOR ALL TO authenticated
  USING (auth_rol() IN ('admin','gerencia'))
  WITH CHECK (auth_rol() IN ('admin','gerencia'));

CREATE POLICY presupuesto_items_select ON public.presupuesto_items
  FOR SELECT TO authenticated
  USING (auth_rol() IN ('admin','gerencia'));

CREATE POLICY presupuesto_items_write ON public.presupuesto_items
  FOR ALL TO authenticated
  USING (auth_rol() IN ('admin','gerencia'))
  WITH CHECK (auth_rol() IN ('admin','gerencia'));

CREATE TRIGGER trg_audit_presupuesto_categorias
  AFTER INSERT OR UPDATE OR DELETE ON public.presupuesto_categorias
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER trg_audit_presupuesto_items
  AFTER INSERT OR UPDATE OR DELETE ON public.presupuesto_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

ALTER PUBLICATION supabase_realtime ADD TABLE public.presupuesto_categorias;
ALTER PUBLICATION supabase_realtime ADD TABLE public.presupuesto_items;

-- Modulo 'presupuesto' para usePermission() -- admin ya tiene bypass total,
-- gerencia necesita la fila explicita para leer/escribir.
INSERT INTO public.permisos (rol, modulo, accion) VALUES
  ('gerencia', 'presupuesto', 'leer'),
  ('gerencia', 'presupuesto', 'escribir');

COMMIT;
