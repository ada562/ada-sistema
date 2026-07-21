import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTesoreriaStore } from '../../store/useTesoreriaStore'
import { useProyectosStore } from '../../store/useProyectosStore'
import { fmtMoney, fmtDate } from '../../lib/formatters'

const cuentaLabel = { banco: 'Banco', efectivo: 'Efectivo', nequi: 'Nequi' }

export default function TablaMovimientos() {
  const { getFilteredTransactions, openModal, deleteTx } = useTesoreriaStore()
  const getProyectoById = useProyectosStore((s) => s.getProyectoById)
  const transactions = getFilteredTransactions()

  const handleDelete = async (tx) => {
    if (!window.confirm(`¿Eliminar movimiento "${tx.description || tx.category}" por ${fmtMoney(tx.amount)}?`)) return
    try {
      await deleteTx(tx.id)
      toast.success('Movimiento eliminado')
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el movimiento')
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No hay movimientos con los filtros seleccionados</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm text-gray-500">{transactions.length} movimientos</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">Fecha</th>
              <th className="px-4 py-3 font-medium text-gray-600">Tipo</th>
              <th className="px-4 py-3 font-medium text-gray-600">Cuenta</th>
              <th className="px-4 py-3 font-medium text-gray-600">Categoría</th>
              <th className="px-4 py-3 font-medium text-gray-600">Proyecto</th>
              <th className="px-4 py-3 font-medium text-gray-600">Descripción</th>
              <th className="px-4 py-3 font-medium text-gray-600 text-right">Monto</th>
              <th className="px-4 py-3 font-medium text-gray-600 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((tx) => {
              const proyecto = tx.projectId ? getProyectoById(tx.projectId) : null
              return (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(tx.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      tx.type === 'ingreso'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {tx.type === 'ingreso' ? 'Ingreso' : 'Gasto'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{cuentaLabel[tx.account] || tx.account}</td>
                  <td className="px-4 py-3 text-gray-600">{tx.category}</td>
                  <td className="px-4 py-3 text-gray-600">{proyecto?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{tx.description || '—'}</td>
                  <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${
                    tx.type === 'ingreso' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {tx.type === 'ingreso' ? '+' : '-'}{fmtMoney(tx.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openModal(tx)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(tx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
