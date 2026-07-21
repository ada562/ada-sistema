import { load, save } from './storage'

// Arqueo de caja: por pedido del usuario, NO se sistematiza como el resto de
// la app (sin tabla Supabase/RLS/auditoria) -- es solo control personal para
// comparar el saldo del sistema contra el conteo fisico, guardado local en
// el navegador. La tabla `arqueo_caja` de la migracion 015 quedo sin uso.
const KEY = 'ada_arqueo_caja'

export async function getArqueos(cuenta) {
  const all = load(KEY, [])
  return cuenta ? all.filter((a) => a.account === cuenta) : all
}

export async function registrarArqueo({ date, account, saldoSistema, saldoContado, notas }) {
  const all = load(KEY, [])
  const nuevo = {
    id: crypto.randomUUID(),
    date,
    account,
    saldoSistema,
    saldoContado,
    diferencia: saldoContado - saldoSistema,
    notas: notas || '',
    createdAt: new Date().toISOString(),
  }
  save(KEY, [nuevo, ...all])
  return nuevo
}
