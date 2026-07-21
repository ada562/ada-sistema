import { supabase } from './supabase'

const CALENDARIO_COLUMNS = 'id,nombre,frecuencia,dia_del_mes,monto,notas,created_at'

function calendarioFromRow(r) {
  return {
    id: r.id,
    name: r.nombre,
    frequency: r.frecuencia,
    dayOfMonth: r.dia_del_mes,
    amount: Number(r.monto) || 0,
    notes: r.notas,
    createdAt: r.created_at,
  }
}

export async function getCalendarioItems() {
  const { data, error } = await supabase
    .from('calendario_tributario')
    .select(CALENDARIO_COLUMNS)
    .eq('tenant_id', 'ada')
    .order('dia_del_mes', { ascending: true })
  if (error) throw error
  return data.map(calendarioFromRow)
}

export async function addCalendarioItem(data) {
  const { data: row, error } = await supabase
    .from('calendario_tributario')
    .insert({
      tenant_id: 'ada',
      nombre: data.name || '',
      frecuencia: data.frequency || 'mensual',
      dia_del_mes: Number(data.dayOfMonth) || 1,
      monto: Number(data.amount) || 0,
      notas: data.notes || '',
    })
    .select(CALENDARIO_COLUMNS)
    .single()
  if (error) throw error
  return calendarioFromRow(row)
}

export async function updateCalendarioItem(id, data) {
  const { error } = await supabase
    .from('calendario_tributario')
    .update({
      nombre: data.name || '',
      frecuencia: data.frequency || 'mensual',
      dia_del_mes: Number(data.dayOfMonth) || 1,
      monto: Number(data.amount) || 0,
      notas: data.notes || '',
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteCalendarioItem(id) {
  const { error } = await supabase.from('calendario_tributario').delete().eq('id', id)
  if (error) throw error
}

/**
 * Returns upcoming payments sorted by proximity.
 */
export async function getProximosPagos() {
  const items = await getCalendarioItems()
  const today = new Date()
  const currentDay = today.getDate()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  return items.map((item) => {
    let nextDate = new Date(currentYear, currentMonth, item.dayOfMonth)
    if (nextDate < today) {
      nextDate = new Date(currentYear, currentMonth + 1, item.dayOfMonth)
    }
    const diffMs = nextDate - today
    const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    return {
      ...item,
      nextDate: nextDate.toISOString().slice(0, 10),
      daysUntil,
    }
  }).sort((a, b) => a.daysUntil - b.daysUntil)
}
