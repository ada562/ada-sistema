import { supabase } from './supabase'

const COLUMNS =
  'dias_laborales_mes,carga_prestacional_pct,iva_pct,imprevistos_pct,administracion_pct,utilidad_pct,saldo_inicial_banco,saldo_inicial_efectivo,saldo_inicial_nequi,saldo_inicial_fecha'

function fromRow(r) {
  return {
    workDaysPerMonth: r.dias_laborales_mes,
    cargaPrestacionalPct: Number(r.carga_prestacional_pct),
    ivaPct: Number(r.iva_pct),
    imprevistosPct: Number(r.imprevistos_pct),
    administracionPct: Number(r.administracion_pct),
    utilidadPct: Number(r.utilidad_pct),
    saldoInicial: {
      banco: Number(r.saldo_inicial_banco),
      efectivo: Number(r.saldo_inicial_efectivo),
      nequi: Number(r.saldo_inicial_nequi),
      fecha: r.saldo_inicial_fecha,
    },
  }
}

export async function getSettings() {
  const { data, error } = await supabase
    .from('configuracion')
    .select(COLUMNS)
    .eq('tenant_id', 'ada')
    .single()
  if (error) throw error
  return fromRow(data)
}

export async function getSaldosIniciales() {
  const settings = await getSettings()
  return settings.saldoInicial
}
