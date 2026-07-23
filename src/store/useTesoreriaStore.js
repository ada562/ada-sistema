import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getAccountBalances,
  setConciliado,
} from '../lib/dbTesoreria'

const emptyBalances = { banco: 0, efectivo: 0, nequi: 0 }

function friendlyError(e) {
  if (e?.code === '55P03') {
    return new Error('Otro usuario está registrando un movimiento en esta cuenta ahora mismo, intenta de nuevo en un momento.')
  }
  return e
}

export const useTesoreriaStore = create((set, get) => ({
  transactions: [],
  balances: emptyBalances,
  loading: true,
  balancesLoading: true,

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

  fetchAll: async () => {
    set({ loading: true, balancesLoading: true })
    const [transactions, balances] = await Promise.all([getTransactions(), getAccountBalances()])
    set({ transactions, balances, loading: false, balancesLoading: false })
  },

  fetchBalances: async () => {
    set({ balancesLoading: true })
    const balances = await getAccountBalances()
    set({ balances, balancesLoading: false })
  },

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

  addTx: async (data) => {
    try {
      await addTransaction(data)
      await get().fetchAll()
    } catch (e) {
      throw friendlyError(e)
    }
  },

  updateTx: async (id, data) => {
    try {
      await updateTransaction(id, data)
      await get().fetchAll()
    } catch (e) {
      throw friendlyError(e)
    }
  },

  deleteTx: async (id) => {
    try {
      await deleteTransaction(id)
      await get().fetchAll()
    } catch (e) {
      throw friendlyError(e)
    }
  },

  toggleConciliado: async (id, conciliado) => {
    // Update optimista: la realtime de 'transacciones' igual llama fetchAll(),
    // pero esto evita el parpadeo del checkbox mientras llega el evento.
    set((state) => ({
      transactions: state.transactions.map((tx) => (tx.id === id ? { ...tx, conciliado } : tx)),
    }))
    try {
      await setConciliado(id, conciliado)
    } catch (e) {
      set((state) => ({
        transactions: state.transactions.map((tx) => (tx.id === id ? { ...tx, conciliado: !conciliado } : tx)),
      }))
      throw friendlyError(e)
    }
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

  _channel: null,
  initRealtime: () => {
    if (get()._channel) return
    const channel = supabase
      .channel('transacciones-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transacciones', filter: 'tenant_id=eq.ada' },
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
