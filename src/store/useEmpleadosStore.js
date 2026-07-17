import { create } from 'zustand'
import {
  getEmpleados,
  addEmpleado,
  updateEmpleado,
  deleteEmpleado,
} from '../lib/dbEmpleados'

export const useEmpleadosStore = create((set) => ({
  employees: getEmpleados(),

  modalOpen: false,
  editingEmployee: null,

  openModal: (emp = null) => set({ modalOpen: true, editingEmployee: emp }),
  closeModal: () => set({ modalOpen: false, editingEmployee: null }),

  addEmployee: (data) => {
    addEmpleado(data)
    set({ employees: getEmpleados() })
  },

  updateEmployee: (id, data) => {
    updateEmpleado(id, data)
    set({ employees: getEmpleados() })
  },

  deleteEmployee: (id) => {
    deleteEmpleado(id)
    set({ employees: getEmpleados() })
  },

  refresh: () => set({ employees: getEmpleados() }),
}))
