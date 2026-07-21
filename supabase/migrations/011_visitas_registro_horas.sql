-- 011_visitas_registro_horas.sql
-- Proposito: segunda parte de la Fase 8-9 del plan de migracion a Supabase.
-- Tablas 'visitas', 'visita_asistentes' (puente N:N con empleados) y
-- 'registro_horas' (Bitacora/Timelogs), reemplazando 'src/lib/dbVisitas.js'
-- (localStorage 'ada_visits') y 'src/lib/dbTimelogs.js' (localStorage
-- 'ada_timelogs'). Depende de la migracion 010 (tabla 'proyectos' ya creada
-- y sembrada).
--
-- Fuente de datos: firebase_export/visits.json (31 registros reales) y
-- firebase_export/timelogs.json (9 registros reales).
--
-- Decisiones tomadas para no perder ni inventar datos:
-- 1) Ningun registro de visits.json trae el campo 'tipo' (visita_obra |
--    reunion_diseno | obsequio) que la tabla nueva exige NOT NULL -- se
--    verifico programaticamente contra las 31 filas, cero tienen el
--    campo. Se asume 'visita_obra' para las 31, por ser el tipo mas
--    comun de la narrativa real en las notas (visitas de avance de obra) --
--    unica inferencia de esta migracion, documentada aqui explicitamente,
--    igual que la inferencia de 'tipo' de pagos_nomina en la migracion 009.
-- 2) La tabla 'empleados' (migracion 007/009) no tiene columna 'legacy_id'
--    (no fue necesaria hasta ahora). 'visita_asistentes'/'registro_horas'
--    necesitan mapear los ids legado de empleado -- se agrega la columna
--    'legacy_id' a 'empleados' aqui mismo (retroactiva para los 9 ya
--    sembrados, emparejados por nombre exacto, verificado 1 a 1 sin
--    ambiguedad) para no depender de matching por nombre en el futuro.
-- 3) Los campos 'time'/'topic'/'amount'/'invoiced' del JSON legado son
--    inconsistentes (algunas visitas los traen, otras no) -- se preservan
--    tal cual: 'topic' vacio -> NULL, 'amount' ausente -> 0, 'invoiced'
--    ausente -> false. No se inventa valor donde no existia.

BEGIN;

-- ============================================================
-- 0) empleados.legacy_id (retroactiva, ver nota 2 arriba)
-- ============================================================
ALTER TABLE public.empleados ADD COLUMN legacy_id text UNIQUE;

CREATE TEMP TABLE _map_empleados_nombre (old_id text PRIMARY KEY, nombre text NOT NULL);
INSERT INTO _map_empleados_nombre (old_id, nombre) VALUES
  ('id_mqqu46fz9351o', 'JUAN SEBASTIAN GUTIERREZ'),
  ('id_mr12o1mhkriek', 'ALEJANDRA DURAN AGUDELO'),
  ('id_mr12s70w8ydjz', 'PABLO NOVOA'),
  ('id_mr12tsqn3c7f8', 'JULIANA TORRES'),
  ('id_mr1301msbkgf2', 'ANGELICA MONRROY'),
  ('id_mr133i2k9nhmt', 'JUAN DAVID DIAZ VILLEGAS'),
  ('id_mr3ljouka8r0z', 'DAVID MANZANO'),
  ('id_mr3lksg34ub79', 'LUISA FRANCHESCA MARIN'),
  ('id_mrdrp6d8rf1dk', 'CLAUDIA ALEJANDRA CASTILLO');

UPDATE public.empleados e
SET legacy_id = m.old_id
FROM _map_empleados_nombre m
WHERE e.nombre = m.nombre;

DO $$
DECLARE v_sin_legacy integer;
BEGIN
  SELECT count(*) INTO v_sin_legacy FROM public.empleados WHERE legacy_id IS NULL;
  IF v_sin_legacy > 0 THEN
    RAISE EXCEPTION 'Hay % empleados sin legacy_id resuelto -- revisar coincidencia de nombres antes de continuar', v_sin_legacy;
  END IF;
END $$;

-- ============================================================
-- 1) visitas
-- ============================================================
CREATE TABLE public.visitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  legacy_id text UNIQUE,
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'visita_obra' CHECK (tipo IN ('visita_obra','reunion_diseno','obsequio')),
  fecha date,
  tema text,
  notas text,
  monto numeric(12,2) NOT NULL DEFAULT 0,
  facturado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_visitas_proyecto_id ON public.visitas (proyecto_id);
CREATE INDEX idx_visitas_tenant_fecha ON public.visitas (tenant_id, fecha);

ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY claude_readonly_select ON public.visitas
  FOR SELECT TO claude_readonly USING (true);

CREATE POLICY visitas_select ON public.visitas
  FOR SELECT TO authenticated
  USING (auth_rol() IN ('admin','gerencia','coordinador'));

CREATE POLICY visitas_write ON public.visitas
  FOR ALL TO authenticated
  USING (auth_rol() IN ('admin','coordinador'))
  WITH CHECK (auth_rol() IN ('admin','coordinador'));

-- ============================================================
-- 2) visita_asistentes (tabla puente N:N)
-- ============================================================
CREATE TABLE public.visita_asistentes (
  tenant_id text NOT NULL DEFAULT 'ada',
  visita_id uuid NOT NULL REFERENCES public.visitas(id) ON DELETE CASCADE,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  PRIMARY KEY (visita_id, empleado_id)
);

ALTER TABLE public.visita_asistentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY claude_readonly_select ON public.visita_asistentes
  FOR SELECT TO claude_readonly USING (true);

CREATE POLICY visita_asistentes_select ON public.visita_asistentes
  FOR SELECT TO authenticated
  USING (auth_rol() IN ('admin','gerencia','coordinador'));

CREATE POLICY visita_asistentes_write ON public.visita_asistentes
  FOR ALL TO authenticated
  USING (auth_rol() IN ('admin','coordinador'))
  WITH CHECK (auth_rol() IN ('admin','coordinador'));

-- ============================================================
-- 3) registro_horas (Bitacora / Timelogs)
-- ============================================================
CREATE TABLE public.registro_horas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'ada',
  legacy_id text UNIQUE,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  fecha date,
  dias numeric(4,2) NOT NULL CHECK (dias > 0),
  nota text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_registro_horas_proyecto_id ON public.registro_horas (proyecto_id);
CREATE INDEX idx_registro_horas_empleado_id ON public.registro_horas (empleado_id);

ALTER TABLE public.registro_horas ENABLE ROW LEVEL SECURITY;

CREATE POLICY claude_readonly_select ON public.registro_horas
  FOR SELECT TO claude_readonly USING (true);

CREATE POLICY registro_horas_select ON public.registro_horas
  FOR SELECT TO authenticated
  USING (auth_rol() IN ('admin','gerencia','coordinador'));

CREATE POLICY registro_horas_write ON public.registro_horas
  FOR ALL TO authenticated
  USING (auth_rol() IN ('admin','coordinador'))
  WITH CHECK (auth_rol() IN ('admin','coordinador'));

-- ============================================================
-- Tablas temporales de mapeo id-legado -> uuid nuevo (proyectos ya vive en
-- la tabla 'proyectos.legacy_id' desde la migracion 010, no hace falta un
-- _map_proyectos nuevo aqui -- se resuelve con un JOIN directo).
-- ============================================================
CREATE TEMP TABLE _map_visitas (old_id text PRIMARY KEY, new_id uuid NOT NULL DEFAULT gen_random_uuid());

-- ============================================================
-- Seed: visitas (31 registros, firebase_export/visits.json)
-- ============================================================
INSERT INTO _map_visitas (old_id)
SELECT DISTINCT old_id FROM (VALUES
  ('id_mr14pwb0m0wqk'),
  ('id_mr14r591eyfia'),
  ('id_mr14s39i76ox9'),
  ('id_mr1528belakzf'),
  ('id_mr156ju7rsys1'),
  ('id_mr158c3qkoro2'),
  ('id_mr1591an5yajk'),
  ('id_mr16ewrhovfu7'),
  ('id_mr16exziz0a6l'),
  ('id_mr16fyda5sdh7'),
  ('id_mr16pxwrmt0qv'),
  ('id_mr16pyp101z87'),
  ('id_mr16qo0wyxdw0'),
  ('id_mr16sfet0oy2p'),
  ('id_mr16t8x81fo9d'),
  ('id_mr16vf0jupnhy'),
  ('id_mr16wdemjff2l'),
  ('id_mr16x13wf1w2b'),
  ('id_mr16xrl3fny0i'),
  ('id_mr16yifngwqe7'),
  ('id_mr16z6emm35gx'),
  ('id_mr1702kfcf5d7'),
  ('id_mr170lzfyyqfs'),
  ('id_mr17193pmhjbv'),
  ('id_mr6nqitz4p0sy'),
  ('id_mr6nx8sdrlnnd'),
  ('id_mr6nxu55vqcnb'),
  ('id_mr6nz4pu53rtl'),
  ('id_mr6o0anxdy212'),
  ('id_mr6o1laasnbr9'),
  ('id_2w7imiz22mrmk0lah')
) AS ids(old_id);

INSERT INTO public.visitas (id, tenant_id, legacy_id, proyecto_id, tipo, fecha, tema, notas, monto, facturado)
SELECT mv.new_id, 'ada', v.old_id, p.id, v.tipo, v.fecha, v.tema, v.notas, v.monto, v.facturado
FROM (VALUES
  ('id_mr14pwb0m0wqk', 'id_mqtllc2vm60fb', 'visita_obra', '2026-03-26'::date, NULL, 'Visita a obra  por parte de los arq Alejandra, Arq Juan David, Arq Pablo. Se realiza toma de medidas y escucha de requerimientos  de diseño por parte de la cliente, se corroboran medidas y planimetría  comparativas con los planos arquitectónicos, se realiza detalle de especificación.', 0, false),
  ('id_mr14r591eyfia', 'id_mqtllc2vm60fb', 'visita_obra', '2026-04-10'::date, NULL, 'Reunión virtual con los clientes en donde se mostro la nueva distribución arquitectónica, y un acercamiento al diseño de la carpintería tanto del vestier como del mueble de gym,En esta reunión se definió el hecho tener un vestier grande sin perder el baño de la habitación auxiliar', 0, false),
  ('id_mr14s39i76ox9', 'id_mqtllc2vm60fb', 'visita_obra', '2026-04-15'::date, NULL, 'visita maestro Alirio para presupuesto, arq juan Sebastián 2 horas , diseñador pablo y practicante Nataly toma de medidas para iluminación y puntos sanitarios.', 0, false),
  ('id_mr1528belakzf', 'id_mqtllc2vm60fb', 'visita_obra', '2026-04-13'::date, NULL, 'Reunión virtual Ceo ADA y diseñador de carpinteria con clientes, se socializa nueva distribucion de vestier, gimnasio, retroalimentacion para zona de estudio (despacho), y se tocaron varios temas que quedan en el acta de reunion', 0, false),
  ('id_mr156ju7rsys1', 'id_mqtllc2vm60fb', 'visita_obra', '2026-04-27'::date, NULL, 'Visita de inicio de obra, arq juan Sebastián y diseñador pablo, directrices de desmonte y demolición de muros vestiers baño.', 0, false),
  ('id_mr158c3qkoro2', 'id_mqtllc2vm60fb', 'visita_obra', '2026-04-27'::date, NULL, 'Reunión virtual clientes, ceo sola , elección de baño principal .', 0, false),
  ('id_mr1591an5yajk', 'id_mqtllc2vm60fb', 'visita_obra', '2026-04-30'::date, NULL, 'Visita a avance de obra por parte del arq Juan Sebastián y el diseñador Pablo Novoa con proveedor de estructuras metálicas, se hizo revisión estructural de los dinteles y sugerencias para incorporar una viga o columna en la intercepción de las paredes demolidas, y se hizo revisión de avance de obra.', 0, false),
  ('id_mr16ewrhovfu7', 'id_mqtllc2vm60fb', 'visita_obra', '2026-05-05'::date, NULL, 'Visita a avance de obra: El diseñador Pablo Novoa vista avance de obra, encuentra buena limpieza, muebles del baño ppl en la sala, demolición de dinteles de paredes demolidas, retiro de enchapes y pisos de ambos baños pples. Se dejan dudas a resolver en video y en acta de visita.', 0, false),
  ('id_mr16exziz0a6l', 'id_mqtllc2vm60fb', 'visita_obra', '2026-05-05'::date, NULL, 'Visita a avance de obra: El diseñador Pablo Novoa vista avance de obra, encuentra buena limpieza, muebles del baño ppl en la sala, demolición de dinteles de paredes demolidas, retiro de enchapes y pisos de ambos baños pples. Se dejan dudas a resolver en video y en acta de visita.', 0, false),
  ('id_mr16fyda5sdh7', 'id_mqtllc2vm60fb', 'visita_obra', '2026-05-07'::date, NULL, 'Visita y reunión con clientes. La arq Alejandra Durán y el Di Pablo Novoa van a obra para reunión con clientes, se hace un repaso de avance de obra y se hacen preguntas puntuales y revisión de de referentes enviados el día anterior. Adicional se hace revisión para cotizacion con los proveedores de impermeabilización de las duchas', 0, false),
  ('id_mr16pxwrmt0qv', 'id_mqtllc2vm60fb', 'visita_obra', '2026-05-12'::date, NULL, 'Visita a obra con @Pablo Novoa, retoma medidas del área de Vestier principal y conocimiento del espacio.', 0, false),
  ('id_mr16pyp101z87', 'id_mqtllc2vm60fb', 'visita_obra', '2026-05-12'::date, NULL, 'Visita a obra con @Pablo Novoa, retoma medidas del área de Vestier principal y conocimiento del espacio.', 0, false),
  ('id_mr16qo0wyxdw0', 'id_mqtllc2vm60fb', 'visita_obra', '2026-05-15'::date, NULL, 'VISTA DE AVANCE DE OBRA: El diseñador Pablo Novoa realiza inspección de avance de obra, se dejan varias dudas en el video de la visita, entre ellas las reparaciones de muros de los vistieres, encanche para puntos eléctricos, reparación de cielo raso del Vestier ppl, entre otros puntos. Igualmente se hace evidencia el recogido de muebles retirados, pero dejando parte del descolgado de la sala comedor, el retiro de los elementos internos del mueble de linos para poder desmontarlo del mismo, entre otros.', 0, false),
  ('id_mr16sfet0oy2p', 'id_mqtllc2vm60fb', 'visita_obra', '2026-05-19'::date, NULL, 'Visita avance de obra. el Diseñador Pablo Novoa visito el inmueble, reviso lo que se había retirado. Se compartió las observaciones de Alejandra de la visita anterior, y se dejo estipulado el paso a paso de las prioridades, se deja en evidencia el video del recorrido y las observaciones encontradas por el tema retiro de los aires acondicionados', 0, false),
  ('id_mr16t8x81fo9d', 'id_mqtllc2vm60fb', 'visita_obra', '2026-05-25'::date, NULL, 'Reunión con cliente en la galería para revisión de diseño de Vestier y avance de zona de ropas. Se hicieron unos cambios puntuales en el diseño de Vestier y zona de ropas si hay que cambiarlo mas. Esto fue lo hablado mientras yo estuve presente ya que Alejandra siguió en reunión con la cliente', 0, false),
  ('id_mr16vf0jupnhy', 'id_mqtllc2vm60fb', 'visita_obra', '2026-05-26'::date, NULL, 'Visita a obra para toma de medidas de Vestier de alcoba auxiliar, tambien se reviso el tema de cerramiento de la diagonal en vestier principal (zona doña Claudia) que esta pendiente de si se ejecuta o no, tambien un tema de interruptores y puntos de conexion para la iluminacion del vestier (estos se muestran en un video reporte que subira @Pablo Novoa).', 0, false),
  ('id_mr16wdemjff2l', 'id_mqtllc2vm60fb', 'visita_obra', '2026-05-28'::date, NULL, 'Visita a obra por parte de los diseñadores Juan David y Pablo Novoa, reunión con los de SAGO para realización de cotización de sistema eléctrico, avance en refuerzos para el cielo raso y coordinación de actividades de obra con Alirio.', 0, false),
  ('id_mr16x13wf1w2b', 'id_mqtllc2vm60fb', 'visita_obra', '2026-06-02'::date, NULL, 'Visita de avance de obra, el diseñador Pablo Novoa va las 8 am a CONCEPTOS a recoger una pieza de enchape para piso para llevar a PINAMAR, se revisa con CEO para aprobación a lo que requiere cambio de color, por lo que nuevamente se retorna a CONCEPTOS para remplazo, esta nueva pieza se revisa con CEO y es aprobada. Posterior a eso se realizan indicaciones a Alirio para seguimiento de obra. Posterior tanto diseñador Pablo Novoa y Arq Juan sebastian van a las 2 para realizar "tendido en seco" de enchape para paredes del baño ppl, se determina un patron para trabajo de enchape de Alirio, se realiza video de avance y dudas en video de recorrido.', 0, false),
  ('id_mr16xrl3fny0i', 'id_mqtllc2vm60fb', 'visita_obra', '2026-06-04'::date, NULL, 'El diseñador Pablo Novoa visita la obra, se reúne con Erick y Alirio para revisar el tema de demolición de una pared a mover 10 cm en el ingreso del baño ppl. Revisión de avance de obra, inicio de enchapada, valoración de segunda capa de impermeabilización y coordinación con planos de actualización de baño ppl y baño aux ppl. Igualmente se ve el avance en el retiro del enchape de la zona de ropas y avance de nichos de baños antes de enchape de paredes', 0, false),
  ('id_mr16yifngwqe7', 'id_mqtllc2vm60fb', 'visita_obra', '2026-06-10'::date, NULL, 'Visita de avance de obra, llevada de planos eléctricos e instrucciones para inicio de enchapado de baño ppl y baño aux ppl', 0, false),
  ('id_mr16z6emm35gx', 'id_mqtllc2vm60fb', 'visita_obra', '2026-06-11'::date, NULL, 'Reunión con clienta, la arq Aleja, la arq Natalia y el diseñador Pablo Novoa, revision de avance de obra y supervición y resolucion de dudas con equipo de electrica y elquipo de obra
Duración 2 horas', 0, false),
  ('id_mr1702kfcf5d7', 'id_mqtllc2vm60fb', 'visita_obra', '2026-06-16'::date, NULL, 'Visita de avance de obra, para avance de enchapado, supervicion de trabajo de puntos electricos y resolución de dudas del quipo de obra. Toma de medidas de la zona de ropas y lavadoras.', 0, false),
  ('id_mr170lzfyyqfs', 'id_mqtllc2vm60fb', 'visita_obra', '2026-06-16'::date, NULL, 'Visita de avance de obra: se realiza un seguimiento e actividades de Alirio, se ven los resultados de el avance de enchapes de baños ppls, se realiza una planificación con Alirio de actividades para el resto de la semana, se hace revisión de medidas con Jorge para la cotización de vidrios para duchas de los baños, se dejan algunas dudas en video recorrido', 0, false),
  ('id_mr17193pmhjbv', 'id_mqtllc2vm60fb', 'visita_obra', '2026-06-25'::date, NULL, 'Visita de avance de obra: Se lleva desde conceptos el mezclador del baño de los hijos, se recibe y se sube los pisos LVT, se hace revisión de puntos de red para definir cotización de internet, se observa seguimiento de entrega de Alirio para el sabado (Enchape completo de los 4 baños), se recogen 3 lamparas faltantes por traer a galería para su pintada, falta definir color (Champaña o Bronce), Se hace videos de recorrido con dudas para CEO', 0, false),
  ('id_mr6nqitz4p0sy', 'id_mqtlkegidhxxk', 'visita_obra', '2026-07-02'::date, 'Arquitectura', 'visita a obra, arquitecto juan Sebastián, revisión de obra , tiempo 15 minutos @Alejandra castillo', 2500, true),
  ('id_mr6nx8sdrlnnd', 'id_mqtlf5eev9fq0', 'visita_obra', '2026-07-01'::date, NULL, 'reunión virtual, arquitecto juan Sebastián, revisión de cotización vianova, tiempo 15 minutos @Alejandra castillo', 0, false),
  ('id_mr6nxu55vqcnb', 'id_mqtlf5eev9fq0', 'visita_obra', '2026-07-02'::date, 'Interiorismo', 'Reunión virtual arquitecto juan Sebastián, revisión para cotización de piscina, tiempo 15 minutos @Alejandra castillo', 0, false),
  ('id_mr6nz4pu53rtl', 'id_mqtllc2vm60fb', 'visita_obra', '2026-06-30'::date, NULL, 'visita a obra arquitecto juan Sebastián, reunión con Esteban revisión presupuestos duración 1 hora, juan Sebastián revisión obra 1 hora, toma de medidas y marcación en sitio de interiorismo juliana 2 horas, y Pablo visita a obra 3 horas @Alejandra castillo', 0, false),
  ('id_mr6o0anxdy212', 'id_mqtllc2vm60fb', 'visita_obra', '2026-07-02'::date, NULL, '02.07.2026 Visita avance de obra, se encuentra avances y finalizaciones de enchape de baños, boquillas, e inicio de piso en LVT, puntos de internet listos, inicio de la 2da fase de iluminación, recorrido con Andrés (SAGO) de revisión de puntos del plano nuevo, Re cotización de los vidrios para ducha, presencia en reunión virtual para dejar anotaciones en obra, solicitud de varios trabajaos tanto para Alirio como Wilson.

Duración: 3 horas', 0, false),
  ('id_mr6o1laasnbr9', 'id_mqtljegt2g4mx', 'visita_obra', '2026-07-02'::date, NULL, 'visita a obra, arquitecto juan Sebastián, revisión de obra , tiempo 15 minutos @Alejandra castillo', 0, false),
  ('id_2w7imiz22mrmk0lah', 'id_mqtlm5zem9lod', 'visita_obra', '2026-07-15'::date, 'Arquitectura', 'Se reviso en sitio por medio de las escotillas actuales que los muros interiores en mamposteria no tocan las vigas y que no son estructurales, y por ende se puden demoler.', 0, false)
) AS v(old_id, old_proyecto_id, tipo, fecha, tema, notas, monto, facturado)
JOIN _map_visitas mv ON mv.old_id = v.old_id
JOIN public.proyectos p ON p.legacy_id = v.old_proyecto_id;

-- ============================================================
-- Seed: visita_asistentes (normaliza attendeeIds[] de cada visita)
-- ============================================================
INSERT INTO public.visita_asistentes (tenant_id, visita_id, empleado_id)
SELECT DISTINCT 'ada', mv.new_id, e.id
FROM (VALUES
  ('id_mr14pwb0m0wqk', 'id_mr12o1mhkriek'),
  ('id_mr14pwb0m0wqk', 'id_mr12s70w8ydjz'),
  ('id_mr14pwb0m0wqk', 'id_mr133i2k9nhmt'),
  ('id_mr14r591eyfia', 'id_mqqu46fz9351o'),
  ('id_mr14s39i76ox9', 'id_mqqu46fz9351o'),
  ('id_mr14s39i76ox9', 'id_mr12s70w8ydjz'),
  ('id_mr1528belakzf', 'id_mr12o1mhkriek'),
  ('id_mr1528belakzf', 'id_mr12s70w8ydjz'),
  ('id_mr156ju7rsys1', 'id_mqqu46fz9351o'),
  ('id_mr158c3qkoro2', 'id_mr12o1mhkriek'),
  ('id_mr1591an5yajk', 'id_mqqu46fz9351o'),
  ('id_mr16ewrhovfu7', 'id_mr12s70w8ydjz'),
  ('id_mr16exziz0a6l', 'id_mr12s70w8ydjz'),
  ('id_mr16fyda5sdh7', 'id_mr12o1mhkriek'),
  ('id_mr16fyda5sdh7', 'id_mr12s70w8ydjz'),
  ('id_mr16pxwrmt0qv', 'id_mr12s70w8ydjz'),
  ('id_mr16pyp101z87', 'id_mr12s70w8ydjz'),
  ('id_mr16qo0wyxdw0', 'id_mr12s70w8ydjz'),
  ('id_mr16sfet0oy2p', 'id_mr12s70w8ydjz'),
  ('id_mr16t8x81fo9d', 'id_mr12o1mhkriek'),
  ('id_mr16vf0jupnhy', 'id_mr12s70w8ydjz'),
  ('id_mr16wdemjff2l', 'id_mr12s70w8ydjz'),
  ('id_mr16wdemjff2l', 'id_mr133i2k9nhmt'),
  ('id_mr16x13wf1w2b', 'id_mr12s70w8ydjz'),
  ('id_mr16xrl3fny0i', 'id_mr12s70w8ydjz'),
  ('id_mr16yifngwqe7', 'id_mr12o1mhkriek'),
  ('id_mr16z6emm35gx', 'id_mr12s70w8ydjz'),
  ('id_mr1702kfcf5d7', 'id_mqqu46fz9351o'),
  ('id_mr170lzfyyqfs', 'id_mqqu46fz9351o'),
  ('id_mr17193pmhjbv', 'id_mr12o1mhkriek'),
  ('id_mr6nqitz4p0sy', 'id_mqqu46fz9351o'),
  ('id_mr6nx8sdrlnnd', 'id_mqqu46fz9351o'),
  ('id_mr6nxu55vqcnb', 'id_mqqu46fz9351o'),
  ('id_mr6nz4pu53rtl', 'id_mr12s70w8ydjz'),
  ('id_mr6o1laasnbr9', 'id_mqqu46fz9351o'),
  ('id_2w7imiz22mrmk0lah', 'id_mr3ljouka8r0z'),
  ('id_2w7imiz22mrmk0lah', 'id_mqqu46fz9351o')
) AS a(old_visita_id, old_empleado_id)
JOIN _map_visitas mv ON mv.old_id = a.old_visita_id
JOIN public.empleados e ON e.legacy_id = a.old_empleado_id;

-- ============================================================
-- Seed: registro_horas (9 registros, firebase_export/timelogs.json)
-- ============================================================
INSERT INTO public.registro_horas (id, tenant_id, legacy_id, empleado_id, proyecto_id, fecha, dias, nota)
SELECT gen_random_uuid(), 'ada', v.old_id, e.id, p.id, v.fecha, v.dias, v.nota
FROM (VALUES
  ('id_mr13fsxnltpdn', 'id_mqqu46fz9351o', 'id_mqtlf5eev9fq0', '2026-06-05'::date, 0.5, NULL),
  ('id_mr13ga56u7s4p', 'id_mqqu46fz9351o', 'id_mqtlf5eev9fq0', '2026-06-12'::date, 2.5, NULL),
  ('id_mr13gv5it2kxt', 'id_mqqu46fz9351o', 'id_mqtlf5eev9fq0', '2026-06-19'::date, 2, NULL),
  ('id_mr13i5th65ynh', 'id_mqqu46fz9351o', 'id_mqtlf5eev9fq0', '2026-06-26'::date, 2, NULL),
  ('id_3qa1w5dd6mrmdrt8h', 'id_mrdrp6d8rf1dk', 'id_mrm3ryim5m8h1', '2026-07-15'::date, 0.5, 'Registrado desde Bitácora'),
  ('id_anmjo5yrfmrmjwrs8', 'id_mqqu46fz9351o', 'id_mrm3ryimpn9bw', '2026-07-15'::date, 0.25, 'Registrado desde Bitácora'),
  ('id_ruoh5lrg4mrmjx4m8', 'id_mqqu46fz9351o', 'id_mqtlf5eev9fq0', '2026-07-15'::date, 0.25, 'Registrado desde Bitácora'),
  ('id_vvmf9txpjmrmjxgaj', 'id_mqqu46fz9351o', 'id_mrm3ryimexb1l', '2026-07-15'::date, 0.25, 'Registrado desde Bitácora'),
  ('id_nifdz4drgmrmjxszc', 'id_mqqu46fz9351o', 'id_mrm3ryimmsqj0', '2026-07-15'::date, 0.25, 'Registrado desde Bitácora')
) AS v(old_id, old_empleado_id, old_proyecto_id, fecha, dias, nota)
JOIN public.empleados e ON e.legacy_id = v.old_empleado_id
JOIN public.proyectos p ON p.legacy_id = v.old_proyecto_id;

-- ============================================================
-- Verificacion de conteos (debe imprimir 31 visitas, 9 registro_horas,
-- y el total de vinculos visita_asistentes)
-- ============================================================
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.visitas; RAISE NOTICE 'visitas: %', v_count;
  SELECT count(*) INTO v_count FROM public.visita_asistentes; RAISE NOTICE 'visita_asistentes: %', v_count;
  SELECT count(*) INTO v_count FROM public.registro_horas; RAISE NOTICE 'registro_horas: %', v_count;
  SELECT count(*) INTO v_count FROM public.empleados WHERE legacy_id IS NOT NULL; RAISE NOTICE 'empleados con legacy_id: %', v_count;
END $$;

COMMIT;
