import { create } from 'zustand'
import {
  getServiciosByProject,
  addServicio,
  updateServicio,
  deleteServicio,
} from '../lib/dbServicios'

export const useServiciosStore = create((set) => ({
  modalOpen: false,
  editingServicio: null,

  openModal: (servicio = null) => set({ modalOpen: true, editingServicio: servicio }),
  closeModal: () => set({ modalOpen: false, editingServicio: null }),

  getByProject: (projectId) => getServiciosByProject(projectId),

  addServicio: (data) => {
    addServicio(data)
  },

  updateServicio: (id, data) => {
    updateServicio(id, data)
  },

  deleteServicio: (id) => {
    deleteServicio(id)
  },
}))
