import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  getServicios,
  addServicio,
  updateServicio,
  deleteServicio,
} from '../lib/dbServicios'

export const useServiciosStore = create((set, get) => ({
  servicios: [],
  loading: true,

  modalOpen: false,
  editingServicio: null,

  openModal: (servicio = null) => set({ modalOpen: true, editingServicio: servicio }),
  closeModal: () => set({ modalOpen: false, editingServicio: null }),

  fetchAll: async () => {
    set({ loading: true })
    const servicios = await getServicios()
    set({ servicios, loading: false })
  },

  addServicio: async (data) => {
    await addServicio(data)
    await get().fetchAll()
  },

  updateServicio: async (id, data) => {
    await updateServicio(id, data)
    await get().fetchAll()
  },

  deleteServicio: async (id) => {
    await deleteServicio(id)
    await get().fetchAll()
  },

  getByProject: (projectId) => {
    return get().servicios.filter((s) => s.projectId === projectId)
  },

  _channel: null,
  initRealtime: () => {
    if (get()._channel) return
    const channel = supabase
      .channel('servicios-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'servicios_proyecto', filter: 'tenant_id=eq.ada' },
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
