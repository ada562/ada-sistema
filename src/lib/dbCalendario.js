import { load, save } from './storage'

const KEY = 'ada_calendario_tributario'

const defaultItems = [
  { id: 'cal_1', name: 'Movistar', frequency: 'mensual', dayOfMonth: 25, amount: 0, notes: '' },
  { id: 'cal_2', name: 'Planillas (seguridad social)', frequency: 'mensual', dayOfMonth: 5, amount: 0, notes: '' },
  { id: 'cal_3', name: 'Leasing', frequency: 'mensual', dayOfMonth: 11, amount: 1906000, notes: '' },
  { id: 'cal_4', name: 'Industria y Comercio', frequency: 'bimestral', dayOfMonth: 10, amount: 0, notes: 'Sep, Nov, Ene, Mar, May, Jul' },
  { id: 'cal_5', name: 'Primas de servicios', frequency: 'semestral', dayOfMonth: 30, amount: 0, notes: 'Junio y Diciembre' },
]

let items = load(KEY, defaultItems)

export function getCalendarioItems() {
  return items
}

export function addCalendarioItem(data) {
  const id = 'cal_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  const item = {
    id,
    name: data.name || '',
    frequency: data.frequency || 'mensual',
    dayOfMonth: Number(data.dayOfMonth) || 1,
    amount: Number(data.amount) || 0,
    notes: data.notes || '',
  }
  items = [item, ...items]
  save(KEY, items)
  return item
}

export function updateCalendarioItem(id, data) {
  items = items.map((i) =>
    i.id === id
      ? {
          ...i,
          name: data.name || '',
          frequency: data.frequency || 'mensual',
          dayOfMonth: Number(data.dayOfMonth) || 1,
          amount: Number(data.amount) || 0,
          notes: data.notes || '',
        }
      : i
  )
  save(KEY, items)
  return items.find((i) => i.id === id)
}

export function deleteCalendarioItem(id) {
  items = items.filter((i) => i.id !== id)
  save(KEY, items)
}

/**
 * Returns upcoming payments sorted by proximity.
 */
export function getProximosPagos() {
  const today = new Date()
  const currentDay = today.getDate()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  return items.map((item) => {
    let nextDate = new Date(currentYear, currentMonth, item.dayOfMonth)
    if (nextDate < today) {
      nextDate = new Date(currentYear, currentMonth + 1, item.dayOfMonth)
    }
    const diffMs = nextDate - today
    const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    return {
      ...item,
      nextDate: nextDate.toISOString().slice(0, 10),
      daysUntil,
    }
  }).sort((a, b) => a.daysUntil - b.daysUntil)
}
