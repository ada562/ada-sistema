import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { getPayrollPayments, registrarPagoNomina } from '../lib/dbNomina'

function friendlyError(e) {
  if (e?.code === '55P03') {
    return new Error('Otro usuario está registrando un pago sobre este empleado ahora mismo, intenta de nuevo en un momento.')
  }
  return e
}

export const useNominaStore = create((set, get) => ({
  payments: [],
  loading: true,

  fetchAll: async () => {
    set({ loading: true })
    const payments = await getPayrollPayments()
    set({ payments, loading: false })
  },

  registrarPago: async (data) => {
    try {
      const payment = await registrarPagoNomina(data)
      await get().fetchAll()
      return payment
    } catch (e) {
      throw friendlyError(e)
    }
  },

  _channel: null,
  initRealtime: () => {
    if (get()._channel) return
    const channel = supabase
      .channel('nomina-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pagos_nomina', filter: 'tenant_id=eq.ada' },
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
