import { supabase } from './supabase'

const COLUMNS = 'id,empleado_id,fecha,titulo,completada,created_at'

function fromRow(r) {
  return {
    id: r.id,
    employeeId: r.empleado_id,
    date: r.fecha,
    titulo: r.titulo,
    completada: r.completada,
    createdAt: r.created_at,
  }
}

export async function getTareas() {
  const { data, error } = await supabase
    .from('tareas')
    .select(COLUMNS)
    .eq('tenant_id', 'ada')
    .order('fecha', { ascending: true })
  if (error) throw error
  return data.map(fromRow)
}

export async function addTarea({ employeeId, date, titulo }) {
  const { data, error } = await supabase
    .from('tareas')
    .insert({ tenant_id: 'ada', empleado_id: employeeId, fecha: date, titulo })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data)
}

export async function toggleTarea(id, completada) {
  const { data, error } = await supabase
    .from('tareas')
    .update({ completada })
    .eq('id', id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data)
}

export async function deleteTarea(id) {
  const { error } = await supabase.from('tareas').delete().eq('id', id)
  if (error) throw error
}
