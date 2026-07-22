import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  getTareaReportes,
  crearTareaReporte,
  eliminarTareaReporte,
  getTareaReporteUrl,
} from '../lib/dbTareaReportes'

export const useTareaReportesStore = create((set, get) => ({
  reportes: [],
  loading: true,

  fetchAll: async () => {
    set({ loading: true })
    const reportes = await getTareaReportes()
    set({ reportes, loading: false })
  },

  getByTarea: (tareaId) => get().reportes.filter((r) => r.tareaId === tareaId),

  crear: async (payload) => {
    await crearTareaReporte(payload)
    await get().fetchAll()
  },
  eliminar: async (id, storagePath) => {
    await eliminarTareaReporte(id, storagePath)
    await get().fetchAll()
  },
  getUrl: (storagePath) => getTareaReporteUrl(storagePath),

  _channel: null,
  initRealtime: () => {
    if (get()._channel) return
    const channel = supabase
      .channel('tarea-reportes-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tarea_reportes', filter: 'tenant_id=eq.ada' },
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
