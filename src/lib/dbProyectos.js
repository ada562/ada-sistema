import { supabase } from './supabase'
import { getTransactions } from './dbTesoreria'
import { getTimelogs, getTimelogsByProject } from './dbTimelogs'
import { getEmpleados } from './dbEmpleados'
import { getSettings } from './dbSettings'

const PROYECTO_COLUMNS =
  'id,nombre,cliente,tipo_servicio,estado,fecha_inicio,valor_contrato,iva_pct,notas,es_gba,paquete_visitas,created_at'

function proyectoFromRow(r) {
  return {
    id: r.id,
    name: r.nombre,
    client: r.cliente,
    serviceType: r.tipo_servicio,
    status: r.estado,
    startDate: r.fecha_inicio,
    contractValue: Number(r.valor_contrato) || 0,
    ivaPct: Number(r.iva_pct) || 0,
    notes: r.notas,
    esDeGBA: r.es_gba,
    visitPackage: r.paquete_visitas || { visita_obra: 0, reunion_diseno: 0, obsequio: 0 },
    createdAt: r.created_at,
  }
}

export async function getProyectos() {
  const { data, error } = await supabase
    .from('proyectos')
    .select(PROYECTO_COLUMNS)
    .eq('tenant_id', 'ada')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(proyectoFromRow)
}

export async function getProyectoById(id) {
  const { data, error } = await supabase
    .from('proyectos')
    .select(PROYECTO_COLUMNS)
    .eq('tenant_id', 'ada')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? proyectoFromRow(data) : null
}

const DIRECTORIO_COLUMNS = 'id,nombre,estado'

function directorioFromRow(r) {
  return { id: r.id, name: r.nombre, status: r.estado }
}

/**
 * Directorio minimo de proyectos (id, nombre, estado) via la vista
 * 'vw_proyectos_directorio' (migracion 013) -- sin columnas sensibles
 * (valor_contrato, notas, etc). Es lo unico a lo que el rol 'empleado'
 * tiene acceso para elegir un proyecto en su portal ('Mi Bitacora'), ya
 * que la tabla 'proyectos' completa esta restringida por RLS a
 * admin/gerencia/coordinador.
 */
export async function getProyectosDirectorio() {
  const { data, error } = await supabase
    .from('vw_proyectos_directorio')
    .select(DIRECTORIO_COLUMNS)
    .eq('tenant_id', 'ada')
    .order('nombre', { ascending: true })
  if (error) throw error
  return data.map(directorioFromRow)
}

export async function getProyectosActivos() {
  const { data, error } = await supabase
    .from('proyectos')
    .select(PROYECTO_COLUMNS)
    .eq('tenant_id', 'ada')
    .eq('estado', 'Activo')
    .order('nombre', { ascending: true })
  if (error) throw error
  return data.map(proyectoFromRow)
}

export async function addProyecto(data) {
  const { data: row, error } = await supabase
    .from('proyectos')
    .insert({
      tenant_id: 'ada',
      nombre: data.name || '',
      cliente: data.client || '',
      tipo_servicio: data.serviceType || '',
      estado: data.status || 'Activo',
      fecha_inicio: data.startDate || null,
      valor_contrato: Number(data.contractValue) || 0,
      iva_pct: Number(data.ivaPct) || 0,
      notas: data.notes || '',
      es_gba: data.esDeGBA || false,
      paquete_visitas: data.visitPackage || { visita_obra: 0, reunion_diseno: 0, obsequio: 0 },
    })
    .select(PROYECTO_COLUMNS)
    .single()
  if (error) throw error
  return proyectoFromRow(row)
}

export async function updateProyecto(id, data) {
  const { error } = await supabase
    .from('proyectos')
    .update({
      nombre: data.name || '',
      cliente: data.client || '',
      tipo_servicio: data.serviceType || '',
      estado: data.status || 'Activo',
      fecha_inicio: data.startDate || null,
      valor_contrato: Number(data.contractValue) || 0,
      iva_pct: Number(data.ivaPct) || 0,
      notas: data.notes || '',
      es_gba: data.esDeGBA || false,
      paquete_visitas: data.visitPackage || { visita_obra: 0, reunion_diseno: 0, obsequio: 0 },
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteProyecto(id) {
  const { error } = await supabase.from('proyectos').delete().eq('id', id)
  if (error) throw error
}

/**
 * Pura -- recibe transacciones/registros de horas ya cargados (de todo el
 * tenant) y filtra por projectId en memoria. Separada de getProjectMetrics
 * para que getAllProjectsWithMetrics pueda traer cada tabla UNA sola vez
 * y calcular las metricas de los N proyectos sin volver a golpear
 * Supabase por cada uno (ver nota de rendimiento abajo).
 */
function computeProjectMetrics(projectId, allTransactions, allTimelogs, empleadosPorId, workDaysPerMonth) {
  const transactions = allTransactions.filter((tx) => tx.projectId === projectId)
  const timelogs = allTimelogs.filter((t) => t.projectId === projectId)

  const ingresos = transactions
    .filter((tx) => tx.type === 'ingreso')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const gastos = transactions
    .filter((tx) => tx.type === 'gasto')
    .reduce((sum, tx) => sum + tx.amount, 0)

  let costoManoObra = 0
  for (const log of timelogs) {
    const emp = empleadosPorId.get(log.employeeId)
    if (emp) {
      const rate = (emp.monthlyRate + (emp.nonConstitutiveSalary || 0)) * (1 + (emp.cargaPct || 0) / 100) / workDaysPerMonth
      costoManoObra += log.days * rate
    }
  }

  const rentabilidad = ingresos - gastos - costoManoObra

  return {
    ingresos,
    gastos,
    costoManoObra,
    rentabilidad,
    totalTransacciones: transactions.length,
    totalHoras: timelogs.reduce((sum, t) => sum + t.days, 0),
  }
}

export async function getProjectMetrics(projectId) {
  const [allTransactions, timelogs, empleados, settings] = await Promise.all([
    getTransactions(),
    getTimelogsByProject(projectId),
    getEmpleados(),
    getSettings(),
  ])
  const empleadosPorId = new Map(empleados.map((e) => [e.id, e]))
  return computeProjectMetrics(projectId, allTransactions, timelogs, empleadosPorId, settings.workDaysPerMonth)
}

/**
 * Antes esta funcion llamaba a getProjectMetrics(p.id) por cada proyecto,
 * y esa a su vez volvia a traer TODA la tabla de transacciones/empleados/
 * configuracion por proyecto -- con 42 proyectos reales en produccion eso
 * son ~170 consultas a Supabase para cargar una sola pantalla (causa real
 * de la pagina "Proyectos" quedando en skeleton indefinidamente / muy
 * lenta). Ahora cada tabla se trae UNA sola vez y las metricas de los N
 * proyectos se calculan en memoria.
 */
export async function getAllProjectsWithMetrics() {
  const [projects, allTransactions, allTimelogs, empleados, settings] = await Promise.all([
    getProyectos(),
    getTransactions(),
    getTimelogs(),
    getEmpleados(),
    getSettings(),
  ])
  const empleadosPorId = new Map(empleados.map((e) => [e.id, e]))
  return projects.map((p) => ({
    ...p,
    metrics: computeProjectMetrics(p.id, allTransactions, allTimelogs, empleadosPorId, settings.workDaysPerMonth),
  }))
}
