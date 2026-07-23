import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { getArqueos, registrarArqueo, eliminarArqueo } from '../lib/dbArqueoCaja'

export const useArqueoCajaStore = create((set, get) => ({
  arqueos: [],
  loading: true,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null })
    try {
      const arqueos = await getArqueos()
      set({ arqueos, loading: false })
    } catch (err) {
      set({ error: err.message || 'No se pudo cargar el historial de arqueos', loading: false })
    }
  },

  registrar: async (data) => {
    const nuevo = await registrarArqueo(data)
    await get().fetchAll()
    return nuevo
  },

  eliminar: async (id) => {
    await eliminarArqueo(id)
    await get().fetchAll()
  },

  _channel: null,
  initRealtime: () => {
    if (get()._channel) return
    const channel = supabase
      .channel('arqueo-caja-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'arqueo_caja', filter: 'tenant_id=eq.ada' },
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
