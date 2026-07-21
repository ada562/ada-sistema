import { supabase } from './supabase'

const VISITA_COLUMNS =
  'id,proyecto_id,tipo,fecha,tema,notas,monto,facturado,created_at,visita_asistentes(empleado_id)'

function visitaFromRow(r) {
  return {
    id: r.id,
    projectId: r.proyecto_id,
    tipo: r.tipo,
    date: r.fecha,
    topic: r.tema,
    attendeeIds: (r.visita_asistentes || []).map((a) => a.empleado_id),
    notes: r.notas,
    amount: Number(r.monto) || 0,
    invoiced: r.facturado,
    createdAt: r.created_at,
  }
}

async function setAsistentes(visitaId, attendeeIds) {
  const { error: delError } = await supabase.from('visita_asistentes').delete().eq('visita_id', visitaId)
  if (delError) throw delError
  if (attendeeIds.length > 0) {
    const { error: insError } = await supabase
      .from('visita_asistentes')
      .insert(attendeeIds.map((empleadoId) => ({ tenant_id: 'ada', visita_id: visitaId, empleado_id: empleadoId })))
    if (insError) throw insError
  }
}

export async function getVisitas() {
  const { data, error } = await supabase
    .from('visitas')
    .select(VISITA_COLUMNS)
    .eq('tenant_id', 'ada')
    .order('fecha', { ascending: false })
  if (error) throw error
  return data.map(visitaFromRow)
}

export async function getVisitasByProject(projectId) {
  const { data, error } = await supabase
    .from('visitas')
    .select(VISITA_COLUMNS)
    .eq('tenant_id', 'ada')
    .eq('proyecto_id', projectId)
    .order('fecha', { ascending: false })
  if (error) throw error
  return data.map(visitaFromRow)
}

export async function addVisita(data) {
  const { data: row, error } = await supabase
    .from('visitas')
    .insert({
      tenant_id: 'ada',
      proyecto_id: data.projectId,
      tipo: data.tipo || 'visita_obra',
      fecha: data.date || null,
      tema: data.topic || '',
      notas: data.notes || '',
      monto: Number(data.amount) || 0,
      facturado: data.invoiced || false,
    })
    .select(VISITA_COLUMNS)
    .single()
  if (error) throw error
  if (data.attendeeIds?.length) await setAsistentes(row.id, data.attendeeIds)
  return visitaFromRow(row)
}

export async function updateVisita(id, data) {
  const { error } = await supabase
    .from('visitas')
    .update({
      tipo: data.tipo || 'visita_obra',
      fecha: data.date || null,
      tema: data.topic || '',
      notas: data.notes || '',
      monto: Number(data.amount) || 0,
      facturado: data.invoiced || false,
    })
    .eq('id', id)
  if (error) throw error
  if (data.attendeeIds) await setAsistentes(id, data.attendeeIds)
}

export async function deleteVisita(id) {
  const { error } = await supabase.from('visitas').delete().eq('id', id)
  if (error) throw error
}
