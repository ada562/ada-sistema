export const fmtMoney = (n) =>
  '$' + Math.round(n).toLocaleString('es-CO')

export const fmtDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export const todayIso = () => new Date().toISOString().slice(0, 10)

export const fmtDateTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const fecha = d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  return `${fecha} ${hora}`
}
