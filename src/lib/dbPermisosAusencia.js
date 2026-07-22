import { supabase } from './supabase'

const COLUMNS = 'id,empleado_id,fecha_inicio,fecha_fin,motivo,descripcion,estado,notas_admin,resuelto_por,resuelto_at,created_at'

function fromRow(r) {
  return {
    id: r.id,
    employeeId: r.empleado_id,
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
    motivo: r.motivo,
    descripcion: r.descripcion || '',
    estado: r.estado,
    notasAdmin: r.notas_admin || '',
    resueltoPor: r.resuelto_por,
    resueltoAt: r.resuelto_at,
    createdAt: r.created_at,
  }
}

export async function getPermisosAusencia() {
  const { data, error } = await supabase
    .from('permisos_ausencia')
    .select(COLUMNS)
    .eq('tenant_id', 'ada')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(fromRow)
}

export async function crearSolicitudPermiso({ employeeId, fechaInicio, fechaFin, motivo, descripcion }) {
  const { data, error } = await supabase
    .from('permisos_ausencia')
    .insert({
      tenant_id: 'ada',
      empleado_id: employeeId,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      motivo,
      descripcion: descripcion || null,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data)
}

export async function resolverPermisoAusencia(id, estado, notas) {
  const { data, error } = await supabase.rpc('fn_resolver_permiso_ausencia', {
    p_id: id,
    p_estado: estado,
    p_notas: notas || null,
  })
  if (error) throw error
  return fromRow(data)
}
