// dateWeek.js -- utilidades de fecha/semana compartidas por MiBitacora.jsx
// (rol empleado) y Bitacoras.jsx (admin, via BitacoraSemanaGrid). Siempre se
// trabaja con componentes locales de Date (getFullYear/getMonth/getDate),
// nunca con toISOString(), para no arrastrar corrimientos de huso horario en
// fechas puras tipo 'YYYY-MM-DD'. El lunes calculado aqui debe coincidir con
// fn_semana_actual_inicio() de la migracion 013: date_trunc('week', current_date)
// -- lunes ISO 8601.

export function pad2(n) {
  return String(n).padStart(2, '0')
}

export function toIsoLocal(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function addDaysLocal(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function mondayOfLocal(d) {
  const day = d.getDay() // 0 domingo ... 6 sabado
  const diff = day === 0 ? -6 : 1 - day
  return addDaysLocal(d, diff)
}

export const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
