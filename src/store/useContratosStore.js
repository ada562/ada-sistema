import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { getContratos, registrarContrato, updateContrato, deleteContrato } from '../lib/dbContratos'

function friendlyError(e) {
  if (e?.code === '55P03') {
    return new Error('Otro usuario está registrando un contrato para este empleado ahora mismo, intenta de nuevo en un momento.')
  }
  return e
}

export const useContratosStore = create((set, get) => ({
  contratos: [],
  loading: true,

  fetchAll: async () => {
    set({ loading: true })
    const contratos = await getContratos()
    set({ contratos, loading: false })
  },

  registrarContrato: async (data) => {
    try {
      await registrarContrato(data)
      await get().fetchAll()
    } catch (e) {
      throw friendlyError(e)
    }
  },
  updateContrato: async (id, data) => {
    await updateContrato(id, data)
    await get().fetchAll()
  },
  deleteContrato: async (id) => {
    await deleteContrato(id)
    await get().fetchAll()
  },

  getContratosByEmpleado: (empleadoId) =>
    get().contratos.filter((c) => c.employeeId === empleadoId),

  getVigentesPorVencer: (days = 30) => {
    const today = new Date().toISOString().slice(0, 10)
    const limit = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    return get().contratos.filter(
      (c) => c.status === 'Vigente' && c.endDate && c.endDate >= today && c.endDate <= limit
    )
  },

  _channel: null,
  initRealtime: () => {
    if (get()._channel) return
    const channel = supabase
      .channel('contratos-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contratos', filter: 'tenant_id=eq.ada' },
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
