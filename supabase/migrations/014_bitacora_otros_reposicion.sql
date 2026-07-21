-- 014_bitacora_otros_reposicion.sql
-- Proposito: tres ajustes a 'registro_horas' pedidos por el usuario tras
-- probar el nuevo calendario semanal de Bitacora (BitacoraSemanaGrid.jsx):
--
-- 1) BUG real encontrado al revisar este pedido: la migracion 011 creo
--    'registro_horas.dias' con CHECK (dias > 0). La funcionalidad "Festivo"
--    (agregada despues, sesion de rediseño del calendario) guarda una fila
--    con dias=0 + nota='Festivo' -- nunca se probo contra la base de datos
--    real y el INSERT/UPDATE habria fallado con 23514. Se relaja a
--    CHECK (dias >= 0).
-- 2) 'proyecto_id' pasa a nullable: nueva fila "Otros" en el calendario para
--    actividades que no pertenecen a ningun proyecto (ej. trabajo interno,
--    administrativo) -- el empleado debe describir que hizo, por eso el
--    nuevo CHECK exige 'nota' no vacia cuando no hay proyecto.
-- 3) "Reposicion" (dia de fin de semana trabajado que se compensa despues)
--    NO requiere cambios de esquema -- se persiste con la misma convencion
--    de 'nota' ya usada por "Festivo" (nota='Reposición', dias>0). Se deja
--    documentado aqui para que quede junto al resto de la decision.
--
-- Dependencias: 011 (registro_horas ya existe).

BEGIN;

-- ============================================================
-- 1) dias >= 0 (permite dias=0 para filas "Festivo")
-- ============================================================
DO $$
DECLARE v_conname text;
BEGIN
  SELECT con.conname INTO v_conname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY (con.conkey)
  WHERE rel.relname = 'registro_horas' AND con.contype = 'c' AND att.attname = 'dias';
  IF v_conname IS NULL THEN
    RAISE EXCEPTION 'No se encontro el CHECK constraint de registro_horas.dias -- revisar antes de continuar';
  END IF;
  EXECUTE format('ALTER TABLE public.registro_horas DROP CONSTRAINT %I', v_conname);
END $$;

ALTER TABLE public.registro_horas ADD CONSTRAINT registro_horas_dias_check CHECK (dias >= 0);

-- ============================================================
-- 2) proyecto_id nullable + nota obligatoria para filas "Otros"
-- ============================================================
ALTER TABLE public.registro_horas ALTER COLUMN proyecto_id DROP NOT NULL;

ALTER TABLE public.registro_horas ADD CONSTRAINT registro_horas_otros_requiere_nota
  CHECK (proyecto_id IS NOT NULL OR (nota IS NOT NULL AND btrim(nota) <> ''));

COMMIT;
