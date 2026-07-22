import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { getAccesosDiarios } from '../lib/dbAccesoDiario'

export const useAccesoDiarioStore = create((set, get) => ({
  accesos: [],
  loading: true,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null })
    try {
      const accesos = await getAccesosDiarios()
      set({ accesos, loading: false })
    } catch (err) {
      set({ error: err.message || 'No se pudo cargar el registro de accesos', loading: false })
    }
  },

  _channel: null,
  initRealtime: () => {
    if (get()._channel) return
    const channel = supabase
      .channel('acceso-diario-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'acceso_diario', filter: 'tenant_id=eq.ada' },
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
