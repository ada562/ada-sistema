import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  getTimelogs,
  addTimelog,
  updateTimelog,
  deleteTimelog,
} from '../lib/dbTimelogs'

export const useTimelogsStore = create((set, get) => ({
  timelogs: [],
  loading: true,

  fetchAll: async () => {
    set({ loading: true })
    const timelogs = await getTimelogs()
    set({ timelogs, loading: false })
  },

  addTimelog: async (data) => {
    await addTimelog(data)
    await get().fetchAll()
  },
  updateTimelog: async (id, data) => {
    await updateTimelog(id, data)
    await get().fetchAll()
  },
  deleteTimelog: async (id) => {
    await deleteTimelog(id)
    await get().fetchAll()
  },

  getByProject: (projectId) => {
    return get().timelogs.filter((t) => t.projectId === projectId)
  },
  getByEmployee: (employeeId) => {
    return get().timelogs.filter((t) => t.employeeId === employeeId)
  },

  _channel: null,
  initRealtime: () => {
    if (get()._channel) return
    const channel = supabase
      .channel('registro-horas-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registro_horas', filter: 'tenant_id=eq.ada' },
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
