-- 001_claude_readonly_role.sql
-- Proposito: crear un rol de solo lectura para que Claude Code pueda consultar
-- la base de datos directamente (acelera la construccion del modelo de datos)
-- sin usar la service_role key ni tener permisos de escritura.
--
-- IMPORTANTE: la contrasena real NO va en este archivo (se versiona en git).
-- Se establece por separado con ALTER ROLE fuera de las migraciones versionadas
-- y se documenta en un lugar seguro fuera del repositorio.

CREATE ROLE claude_readonly WITH LOGIN PASSWORD 'CAMBIAR_FUERA_DE_GIT';

GRANT CONNECT ON DATABASE postgres TO claude_readonly;
GRANT USAGE ON SCHEMA public TO claude_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO claude_readonly;

-- Para que las tablas creadas en migraciones futuras hereden automaticamente
-- el permiso de solo lectura sin tener que repetir el GRANT en cada una.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO claude_readonly;

-- Nota (a resolver en las migraciones de RBAC/RLS, ver 002+):
-- este GRANT de tabla NO es suficiente por si solo una vez que las tablas
-- tengan RLS activo -- ademas de este GRANT se necesita una politica RLS
-- explicita "FOR SELECT TO claude_readonly USING (true)" (o una vista sin
-- columnas sensibles) en cada tabla, o el rol no vera ninguna fila.
