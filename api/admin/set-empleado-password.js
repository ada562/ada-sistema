// api/admin/set-empleado-password.js
// Primera API Route del proyecto (api/ estaba vacio -- ver
// docs/arquitectura/arquitectura-general.md 3.2, "se puebla bajo demanda").
// Unico lugar donde SUPABASE_SERVICE_ROLE_KEY se usa: cambiar la contrasena
// de la cuenta de portal de un empleado (Supabase Auth) desde la matriz de
// administracion. No se puede hacer desde el cliente porque
// auth.admin.updateUserById() requiere la service role key.
//
// Seguridad: valida el JWT del caller contra Supabase Auth, resuelve su
// perfil y exige rol='admin' -- el check real de autorizacion vive aqui
// (server-side), no en el frontend (que solo oculta el boton por UX).
// Body validado con Zod sin excepcion (regla CLAUDE.md).

import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const bodySchema = z.object({
  empleadoId: z.string().min(1, 'empleadoId requerido'),
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('set-empleado-password: faltan variables de entorno del servidor')
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
    return res.status(403).json({ error: 'Permiso denegado: solo administradores pueden cambiar contraseñas' })
  }

  // 3) Validar body
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' })
  }
  const { empleadoId, newPassword } = parsed.data

  // 4) Resolver empleados.user_id
  const { data: empleado, error: empleadoError } = await admin
    .from('empleados')
    .select('id, user_id, nombre')
    .eq('id', empleadoId)
    .single()
  if (empleadoError || !empleado) {
    return res.status(404).json({ error: 'Empleado no encontrado' })
  }
  if (!empleado.user_id) {
    return res.status(400).json({ error: 'Este empleado no tiene cuenta de portal vinculada' })
  }

  // 5) Actualizar contraseña vía Supabase Auth Admin API
  const { error: updateError } = await admin.auth.admin.updateUserById(empleado.user_id, {
    password: newPassword,
  })
  if (updateError) {
    console.error('set-empleado-password: error actualizando contraseña:', updateError)
    return res.status(500).json({ error: 'No se pudo actualizar la contraseña' })
  }

  return res.status(200).json({ ok: true, empleado: empleado.nombre })
}
