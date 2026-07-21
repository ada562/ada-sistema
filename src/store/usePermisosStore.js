import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const usePermisosStore = create((set, get) => ({
  permisos: [],
  loading: true,
  loaded: false,

  fetchAll: async () => {
    if (get().loaded) return
    set({ loading: true })
    const { data, error } = await supabase.from('permisos').select('rol,modulo,accion')
    if (error) {
      set({ loading: false })
      return
    }
    set({ permisos: data, loading: false, loaded: true })
  },
}))
