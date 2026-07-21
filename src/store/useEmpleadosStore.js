import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { getEmpleados, addEmpleado, updateEmpleado, deleteEmpleado } from '../lib/dbEmpleados'

export const useEmpleadosStore = create((set, get) => ({
  employees: [],
  loading: true,
  modalOpen: false,
  editingEmployee: null,

  fetchAll: async () => {
    set({ loading: true })
    const employees = await getEmpleados()
    set({ employees, loading: false })
  },

  openModal: (emp = null) => set({ modalOpen: true, editingEmployee: emp }),
  closeModal: () => set({ modalOpen: false, editingEmployee: null }),

  addEmployee: async (data) => {
    await addEmpleado(data)
    await get().fetchAll()
  },
  updateEmployee: async (id, data) => {
    await updateEmpleado(id, data)
    await get().fetchAll()
  },
  deleteEmployee: async (id) => {
    await deleteEmpleado(id)
    await get().fetchAll()
  },

  getEmpleadoById: (id) => get().employees.find((e) => e.id === id) || null,
  getEmpleadosActivos: () =>
    get().employees.filter((e) => e.status === 'Activo' || e.status === 'Vacaciones' || e.status === 'Incapacidad'),

  _channel: null,
  initRealtime: () => {
    if (get()._channel) return
    const channel = supabase
      .channel('empleados-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'empleados', filter: 'tenant_id=eq.ada' },
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
