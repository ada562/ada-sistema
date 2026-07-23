import { supabase } from './supabase'

// Arqueo de caja: sincronizado via Supabase para que sea visible entre
// dispositivos (bug reportado: el jefe abrio el portal en otro computador y
// no vio el arqueo registrado -- antes se guardaba solo en localStorage).
// Sigue DESACOPLADO del resto del sistema a proposito (mismo criterio que
// GBA, ver feedback_gba_desacoplado_tesoreria): no se compara contra
// vw_saldos_cuentas via RPC ni usa FOR UPDATE NOWAIT -- es un contador
// personal de billetes/monedas, uso interno. Desde la migracion 027,
// saldo_sistema SI guarda el saldo real de vw_saldos_cuentas al momento del
// conteo (antes se guardaba 0 fijo) para poder mostrar la diferencia como
// referencia informativa -- pero esto no crea ni ajusta transacciones.
//
// pendiente_monto/pendiente_concepto (027): anotacion personal de efectivo
// que el usuario recibio pero no tiene fisicamente (lo maneja un tercero),
// para que el conteo fisico no parezca "descuadrado" por esa plata. No
// afecta transacciones ni vw_saldos_cuentas.

export const DENOMINACIONES = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50]

const COLUMNS = 'id,fecha,cuenta,saldo_sistema,saldo_contado,diferencia,denominaciones,pendiente_monto,pendiente_concepto,notas,created_at'

function fromRow(r) {
  return {
    id: r.id,
    date: r.fecha,
    cuenta: r.cuenta,
    total: Number(r.saldo_contado),
    saldoSistema: Number(r.saldo_sistema),
    diferencia: Number(r.diferencia),
    denominaciones: r.denominaciones || [],
    pendienteMonto: r.pendiente_monto != null ? Number(r.pendiente_monto) : null,
    pendienteConcepto: r.pendiente_concepto || '',
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

export async function registrarArqueo({ date, denominaciones, total, notas, saldoSistema, pendienteMonto, pendienteConcepto }) {
  const { data, error } = await supabase
    .from('arqueo_caja')
    .insert({
      tenant_id: 'ada',
      fecha: date,
      cuenta: 'efectivo',
      saldo_sistema: saldoSistema ?? 0,
      saldo_contado: total,
      denominaciones,
      pendiente_monto: pendienteMonto || null,
      pendiente_concepto: pendienteMonto ? (pendienteConcepto || null) : null,
      notas: notas || null,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data)
}

export async function eliminarArqueo(id) {
  const { error } = await supabase.from('arqueo_caja').delete().eq('id', id).eq('tenant_id', 'ada')
  if (error) throw error
}
