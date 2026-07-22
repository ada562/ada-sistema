import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { logout as authLogout, getPerfil } from '../lib/dbAuth'

export const useAuthStore = create((set, get) => ({
  session: null,
  perfil: null,
  loading: true,
  initialized: false,
  _accesoRegistrado: false,

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
      set({ session: null, perfil: null, _accesoRegistrado: false })
      return
    }
    try {
      const perfil = await getPerfil(session.user.id)
      set({ session, perfil })
      // Hora de llegada del dia -- solo empleados de portal, solo la primera
      // vez por carga de app (el RPC ya es idempotente via ON CONFLICT DO
      // NOTHING, esto solo evita llamadas repetidas en cada refresh de token).
      if (perfil?.rol === 'empleado' && !get()._accesoRegistrado) {
        set({ _accesoRegistrado: true })
        supabase.rpc('fn_registrar_acceso_diario').then(({ error }) => {
          if (error) console.error('No se pudo registrar la hora de llegada:', error.message)
        })
      }
    } catch {
      set({ session, perfil: null })
    }
  },

  logout: async () => {
    await authLogout()
    set({ session: null, perfil: null })
  },
}))
