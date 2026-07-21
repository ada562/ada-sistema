import { supabase } from './supabase'

const COLUMNS = 'id,fecha,cuenta,saldo_sistema,saldo_contado,diferencia,notas,created_at'

function fromRow(r) {
  return {
    id: r.id,
    date: r.fecha,
    account: r.cuenta,
    saldoSistema: Number(r.saldo_sistema),
    saldoContado: Number(r.saldo_contado),
    diferencia: Number(r.diferencia),
    notas: r.notas,
    createdAt: r.created_at,
  }
}

export async function getArqueos(cuenta) {
  let query = supabase
    .from('arqueo_caja')
    .select(COLUMNS)
    .eq('tenant_id', 'ada')
    .order('created_at', { ascending: false })
  if (cuenta) query = query.eq('cuenta', cuenta)
  const { data, error } = await query
  if (error) throw error
  return data.map(fromRow)
}

export async function registrarArqueo({ date, account, saldoSistema, saldoContado, notas }) {
  const { data, error } = await supabase
    .from('arqueo_caja')
    .insert({
      tenant_id: 'ada',
      fecha: date,
      cuenta: account,
      saldo_sistema: saldoSistema,
      saldo_contado: saldoContado,
      notas: notas || null,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data)
}
