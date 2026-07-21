import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  getCalendarioItems,
  addCalendarioItem,
  updateCalendarioItem,
  deleteCalendarioItem,
} from '../lib/dbCalendario'

export const useCalendarioStore = create((set, get) => ({
  items: [],
  loading: true,

  fetchAll: async () => {
    set({ loading: true })
    const items = await getCalendarioItems()
    set({ items, loading: false })
  },

  addItem: async (data) => {
    await addCalendarioItem(data)
    await get().fetchAll()
  },
  updateItem: async (id, data) => {
    await updateCalendarioItem(id, data)
    await get().fetchAll()
  },
  deleteItem: async (id) => {
    await deleteCalendarioItem(id)
    await get().fetchAll()
  },

  getProximosPagos: () => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()

    return get().items.map((item) => {
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
  },

  _channel: null,
  initRealtime: () => {
    if (get()._channel) return
    const channel = supabase
      .channel('calendario-tributario-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendario_tributario', filter: 'tenant_id=eq.ada' },
        () => get().fetchAll()
      )
      .subscribe()
    set({ _channel: channel })
  },
  teardownRealtime: () => {
    get()._channel?.unsubscribe()
    set({ _channel: null })
  },
}))
