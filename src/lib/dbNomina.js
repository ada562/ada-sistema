import { supabase } from './supabase'

const COLUMNS = 'id,empleado_id,fecha,tipo,quincena,periodo_inicio,periodo_fin,semestre,monto,metodo,notas,created_at'

function pagoFromRow(r) {
  return {
    id: r.id,
    employeeId: r.empleado_id,
    date: r.fecha,
    tipo: r.tipo,
    quincena: r.quincena || 0,
    periodStart: r.periodo_inicio,
    periodEnd: r.periodo_fin,
    semestre: r.semestre || null,
    amount: Number(r.monto),
    method: r.metodo,
    notes: r.notas || '',
    createdAt: r.created_at,
  }
}

export async function getPayrollPayments() {
  const { data, error } = await supabase
    .from('pagos_nomina')
    .select(COLUMNS)
    .eq('tenant_id', 'ada')
    .order('fecha', { ascending: false })
  if (error) throw error
  return data.map(pagoFromRow)
}

/**
 * Registra un pago de nómina y crea el gasto en Tesorería, de forma atómica
 * (RPC fn_registrar_pago_nomina, migración 008).
 */
export async function registrarPagoNomina(data) {
  const { data: row, error } = await supabase.rpc('fn_registrar_pago_nomina', {
    p_empleado_id: data.employeeId,
    p_fecha: data.date,
    p_tipo: data.tipo,
    p_quincena: data.quincena || null,
    p_periodo_inicio: data.periodStart || null,
    p_periodo_fin: data.periodEnd || null,
    p_semestre: data.semestre || null,
    p_monto: Number(data.amount) || 0,
    p_metodo: data.method || 'banco',
    p_notas: data.notes || '',
  })
  if (error) throw error
  return pagoFromRow(row)
}
