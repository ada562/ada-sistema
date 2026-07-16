import { create } from 'zustand'

export const useNavigationStore = create((set) => ({
  activeView: 'dashboard',
  viewParam: null,
  expandedDepartments: [],
  sidebarOpen: false,

  setActiveView: (view, param = null) => set({ activeView: view, viewParam: param, sidebarOpen: false }),

  toggleDepartment: (deptId) =>
    set((state) => ({
      expandedDepartments: state.expandedDepartments.includes(deptId)
        ? state.expandedDepartments.filter((id) => id !== deptId)
        : [...state.expandedDepartments, deptId],
    })),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
}))
