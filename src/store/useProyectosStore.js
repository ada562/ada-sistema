import { create } from 'zustand'
import {
  getProyectos,
  addProyecto,
  updateProyecto,
  deleteProyecto,
  getAllProjectsWithMetrics,
} from '../lib/dbProyectos'

export const useProyectosStore = create((set) => ({
  projects: getAllProjectsWithMetrics(),

  modalOpen: false,
  editingProject: null,

  openModal: (project = null) => set({ modalOpen: true, editingProject: project }),
  closeModal: () => set({ modalOpen: false, editingProject: null }),

  addProject: (data) => {
    addProyecto(data)
    set({ projects: getAllProjectsWithMetrics() })
  },

  updateProject: (id, data) => {
    updateProyecto(id, data)
    set({ projects: getAllProjectsWithMetrics() })
  },

  deleteProject: (id) => {
    deleteProyecto(id)
    set({ projects: getAllProjectsWithMetrics() })
  },

  refresh: () => set({ projects: getAllProjectsWithMetrics() }),
}))
