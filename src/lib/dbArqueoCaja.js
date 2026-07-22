import { supabase } from './supabase'

// Arqueo de caja: sincronizado via Supabase para que sea visible entre
// dispositivos (bug reportado: el jefe abrio el portal en otro computador y
// no vio el arqueo registrado -- antes se guardaba solo en localStorage).
// Sigue DESACOPLADO del resto del sistema a proposito (mismo criterio que
// GBA, ver feedback_gba_desacoplado_tesoreria): no se compara contra
// vw_saldos_cuentas ni usa RPC con FOR UPDATE NOWAIT -- es un contador
// personal de billetes/monedas, uso interno. saldo_sistema se guarda en 0
// (placeholder, columna NOT NULL heredada de la migracion 015) porque no se
// compara contra el saldo real.

export const DENOMINACIONES = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50]

const COLUMNS = 'id,fecha,cuenta,saldo_sistema,saldo_contado,diferencia,denominaciones,notas,created_at'

function fromRow(r) {
  return {
    id: r.id,
    date: r.fecha,
    cuenta: r.cuenta,
    total: Number(r.saldo_contado),
    saldoSistema: Number(r.saldo_sistema),
    diferencia: Number(r.diferencia),
    denominaciones: r.denominaciones || [],
    notas: r.notas || '',
    createdAt: r.created_at,
  }
}

export async function getArqueos() {
  const { data, error } = await supabase
    .from('arqueo_caja')
    .select(COLUMNS)
    .eq('tenant_id', 'ada')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(fromRow)
}

export async function registrarArqueo({ date, denominaciones, total, notas }) {
  const { data, error } = await supabase
    .from('arqueo_caja')
    .insert({
      tenant_id: 'ada',
      fecha: date,
      cuenta: 'efectivo',
      saldo_sistema: 0,
      saldo_contado: total,
      denominaciones,
      notas: notas || null,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data)
}
