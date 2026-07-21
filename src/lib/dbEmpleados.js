import { supabase } from './supabase'
import { getSettings } from './dbSettings'

const COLUMNS = 'id,nombre,cedula,fecha_nacimiento,genero,estado_civil,foto_url,' +
  'telefono,email,direccion,ciudad,' +
  'contacto_emergencia_nombre,contacto_emergencia_relacion,contacto_emergencia_telefono,contacto_emergencia_direccion,' +
  'cargo,departamento,supervisor_id,fecha_ingreso,tipo_contrato,contrato_hasta,' +
  'tarifa_mensual,salario_no_constitutivo,carga_pct,estado,user_id,' +
  'tipo_horario,' +
  'eps,pension,arl,caja_compensacion,created_at'

function empleadoFromRow(r) {
  return {
    id: r.id,
    name: r.nombre,
    cedula: r.cedula || '',
    birthDate: r.fecha_nacimiento || '',
    gender: r.genero || '',
    civilStatus: r.estado_civil || '',
    photo: r.foto_url || '',

    phone: r.telefono || '',
    email: r.email || '',
    address: r.direccion || '',
    city: r.ciudad || '',

    emergencyName: r.contacto_emergencia_nombre || '',
    emergencyRelation: r.contacto_emergencia_relacion || '',
    emergencyPhone: r.contacto_emergencia_telefono || '',
    emergencyAddress: r.contacto_emergencia_direccion || '',

    role: r.cargo || '',
    department: r.departamento || '',
    supervisor: r.supervisor_id || '',
    startDate: r.fecha_ingreso || '',
    contractType: r.tipo_contrato || '',
    contractUntil: r.contrato_hasta || '',
    monthlyRate: Number(r.tarifa_mensual) || 0,
    nonConstitutiveSalary: Number(r.salario_no_constitutivo) || 0,
    cargaPct: Number(r.carga_pct) || 0,
    status: r.estado,
    userId: r.user_id || null,

    tipoHorario: r.tipo_horario || '',

    eps: r.eps || '',
    pension: r.pension || '',
    arl: r.arl || '',
    cajaCompensacion: r.caja_compensacion || '',

    createdAt: r.created_at,
  }
}

function empleadoToRow(data) {
  return {
    nombre: data.name || '',
    cedula: data.cedula || '',
    fecha_nacimiento: data.birthDate || null,
    genero: data.gender || '',
    estado_civil: data.civilStatus || '',
    foto_url: data.photo || '',
    telefono: data.phone || '',
    email: data.email || '',
    direccion: data.address || '',
    ciudad: data.city || '',
    contacto_emergencia_nombre: data.emergencyName || '',
    contacto_emergencia_relacion: data.emergencyRelation || '',
    contacto_emergencia_telefono: data.emergencyPhone || '',
    contacto_emergencia_direccion: data.emergencyAddress || '',
    cargo: data.role || '',
    departamento: data.department || '',
    supervisor_id: data.supervisor || null,
    fecha_ingreso: data.startDate || null,
    tipo_contrato: data.contractType || '',
    contrato_hasta: data.contractUntil || null,
    tarifa_mensual: Number(data.monthlyRate) || 0,
    salario_no_constitutivo: Number(data.nonConstitutiveSalary) || 0,
    carga_pct: Number(data.cargaPct) || 0,
    estado: data.status || 'Activo',
    tipo_horario: data.tipoHorario || null,
    eps: data.eps || '',
    pension: data.pension || '',
    arl: data.arl || '',
    caja_compensacion: data.cajaCompensacion || '',
  }
}

export async function getEmpleados() {
  const { data, error } = await supabase
    .from('empleados')
    .select(COLUMNS)
    .eq('tenant_id', 'ada')
    .order('nombre', { ascending: true })
  if (error) throw error
  return data.map(empleadoFromRow)
}

export async function addEmpleado(data) {
  const { data: row, error } = await supabase
    .from('empleados')
    .insert({ tenant_id: 'ada', ...empleadoToRow(data) })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return empleadoFromRow(row)
}

export async function updateEmpleado(id, data) {
  const { error } = await supabase
    .from('empleados')
    .update(empleadoToRow(data))
    .eq('id', id)
  if (error) throw error
}

export async function deleteEmpleado(id) {
  const { error } = await supabase.from('empleados').delete().eq('id', id)
  if (error) throw error
}

/**
 * Fija o cambia el PIN de acceso rapido en campo de un empleado. Se hashea
 * con bcrypt en el servidor (RPC fn_set_empleado_pin, migracion 007) --
 * nunca se guarda ni se lee en texto plano desde el frontend.
 */
export async function setEmpleadoPin(empleadoId, pin) {
  const { error } = await supabase.rpc('fn_set_empleado_pin', {
    p_empleado_id: empleadoId,
    p_pin: pin,
  })
  if (error) throw error
}

/**
 * Cambia la contrasena de la cuenta de portal (Supabase Auth) de un
 * empleado. Requiere la sesion del admin que hace la llamada (su
 * access_token) -- la unica ruta server-side del proyecto
 * (api/admin/set-empleado-password.js) valida ahi mismo que sea admin antes
 * de usar la service role key.
 */
export async function setEmpleadoPassword(empleadoId, newPassword, accessToken) {
  const res = await fetch('/api/admin/set-empleado-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ empleadoId, newPassword }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'No se pudo cambiar la contraseña')
  return body
}

/**
 * Crea la cuenta de portal (Supabase Auth) de un empleado y la vincula a
 * empleados.user_id, vía api/admin/create-empleado-account.js (unico lugar
 * que usa la service role key para esto). Requiere la sesion del admin que
 * hace la llamada, igual que setEmpleadoPassword.
 */
export async function createEmpleadoAccount(empleadoId, email, password, accessToken) {
  const res = await fetch('/api/admin/create-empleado-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ empleadoId, email, password }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'No se pudo crear la cuenta de portal')
  return body
}

export async function getDailyRate(empleado) {
  const { workDaysPerMonth } = await getSettings()
  return (empleado.monthlyRate + (empleado.nonConstitutiveSalary || 0)) / workDaysPerMonth
}

export function getAge(birthDate) {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

/**
 * Puras -- reciben la lista de empleados ya cargada (ej. desde
 * useEmpleadosStore) en vez de leerla ellas mismas, para no depender de una
 * llamada async adicional.
 */
export function getUpcomingBirthdays(employees) {
  const today = new Date()

  return employees
    .filter((e) => e.birthDate)
    .map((e) => {
      const birth = new Date(e.birthDate)
      const bMonth = birth.getMonth()
      const bDay = birth.getDate()
      const thisYearBday = new Date(today.getFullYear(), bMonth, bDay)
      if (thisYearBday < today) {
        thisYearBday.setFullYear(today.getFullYear() + 1)
      }
      const daysUntil = Math.ceil((thisYearBday - today) / (1000 * 60 * 60 * 24))
      return { ...e, daysUntil }
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5)
}

export function getExpiringContracts(employees) {
  const today = new Date().toISOString().slice(0, 10)
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return employees
    .filter((e) => e.contractUntil && e.contractUntil <= in30Days && e.contractUntil >= today)
    .sort((a, b) => a.contractUntil.localeCompare(b.contractUntil))
}
