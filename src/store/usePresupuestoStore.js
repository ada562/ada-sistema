import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  getCategoriasByProject,
  addCategoria,
  updateCategoria,
  deleteCategoria,
  addItem,
  updateItem,
  deleteItem,
} from '../lib/dbPresupuesto'

export const usePresupuestoStore = create((set, get) => ({
  categorias: [],
  loading: true,
  currentProjectId: null,

  fetchByProject: async (projectId) => {
    set({ loading: true, currentProjectId: projectId })
    const categorias = await getCategoriasByProject(projectId)
    set({ categorias, loading: false })
  },

  refresh: async () => {
    const { currentProjectId } = get()
    if (!currentProjectId) return
    const categorias = await getCategoriasByProject(currentProjectId)
    set({ categorias })
  },

  addCategoria: async (data) => {
    await addCategoria(data)
    await get().refresh()
  },
  updateCategoria: async (id, data) => {
    await updateCategoria(id, data)
    await get().refresh()
  },
  deleteCategoria: async (id) => {
    await deleteCategoria(id)
    await get().refresh()
  },

  addItem: async (data) => {
    await addItem(data)
    await get().refresh()
  },
  updateItem: async (id, data) => {
    await updateItem(id, data)
    await get().refresh()
  },
  deleteItem: async (id) => {
    await deleteItem(id)
    await get().refresh()
  },

  _channel: null,
  initRealtime: (projectId) => {
    if (get()._channel) return
    const channel = supabase
      .channel(`presupuesto-sync-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presupuesto_categorias', filter: `proyecto_id=eq.${projectId}` },
        () => get().refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presupuesto_items' },
        () => get().refresh()
      )
      .subscribe()
    set({ _channel: channel })
  },
  teardownRealtime: () => {
    get()._channel?.unsubscribe()
    set({ _channel: null })
  },
}))
