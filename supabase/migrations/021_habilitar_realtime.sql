-- 021_habilitar_realtime.sql
-- Proposito: aditiva/config. Diagnostico del reporte "no me resta" en Tesoreria:
-- el calculo de saldos (vw_saldos_cuentas) es correcto (verificado directo en la
-- base de datos), pero la pantalla mostraba un valor viejo. Causa raiz: ninguna
-- migracion anterior agrego las tablas a la publicacion `supabase_realtime`, asi
-- que los canales `.channel(...).on('postgres_changes', ...)` que usan los stores
-- de Zustand (initRealtime en useTesoreriaStore, useContratistasStore, etc.) se
-- suscriben correctamente pero JAMAS reciben eventos del servidor. El sintoma
-- concreto: si un movimiento se crea desde una pantalla que no pasa por
-- useTesoreriaStore.addTx (ej. GBA.jsx llama a dbTesoreria.addTransaction
-- directo), la pestaña de Tesoreria abierta no se entera hasta que el usuario
-- navega fuera y vuelve (remount -> fetchAll()). Con esto, cualquier escritura
-- en estas tablas empuja el cambio en vivo a todas las pestañas suscritas.
--
-- Idempotente: seguro de correr aunque alguna tabla ya haya sido activada
-- manualmente desde el Dashboard (Database > Replication).

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'transacciones',
    'empleados',
    'visitas',
    'visita_asistentes',
    'contratos',
    'pagos_nomina',
    'contratistas',
    'pagos_contratistas',
    'empleado_documentos',
    'servicios_proyecto',
    'registro_horas',
    'calendario_tributario',
    'proyectos'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
