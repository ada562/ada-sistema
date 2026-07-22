import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  getTareas,
  addTarea as dbAddTarea,
  toggleTarea as dbToggleTarea,
  deleteTarea as dbDeleteTarea,
} from '../lib/dbTareas'

export const useTareasStore = create((set, get) => ({
  tareas: [],
  loading: true,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null })
    try {
      const tareas = await getTareas()
      set({ tareas, loading: false })
    } catch (err) {
      set({ error: err.message || 'No se pudieron cargar las tareas', loading: false })
    }
  },

  addTarea: async (data) => {
    await dbAddTarea(data)
    await get().fetchAll()
  },

  toggleTarea: async (id, completada) => {
    await dbToggleTarea(id, completada)
    await get().fetchAll()
  },

  deleteTarea: async (id) => {
    await dbDeleteTarea(id)
    await get().fetchAll()
  },

  _channel: null,
  initRealtime: () => {
    if (get()._channel) return
    const channel = supabase
      .channel('tareas-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tareas', filter: 'tenant_id=eq.ada' },
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
