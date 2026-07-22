-- 023_arqueo_caja_supabase.sql
-- Proposito: conectar Arqueo de Caja a Supabase para que sea visible entre
-- dispositivos (bug reportado: el jefe abrio el portal en otro computador y
-- no vio el arqueo que el usuario habia registrado -- src/lib/dbArqueoCaja.js
-- guardaba solo en localStorage, aislado por navegador).
--
-- La tabla y RLS de arqueo_caja ya existen desde la migracion 015 y son
-- correctas (arqueo_caja_select: admin/contabilidad/gerencia; insert:
-- admin/contabilidad) pero nunca se conectaron al frontend, y ademas
-- quedaron fuera de la migracion 021 (habilitar Realtime) por error -- sin
-- eso, aunque se hubiera usado la tabla, no habria sincronizado en vivo.
--
-- Se agrega la columna `denominaciones` (jsonb) porque el recibo impreso
-- (ReciboArqueoCaja.jsx) muestra el detalle de conteo por billete/moneda,
-- que la tabla original no contemplaba.
--
-- Importante: este modulo sigue desacoplado de Tesoreria a proposito (mismo
-- criterio que GBA, ver 016/017 y feedback_gba_desacoplado_tesoreria) -- no
-- se compara contra vw_saldos_cuentas ni se usa RPC con FOR UPDATE NOWAIT,
-- solo se agrega sincronizacion entre dispositivos via Supabase + Realtime.
--
-- Dependencias: arqueo_caja (015), publicacion supabase_realtime (021).

BEGIN;

ALTER TABLE public.arqueo_caja
  ADD COLUMN IF NOT EXISTS denominaciones jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'arqueo_caja'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arqueo_caja;
  END IF;
END $$;

COMMIT;
