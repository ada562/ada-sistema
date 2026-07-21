import { supabase } from './supabase'

const COLUMNS = 'id,empleado_id,tipo_contrato,fecha_inicio,fecha_fin,' +
  'salario_mensual,salario_no_constitutivo,estado,notas,created_at'

function contratoFromRow(r) {
  return {
    id: r.id,
    employeeId: r.empleado_id,
    type: r.tipo_contrato,
    startDate: r.fecha_inicio,
    endDate: r.fecha_fin,
    monthlySalary: Number(r.salario_mensual) || 0,
    nonConstitutiveSalary: Number(r.salario_no_constitutivo) || 0,
    status: r.estado,
    notes: r.notas || '',
    createdAt: r.created_at,
  }
}

export async function getContratos() {
  const { data, error } = await supabase
    .from('contratos')
    .select(COLUMNS)
    .eq('tenant_id', 'ada')
    .order('fecha_inicio', { ascending: false })
  if (error) throw error
  return data.map(contratoFromRow)
}

/**
 * Registra un contrato nuevo (alta o renovación) de forma atómica: marca
 * el contrato vigente anterior del empleado como 'Renovado', inserta el
 * nuevo como 'Vigente', y sincroniza empleados.tipo_contrato/contrato_hasta
 * (RPC fn_registrar_contrato, migración 016).
 */
export async function registrarContrato(data) {
  const { data: row, error } = await supabase.rpc('fn_registrar_contrato', {
    p_empleado_id: data.employeeId,
    p_tipo_contrato: data.type,
    p_fecha_inicio: data.startDate,
    p_fecha_fin: data.endDate || null,
    p_salario_mensual: Number(data.monthlySalary) || 0,
    p_salario_no_constitutivo: Number(data.nonConstitutiveSalary) || 0,
    p_notas: data.notes || null,
  })
  if (error) throw error
  return contratoFromRow(row)
}

/**
 * Corrección directa de una fila existente (fecha/nota/estado mal
 * capturados) -- no dispara la sincronización con empleados que sí hace
 * registrarContrato, por eso no sirve para registrar una renovación.
 */
export async function updateContrato(id, data) {
  const { error } = await supabase
    .from('contratos')
    .update({
      tipo_contrato: data.type,
      fecha_inicio: data.startDate,
      fecha_fin: data.endDate || null,
      salario_mensual: Number(data.monthlySalary) || 0,
      salario_no_constitutivo: Number(data.nonConstitutiveSalary) || 0,
      estado: data.status,
      notas: data.notes || null,
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteContrato(id) {
  const { error } = await supabase.from('contratos').delete().eq('id', id)
  if (error) throw error
}
