import { load, save } from './storage'

// Arqueo de caja: por pedido del usuario, NO se sistematiza como el resto de
// la app (sin tabla Supabase/RLS/auditoria) -- es solo control personal para
// contar SOLO efectivo (billetes/monedas en caja), guardado local en el
// navegador. La tabla `arqueo_caja` de la migracion 015 quedo sin uso.
const KEY = 'ada_arqueo_caja'

export async function getArqueos() {
  return load(KEY, [])
}

export async function registrarArqueo({ date, saldoSistema, saldoContado, notas }) {
  const all = load(KEY, [])
  const nuevo = {
    id: crypto.randomUUID(),
    date,
    account: 'efectivo',
    saldoSistema,
    saldoContado,
    diferencia: saldoContado - saldoSistema,
    notas: notas || '',
    createdAt: new Date().toISOString(),
  }
  save(KEY, [nuevo, ...all])
  return nuevo
}
