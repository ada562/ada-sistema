-- 020_permiso_arqueo_caja.sql
-- Proposito: aditiva. El modulo "Arqueo de Caja" (src/pages/contabilidad/ArqueoCaja.jsx)
-- se convirtio en pagina propia con su propio id de vista ('arqueo-caja') --
-- antes vivia como boton/modal dentro de Tesoreria (que ya tiene permiso).
-- La sidebar y el guard de App.jsx llaman usePermission('arqueo-caja'), asi
-- que sin esta fila los roles no-admin quedan sin acceso al modulo aunque
-- tengan acceso a Tesoreria.
--
-- Se reutiliza el mismo criterio de acceso que 'tesoreria' en 002_perfiles_rbac.sql:
-- contabilidad lee/escribe, gerencia solo lee. admin ya tiene bypass total en
-- usePermission() del cliente, no necesita fila explicita.

INSERT INTO public.permisos (rol, modulo, accion) VALUES
  ('contabilidad', 'arqueo-caja', 'leer'),
  ('contabilidad', 'arqueo-caja', 'escribir'),
  ('gerencia', 'arqueo-caja', 'leer');
