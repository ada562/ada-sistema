import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { getDocumentos, uploadDocumento, deleteDocumento, getDocumentoUrl } from '../lib/dbDocumentos'

export const useDocumentosStore = create((set, get) => ({
  documentos: [],
  loading: true,

  fetchAll: async () => {
    set({ loading: true })
    const documentos = await getDocumentos()
    set({ documentos, loading: false })
  },

  getByEmpleado: (empleadoId) => get().documentos.filter((d) => d.empleadoId === empleadoId),

  upload: async (empleadoId, tipo, file) => {
    await uploadDocumento(empleadoId, tipo, file)
    await get().fetchAll()
  },
  remove: async (id, storagePath) => {
    await deleteDocumento(id, storagePath)
    await get().fetchAll()
  },
  getUrl: (storagePath) => getDocumentoUrl(storagePath),

  _channel: null,
  initRealtime: () => {
    if (get()._channel) return
    const channel = supabase
      .channel('empleado-documentos-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'empleado_documentos', filter: 'tenant_id=eq.ada' },
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
