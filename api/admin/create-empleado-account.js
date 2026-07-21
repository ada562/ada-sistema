// api/admin/create-empleado-account.js
// Segunda API Route del proyecto -- crea la cuenta de Supabase Auth del
// "portal de empleado" (Mi Bitácora, migración 013) y la vincula a
// empleados.user_id. Mismo patrón de seguridad que
// api/admin/set-empleado-password.js: valida el JWT del caller y exige
// rol='admin' server-side antes de tocar la service role key.
//
// El trigger on_auth_user_created (migración 002) crea automáticamente la
// fila en 'perfiles' con rol='sin_rol' -- este endpoint la promueve a
// rol='empleado' justo después, porque el trigger no puede leer el rol
// deseado desde aquí (siempre inserta 'sin_rol' por diseño, ver 002).
//
// Si falla el paso de vincular empleados.user_id, se borra la cuenta de
// Auth recién creada para no dejar una cuenta huérfana sin empleado
// asociado (nadie podría usarla ni administrarla desde la UI).

import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const bodySchema = z.object({
  empleadoId: z.string().min(1, 'empleadoId requerido'),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('create-empleado-account: faltan variables de entorno del servidor')
    return res.status(500).json({ error: 'Configuración del servidor incompleta' })
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'No autenticado' })

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1) Resolver al usuario dueño del token
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Sesión inválida' })
  }

  // 2) Exigir rol admin (fuente de verdad: tabla perfiles, no el JWT)
  const { data: perfil, error: perfilError } = await admin
    .from('perfiles')
    .select('rol, activo')
    .eq('id', userData.user.id)
    .single()
  if (perfilError || !perfil?.activo || perfil.rol !== 'admin') {
    return res.status(403).json({ error: 'Permiso denegado: solo administradores pueden crear cuentas de portal' })
  }

  // 3) Validar body
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' })
  }
  const { empleadoId, email, password } = parsed.data

  // 4) Resolver empleado y confirmar que no tenga ya una cuenta vinculada
  const { data: empleado, error: empleadoError } = await admin
    .from('empleados')
    .select('id, user_id, nombre')
    .eq('id', empleadoId)
    .single()
  if (empleadoError || !empleado) {
    return res.status(404).json({ error: 'Empleado no encontrado' })
  }
  if (empleado.user_id) {
    return res.status(400).json({ error: 'Este empleado ya tiene una cuenta de portal vinculada' })
  }

  // 5) Crear la cuenta de Supabase Auth (confirmada de una vez -- no hay
  // flujo de verificación de correo para cuentas de portal internas)
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre: empleado.nombre },
  })
  if (createError || !created?.user) {
    const msg = createError?.message?.includes('already been registered')
      ? 'Ese correo ya está registrado'
      : 'No se pudo crear la cuenta de portal'
    console.error('create-empleado-account: error creando usuario:', createError)
    return res.status(400).json({ error: msg })
  }

  const newUserId = created.user.id

  // 6) Promover el perfil recién creado (trigger lo deja en 'sin_rol') a
  // 'empleado' -- fuente real de permisos vía auth_rol()/usePermission().
  const { error: perfilUpdateError } = await admin
    .from('perfiles')
    .update({ rol: 'empleado' })
    .eq('id', newUserId)
  if (perfilUpdateError) {
    console.error('create-empleado-account: error promoviendo perfil, revirtiendo:', perfilUpdateError)
    await admin.auth.admin.deleteUser(newUserId)
    return res.status(500).json({ error: 'No se pudo asignar el rol de portal' })
  }

  // 7) Vincular empleados.user_id
  const { error: linkError } = await admin
    .from('empleados')
    .update({ user_id: newUserId })
    .eq('id', empleadoId)
  if (linkError) {
    console.error('create-empleado-account: error vinculando empleado, revirtiendo:', linkError)
    await admin.auth.admin.deleteUser(newUserId)
    return res.status(500).json({ error: 'No se pudo vincular la cuenta al empleado' })
  }

  return res.status(200).json({ ok: true, email, empleado: empleado.nombre })
}
