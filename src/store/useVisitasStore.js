import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  getVisitas,
  addVisita,
  updateVisita,
  deleteVisita,
} from '../lib/dbVisitas'

export const useVisitasStore = create((set, get) => ({
  visitas: [],
  loading: true,

  fetchAll: async () => {
    set({ loading: true })
    const visitas = await getVisitas()
    set({ visitas, loading: false })
  },

  addVisita: async (data) => {
    await addVisita(data)
    await get().fetchAll()
  },
  updateVisita: async (id, data) => {
    await updateVisita(id, data)
    await get().fetchAll()
  },
  deleteVisita: async (id) => {
    await deleteVisita(id)
    await get().fetchAll()
  },

  getByProject: (projectId) => {
    return get().visitas.filter((v) => v.projectId === projectId)
  },

  _channel: null,
  initRealtime: () => {
    if (get()._channel) return
    const channel = supabase
      .channel('visitas-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visitas', filter: 'tenant_id=eq.ada' },
        () => get().fetchAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visita_asistentes', filter: 'tenant_id=eq.ada' },
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
