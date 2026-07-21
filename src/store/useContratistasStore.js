import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  getContratistas,
  addContratista,
  updateContratista,
  deleteContratista,
  getContractorPayments,
  addContractorPayment,
  updateContractorPayment,
  deleteContractorPayment,
  registrarAbono,
} from '../lib/dbContratistas'

function friendlyError(e) {
  if (e?.code === '55P03') {
    return new Error('Otro usuario está registrando un abono sobre este pago ahora mismo, intenta de nuevo en un momento.')
  }
  return e
}

export const useContratistasStore = create((set, get) => ({
  contratistas: [],
  payments: [],
  loading: true,

  fetchAll: async () => {
    set({ loading: true })
    const [contratistas, payments] = await Promise.all([getContratistas(), getContractorPayments()])
    set({ contratistas, payments, loading: false })
  },

  addContratista: async (data) => {
    await addContratista(data)
    await get().fetchAll()
  },
  updateContratista: async (id, data) => {
    await updateContratista(id, data)
    await get().fetchAll()
  },
  deleteContratista: async (id) => {
    await deleteContratista(id)
    await get().fetchAll()
  },

  addPayment: async (data) => {
    await addContractorPayment(data)
    await get().fetchAll()
  },
  updatePayment: async (id, data) => {
    await updateContractorPayment(id, data)
    await get().fetchAll()
  },
  deletePayment: async (id) => {
    await deleteContractorPayment(id)
    await get().fetchAll()
  },

  registrarAbono: async (paymentId, abonoData) => {
    try {
      await registrarAbono(paymentId, abonoData)
      await get().fetchAll()
    } catch (e) {
      throw friendlyError(e)
    }
  },

  getPaymentsByContractor: (contractorId) => {
    return get().payments.filter((p) => p.contractorId === contractorId)
  },

  getContratistaResumen: (contractorId) => {
    const cPayments = get().payments.filter((p) => p.contractorId === contractorId)
    const totalFacturado = cPayments.reduce((s, p) => s + p.amount, 0)
    const totalPagado = cPayments.reduce((s, p) => s + p.paidAmount, 0)
    const pendiente = totalFacturado - totalPagado
    return { totalFacturado, totalPagado, pendiente, totalCuentas: cPayments.length }
  },

  _channel: null,
  initRealtime: () => {
    if (get()._channel) return
    const channel = supabase
      .channel('contratistas-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contratistas', filter: 'tenant_id=eq.ada' },
        () => get().fetchAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pagos_contratistas', filter: 'tenant_id=eq.ada' },
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
