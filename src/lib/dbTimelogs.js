import { supabase } from './supabase'

const TIMELOG_COLUMNS = 'id,empleado_id,proyecto_id,servicio_id,fecha,dias,nota,created_at'

function timelogFromRow(r) {
  return {
    id: r.id,
    employeeId: r.empleado_id,
    projectId: r.proyecto_id,
    serviceId: r.servicio_id,
    date: r.fecha,
    days: Number(r.dias) || 0,
    note: r.nota,
    createdAt: r.created_at,
  }
}

export async function getTimelogs() {
  const { data, error } = await supabase
    .from('registro_horas')
    .select(TIMELOG_COLUMNS)
    .eq('tenant_id', 'ada')
    .order('fecha', { ascending: false })
  if (error) throw error
  return data.map(timelogFromRow)
}

export async function getTimelogsByProject(projectId) {
  const { data, error } = await supabase
    .from('registro_horas')
    .select(TIMELOG_COLUMNS)
    .eq('tenant_id', 'ada')
    .eq('proyecto_id', projectId)
    .order('fecha', { ascending: false })
  if (error) throw error
  return data.map(timelogFromRow)
}

export async function getTimelogsByEmployee(employeeId) {
  const { data, error } = await supabase
    .from('registro_horas')
    .select(TIMELOG_COLUMNS)
    .eq('tenant_id', 'ada')
    .eq('empleado_id', employeeId)
    .order('fecha', { ascending: false })
  if (error) throw error
  return data.map(timelogFromRow)
}

export async function addTimelog(data) {
  const { data: row, error } = await supabase
    .from('registro_horas')
    .insert({
      tenant_id: 'ada',
      empleado_id: data.employeeId,
      proyecto_id: data.projectId,
      servicio_id: data.serviceId || null,
      fecha: data.date || null,
      dias: Number(data.days) || 0,
      nota: data.note || '',
    })
    .select(TIMELOG_COLUMNS)
    .single()
  if (error) throw error
  return timelogFromRow(row)
}

export async function updateTimelog(id, data) {
  const { error } = await supabase
    .from('registro_horas')
    .update({
      empleado_id: data.employeeId,
      proyecto_id: data.projectId,
      servicio_id: data.serviceId || null,
      fecha: data.date || null,
      dias: Number(data.days) || 0,
      nota: data.note || '',
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteTimelog(id) {
  const { error } = await supabase.from('registro_horas').delete().eq('id', id)
  if (error) throw error
}
