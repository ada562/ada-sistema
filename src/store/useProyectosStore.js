import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  addProyecto,
  updateProyecto,
  deleteProyecto,
  getAllProjectsWithMetrics,
} from '../lib/dbProyectos'

export const useProyectosStore = create((set, get) => ({
  projects: [],
  loading: true,

  modalOpen: false,
  editingProject: null,

  openModal: (project = null) => set({ modalOpen: true, editingProject: project }),
  closeModal: () => set({ modalOpen: false, editingProject: null }),

  fetchAll: async () => {
    set({ loading: true })
    const projects = await getAllProjectsWithMetrics()
    set({ projects, loading: false })
  },

  addProject: async (data) => {
    await addProyecto(data)
    await get().fetchAll()
  },

  updateProject: async (id, data) => {
    await updateProyecto(id, data)
    await get().fetchAll()
  },

  deleteProject: async (id) => {
    await deleteProyecto(id)
    await get().fetchAll()
  },

  refresh: async () => {
    await get().fetchAll()
  },

  getProyectoById: (id) => {
    return get().projects.find((p) => p.id === id) || null
  },

  _channel: null,
  initRealtime: () => {
    if (get()._channel) return
    const channel = supabase
      .channel('proyectos-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proyectos', filter: 'tenant_id=eq.ada' },
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
