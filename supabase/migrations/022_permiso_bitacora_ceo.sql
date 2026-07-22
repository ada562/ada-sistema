-- 022_permiso_bitacora_ceo.sql
-- Proposito: aditiva. Nuevo modulo "Bitácora CEO" (src/pages/gerencia/BitacoraCeo.jsx)
-- dentro del departamento Gerencia -- registra las horas de Alejandra Duran
-- Agudelo (CEO) reusando la misma tabla registro_horas/componente
-- BitacoraSemanaGrid que ya usan Bitacoras.jsx (admin) y MiBitacora.jsx
-- (portal empleado), pero sin requerir que ella tenga cuenta de portal
-- (explicitamente pedido por el usuario: "ella no requiere portal").
--
-- La sidebar y el guard de App.jsx llaman usePermission('bitacora-ceo'), asi
-- que sin esta fila los roles no-admin quedan sin acceso aunque ya tengan
-- acceso a 'resumen-gerencia'. Mismo criterio que 002_perfiles_rbac.sql usa
-- para 'resumen-gerencia': el rol 'gerencia' lee y escribe su propio
-- departamento. admin ya tiene bypass total en usePermission() del cliente.

INSERT INTO public.permisos (rol, modulo, accion) VALUES
  ('gerencia', 'bitacora-ceo', 'leer'),
  ('gerencia', 'bitacora-ceo', 'escribir');
