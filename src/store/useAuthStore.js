import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { logout as authLogout, getPerfil } from '../lib/dbAuth'

export const useAuthStore = create((set, get) => ({
  session: null,
  perfil: null,
  loading: true,
  initialized: false,

  init: () => {
    if (get().initialized) return
    set({ initialized: true })

    supabase.auth.getSession().then(async ({ data }) => {
      await get()._syncPerfil(data.session)
      set({ loading: false })
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      get()._syncPerfil(session)
    })
  },

  _syncPerfil: async (session) => {
    if (!session) {
      set({ session: null, perfil: null })
      return
    }
    try {
      const perfil = await getPerfil(session.user.id)
      set({ session, perfil })
    } catch {
      set({ session, perfil: null })
    }
  },

  logout: async () => {
    await authLogout()
    set({ session: null, perfil: null })
  },
}))
