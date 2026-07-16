import { create } from 'zustand'
import {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getAccountBalances,
} from '../lib/dbTesoreria'

export const useTesoreriaStore = create((set, get) => ({
  transactions: getTransactions(),
  balances: getAccountBalances(),

  filters: {
    tipo: 'todos',
    cuenta: 'todas',
    categoria: 'todas',
    proyecto: 'todos',
    fechaDesde: '',
    fechaHasta: '',
  },

  modalOpen: false,
  editingTx: null,

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  resetFilters: () =>
    set({
      filters: {
        tipo: 'todos',
        cuenta: 'todas',
        categoria: 'todas',
        proyecto: 'todos',
        fechaDesde: '',
        fechaHasta: '',
      },
    }),

  openModal: (tx = null) => set({ modalOpen: true, editingTx: tx }),
  closeModal: () => set({ modalOpen: false, editingTx: null }),

  addTx: (data) => {
    addTransaction(data)
    set({ transactions: getTransactions(), balances: getAccountBalances() })
  },

  updateTx: (id, data) => {
    updateTransaction(id, data)
    set({ transactions: getTransactions(), balances: getAccountBalances() })
  },

  deleteTx: (id) => {
    deleteTransaction(id)
    set({ transactions: getTransactions(), balances: getAccountBalances() })
  },

  getFilteredTransactions: () => {
    const { transactions, filters } = get()
    return transactions
      .filter((tx) => {
        if (filters.tipo !== 'todos' && tx.type !== filters.tipo) return false
        if (filters.cuenta !== 'todas' && tx.account !== filters.cuenta) return false
        if (filters.categoria !== 'todas' && tx.category !== filters.categoria) return false
        if (filters.proyecto !== 'todos' && (tx.projectId || 'sin-proyecto') !== filters.proyecto) return false
        if (filters.fechaDesde && tx.date < filters.fechaDesde) return false
        if (filters.fechaHasta && tx.date > filters.fechaHasta) return false
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  },
}))
