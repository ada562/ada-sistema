import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ListChecks } from 'lucide-react'
import { getSaldosIniciales } from '../../lib/dbSettings'
import { useTesoreriaStore } from '../../store/useTesoreriaStore'
import { fmtMoney, fmtDate } from '../../lib/formatters'

const CUENTAS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'banco', label: 'Banco' },
  { value: 'nequi', label: 'Nequi' },
]

export default function Conciliacion() {
  const [cuenta, setCuenta] = useState('efectivo')
  const [saldosIniciales, setSaldosIniciales] = useState(null)

  const {
    transactions,
    balances,
    loading,
    fetchAll,
    initRealtime,
    teardownRealtime,
    toggleConciliado,
  } = useTesoreriaStore()

  useEffect(() => {
    fetchAll()
    initRealtime()
    return () => teardownRealtime()
  }, [fetchAll, initRealtime, teardownRealtime])

  useEffect(() => {
    getSaldosIniciales()
      .then(setSaldosIniciales)
      .catch(() => setSaldosIniciales(null))
  }, [])

  const movimientos = useMemo(() => {
    return transactions
      .filter((tx) => tx.account === cuenta)
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
  }, [transactions, cuenta])

  const pendientes = movimientos.filter((tx) => !tx.conciliado)
  const totalPendiente = pendientes.reduce((sum, tx) => sum + tx.amount, 0)
  const totalMovimientos = movimientos.length
  const revisados = totalMovimientos - pendientes.length

  const handleToggle = async (tx) => {
    try {
      await toggleConciliado(tx.id, !tx.conciliado)
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar el movimiento')
    }
  }

  const handleReiniciar = async () => {
    if (!window.confirm(`¿Marcar los ${totalMovimientos} movimientos de ${cuenta} como pendientes de revisar de nuevo?`)) return
    try {
      await Promise.all(movimientos.filter((tx) => tx.conciliado).map((tx) => toggleConciliado(tx.id, false)))
      toast.success('Conciliación reiniciada')
    } catch (err) {
      toast.error(err.message || 'No se pudo reiniciar')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ListChecks size={24} className="text-indigo-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Conciliación</h2>
          <p className="text-sm text-gray-500">
            Revisa movimiento por movimiento hasta que el monto pendiente llegue a $0
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {CUENTAS.map((c) => (
          <button
            key={c.value}
            onClick={() => setCuenta(c.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              cuenta === c.value
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Por revisar</p>
          <p className={`text-2xl font-bold ${totalPendiente === 0 ? 'text-green-600' : 'text-amber-600'}`}>
            {fmtMoney(totalPendiente)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{pendientes.length} movimiento(s)</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Revisados</p>
          <p className="text-2xl font-bold text-gray-900">{revisados} / {totalMovimientos}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Saldo actual en sistema ({cuenta})</p>
          <p className="text-2xl font-bold text-gray-900">{fmtMoney(balances[cuenta] || 0)}</p>
          {saldosIniciales && (
            <p className="text-xs text-gray-400 mt-1">
              Saldo inicial: {fmtMoney(saldosIniciales[cuenta] || 0)} ({fmtDate(saldosIniciales.fecha)})
            </p>
          )}
        </div>
      </div>

      {totalPendiente === 0 && totalMovimientos > 0 && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">
          Ya revisaste todos los movimientos de {cuenta}. Si sigue sin cuadrar, el error está en el saldo inicial
          o en un movimiento que falta registrar.
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Movimientos de {cuenta}</p>
          {revisados > 0 && (
            <button onClick={handleReiniciar} className="text-xs text-gray-400 hover:text-red-600">
              Reiniciar revisión
            </button>
          )}
        </div>
        {loading ? (
          <p className="text-sm text-gray-400 px-4 py-6">Cargando...</p>
        ) : movimientos.length === 0 ? (
          <p className="text-sm text-gray-400 px-4 py-6">Sin movimientos en esta cuenta.</p>
        ) : (
          <div className="max-h-[32rem] overflow-y-auto divide-y divide-gray-100">
            {movimientos.map((tx) => (
              <label
                key={tx.id}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer ${
                  tx.conciliado ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!tx.conciliado}
                  onChange={() => handleToggle(tx)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">
                    {tx.description || tx.category || '(sin descripción)'}
                  </p>
                  <p className="text-xs text-gray-400">{fmtDate(tx.date)} · {tx.category || 'Sin categoría'}</p>
                </div>
                <span className={`text-sm font-medium ${tx.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'ingreso' ? '+' : '-'}{fmtMoney(tx.amount)}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
