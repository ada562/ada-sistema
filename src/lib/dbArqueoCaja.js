import { load, save } from './storage'

// Arqueo de caja: por pedido del usuario, NO se sistematiza como el resto de
// la app (sin tabla Supabase/RLS/auditoria) -- es un contador personal de
// billetes y monedas en caja (no compara contra el saldo del sistema, que
// vive en Tesoreria/vw_saldos_cuentas). Guardado local en el navegador.
// La tabla `arqueo_caja` de la migracion 015 quedo sin uso.
const KEY = 'ada_arqueo_caja'

export const DENOMINACIONES = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50]

export async function getArqueos() {
  return load(KEY, [])
}

export async function registrarArqueo({ date, denominaciones, total, notas }) {
  const all = load(KEY, [])
  const nuevo = {
    id: crypto.randomUUID(),
    date,
    denominaciones,
    total,
    notas: notas || '',
    createdAt: new Date().toISOString(),
  }
  save(KEY, [nuevo, ...all])
  return nuevo
}
