# Auditoria de Seguridad — ADA Gestion
**Fecha:** 2026-07-21
**Alcance:** Autenticacion/sesiones, RBAC, RLS de Supabase (19 tablas, migraciones 001-015), datos sensibles en el repositorio de trabajo, input validation, la nueva API Route `api/admin/set-empleado-password.js` (primera del proyecto), OWASP Top 10.
**Nivel de riesgo general:** ALTO (por un hallazgo puntual de exposicion de datos, no por debilidad estructural — la arquitectura de auth/RLS/RPC esta solida)

## Vulnerabilidades encontradas

### CRITICAS (requieren accion inmediata)

Ninguna. No hay credenciales activas expuestas en git, no hay bypass de RLS, no hay inyeccion SQL/XSS detectada.

### ALTAS (resolver antes de produccion)

1. **`legado-adaapp/` contiene PII y datos financieros reales en JSON plano, y NO esta cubierto por `.gitignore`.**
   La carpeta (nueva esta sesion, todavia sin commitear) trae el export completo de Firebase: `firebase_export/employees.json`, `payrollPayments.json`, `transactions.json`, `contractors.json`, `contractorPayments.json`, `projects.json`, etc., mas `ada_backup_2026-07-15.json` (backup completo del localStorage historico). Todo esto es dato real: nombres, salarios, telefonos, montos de transacciones. Ninguno de estos archivos coincide con los patrones actuales de `.gitignore` (`.env*`, `*firebase-adminsdk*.json`, `*serviceAccountKey*.json`). Un `git add .`/`git add -A` normal en cualquier sesion futura subiria estos datos reales al historial de git — dificil de purgar despues, incluso en repo privado.
   **Recomendacion:** agregar `legado-adaapp/` completo a `.gitignore` ya mismo (es material de referencia para migraciones ya ejecutadas, no codigo de la app), o moverlo fuera del directorio del repositorio.

2. **Llave de servicio de Firebase Admin SDK presente en disco dentro de `legado-adaapp/`.**
   `legado-adaapp/ada-gestion-223db-firebase-adminsdk-fbsvc-3ad9b26802.json` — confirmado via `git check-ignore -v` que SI coincide con el patron `*firebase-adminsdk*.json` (no se subiria a git). Pero es una credencial real de Firebase Admin sentada en el working directory. Como la app ya migro por completo a Supabase (Fase 2-10 del plan, todas ejecutadas), esta llave probablemente ya no se necesita.
   **Recomendacion:** confirmar si el proyecto Firebase sigue activo; si no se necesita mas, revocar/eliminar la llave desde la consola de Firebase (no solo borrar el archivo local) y borrar el archivo.

### MEDIAS (resolver en proximo sprint)

3. **`.sqlgen/` (scripts + SQL generado para sembrar datos historicos reales, migraciones 010/011) tampoco esta en `.gitignore`.**
   Mismo patron de riesgo que el hallazgo #1 pero de menor severidad (son literales SQL ya reflejados en migraciones documentadas, no un dump nuevo). Igual conviene gitignorarlo o borrarlo — ya cumplio su proposito.

4. **`src/lib/storage.js` (helpers `load()`/`save()` de localStorage) es codigo muerto.**
   Verificado: ningun archivo en `src/` lo importa (`grep` de `from '.../lib/storage'` sin resultados). Confirma que la migracion a Supabase es completa (ya no hay datos reales cayendo en localStorage), pero el archivo sigue en el repo y podria tentar a reintroducir el patron viejo por error. No es una vulnerabilidad activa — es limpieza recomendada.

### BAJAS (mejoras sugeridas)

5. **Rate limiting de login depende enteramente de los limites por defecto de Supabase Auth (GoTrue)** — no hay throttling propio a nivel de app. Aceptable para el tamano actual del equipo; documentar como dependencia del proveedor si el equipo crece.

6. **`EmpleadoDetalle.jsx:64` usa `perfil?.rol === 'admin'` hardcodeado** para decidir si mostrar el boton "Cambiar contraseña". Tecnicamente coincide con el patron que CLAUDE.md prohibe, pero esta explicitamente documentado en el codigo como control **solo de UI** — la autorizacion real vive en el servidor (`api/admin/set-empleado-password.js` re-valida `rol === 'admin'` contra la tabla `perfiles`, no confia en el JWT ni en el frontend). Sin riesgo real; se deja como nota de estilo, no de seguridad.

## Estado de cumplimiento
- Autenticacion: ✅ (Supabase Auth real, sin credenciales hardcodeadas, mensajes de error genericos que no filtran si el correo existe, password nunca en texto plano ni logueado)
- Autorizacion RBAC: ✅ (`usePermission()` consistente en `Sidebar.jsx` y como guard de ruta en `App.jsx`; `checkPermission()` falla cerrado para `rol='sin_rol'`; verificado contra `departments.js`/migracion 002)
- RLS Supabase: ✅ (19 `CREATE TABLE public.*` = 19 `ENABLE ROW LEVEL SECURITY`, sin excepciones; 26 politicas `TO claude_readonly` cubren las 19 tablas + vistas; operaciones de dinero — `transacciones`, `pagos_nomina` — con `REVOKE INSERT ... FROM authenticated` forzando paso por RPC con `FOR UPDATE NOWAIT` + `fn_audit_trigger()`)
- Datos sensibles: ⚠️ (ver hallazgos ALTOS #1 y #2 — nada comprometido todavia, pero expuesto a error humano hasta que se corrija `.gitignore`; `.env`/`SUPABASE_SERVICE_ROLE_KEY` si estan correctamente aislados: unico uso en `api/admin/set-empleado-password.js`, `npm audit` = 0 vulnerabilidades)
- Input validation: ✅ (Zod en el body de la unica API Route existente; sin `dangerouslySetInnerHTML`/`eval`; RPCs parametrizadas, sin concatenacion SQL)
- OWASP Top 10: 9/10 (unico punto abierto: A05 Security Misconfiguration, por el `.gitignore` incompleto de los hallazgos ALTOS)

## Plan de remediacion
1. **Inmediato:** agregar `legado-adaapp/` y `.sqlgen/` a `.gitignore` (hallazgos #1 y #3) — evita que un `git add` futuro exponga PII/financiero real o la llave de Firebase.
2. **Esta semana:** confirmar si el proyecto Firebase legado sigue activo; si no, revocar la service account key desde la consola de Firebase y borrar el archivo local (hallazgo #2).
3. **Proximo sprint:** eliminar `src/lib/storage.js` (codigo muerto, hallazgo #4).
4. Sin accion requerida en autenticacion, RBAC, RLS ni la API Route nueva — quedan en buen estado.
