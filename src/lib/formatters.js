export const fmtMoney = (n) =>
  '$' + Math.round(n).toLocaleString('es-CO')

export const fmtDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export const todayIso = () => new Date().toISOString().slice(0, 10)
