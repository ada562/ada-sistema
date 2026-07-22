import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  getPermisosAusencia,
  crearSolicitudPermiso as dbCrearSolicitudPermiso,
  resolverPermisoAusencia as dbResolverPermisoAusencia,
} from '../lib/dbPermisosAusencia'

export const usePermisosAusenciaStore = create((set, get) => ({
  solicitudes: [],
  loading: true,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null })
    try {
      const solicitudes = await getPermisosAusencia()
      set({ solicitudes, loading: false })
    } catch (err) {
      set({ error: err.message || 'No se pudieron cargar los permisos', loading: false })
    }
  },

  crearSolicitud: async (data) => {
    await dbCrearSolicitudPermiso(data)
    await get().fetchAll()
  },

  resolver: async (id, estado, notas) => {
    await dbResolverPermisoAusencia(id, estado, notas)
    await get().fetchAll()
  },

  _channel: null,
  initRealtime: () => {
    if (get()._channel) return
    const channel = supabase
      .channel('permisos-ausencia-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'permisos_ausencia', filter: 'tenant_id=eq.ada' },
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
