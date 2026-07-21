import { supabase } from './supabase'

const SERVICIO_COLUMNS =
  'id,proyecto_id,nombre,estado,fecha_inicio,valor_contrato,iva_pct,cuenta_cobro,es_principal,notas,created_at'

function servicioFromRow(r) {
  return {
    id: r.id,
    projectId: r.proyecto_id,
    name: r.nombre,
    status: r.estado,
    startDate: r.fecha_inicio,
    contractValue: Number(r.valor_contrato) || 0,
    ivaPct: Number(r.iva_pct) || 0,
    cuentaCobro: r.cuenta_cobro,
    notes: r.notas,
    isPrimary: r.es_principal,
    createdAt: r.created_at,
  }
}

export async function getServicios() {
  const { data, error } = await supabase
    .from('servicios_proyecto')
    .select(SERVICIO_COLUMNS)
    .eq('tenant_id', 'ada')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(servicioFromRow)
}

export async function getServiciosByProject(projectId) {
  const { data, error } = await supabase
    .from('servicios_proyecto')
    .select(SERVICIO_COLUMNS)
    .eq('tenant_id', 'ada')
    .eq('proyecto_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(servicioFromRow)
}

export async function getServicioById(id) {
  const { data, error } = await supabase
    .from('servicios_proyecto')
    .select(SERVICIO_COLUMNS)
    .eq('tenant_id', 'ada')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? servicioFromRow(data) : null
}

export async function addServicio(data) {
  const { data: row, error } = await supabase
    .from('servicios_proyecto')
    .insert({
      tenant_id: 'ada',
      proyecto_id: data.projectId,
      nombre: data.name || '',
      estado: data.status || 'Activo',
      fecha_inicio: data.startDate || null,
      valor_contrato: Number(data.contractValue) || 0,
      iva_pct: Number(data.ivaPct) || 0,
      cuenta_cobro: data.cuentaCobro || '',
      notas: data.notes || '',
      es_principal: data.isPrimary || false,
    })
    .select(SERVICIO_COLUMNS)
    .single()
  if (error) throw error
  return servicioFromRow(row)
}

export async function updateServicio(id, data) {
  const { error } = await supabase
    .from('servicios_proyecto')
    .update({
      nombre: data.name || '',
      estado: data.status || 'Activo',
      fecha_inicio: data.startDate || null,
      valor_contrato: Number(data.contractValue) || 0,
      iva_pct: Number(data.ivaPct) || 0,
      cuenta_cobro: data.cuentaCobro || '',
      notas: data.notes || '',
      es_principal: data.isPrimary || false,
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteServicio(id) {
  const { error } = await supabase.from('servicios_proyecto').delete().eq('id', id)
  if (error) throw error
}
