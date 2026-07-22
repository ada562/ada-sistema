import { supabase } from './supabase'

const COLUMNS = 'id,empleado_id,fecha,hora_llegada'

function fromRow(r) {
  return {
    id: r.id,
    employeeId: r.empleado_id,
    date: r.fecha,
    horaLlegada: r.hora_llegada,
  }
}

export async function getAccesosDiarios() {
  const { data, error } = await supabase
    .from('acceso_diario')
    .select(COLUMNS)
    .eq('tenant_id', 'ada')
    .order('fecha', { ascending: false })
  if (error) throw error
  return data.map(fromRow)
}
