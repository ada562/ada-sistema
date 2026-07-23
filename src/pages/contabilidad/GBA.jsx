import { useState, useEffect } from 'react'
import { Handshake, Plus, ArrowUpRight, ArrowDownLeft, RefreshCw, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/UI/Button'
import Modal from '../../components/UI/Modal'
import { getTransactions, addTransaction, deleteTransaction, updateTransaction } from '../../lib/dbTesoreria'
import { useProyectosStore } from '../../store/useProyectosStore'
import { fmtMoney, fmtDate, todayIso } from '../../lib/formatters'

const MOVEMENT_TYPES = [
  { value: 'prestamo_otorgado', label: 'Préstamo otorgado (ADA → GBA)', icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-50' },
  { value: 'prestamo_recibido', label: 'Préstamo recibido (GBA → ADA)', icon: ArrowDownLeft, color: 'text-green-600', bg: 'bg-green-50' },
  { value: 'pago_prestamo', label: 'Pago de préstamo', icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50' },
]

function getMovementMeta(type) {
  return MOVEMENT_TYPES.find((m) => m.value === type) || MOVEMENT_TYPES[0]
}

export default function GBA() {
  const [allTransactions, setAllTransactions] = useState([])
  const [formModal, setFormModal] = useState({ open: false, data: null })

  const {
    projects: allProjects,
    fetchAll: fetchProyectos,
    initRealtime: initProyectosRealtime,
    teardownRealtime: teardownProyectosRealtime,
  } = useProyectosStore()

  const refresh = () => {
    getTransactions().then(setAllTransactions)
  }

  useEffect(() => {
    let cancelled = false
    getTransactions().then((txs) => { if (!cancelled) setAllTransactions(txs) })
    fetchProyectos()
    initProyectosRealtime()
    return () => { cancelled = true; teardownProyectosRealtime() }
  }, [fetchProyectos, initProyectosRealtime, teardownProyectosRealtime])

  // GBA movements (transactions with category GBA and gbaMovement set)
  const gbaMovements = allTransactions
    .filter((t) => t.category === 'GBA' && t.gbaMovement)
    .sort((a, b) => b.date.localeCompare(a.date))

  // GBA projects
  const gbaProjects = allProjects.filter((p) => p.esDeGBA)

  // Calculate balance: prestamos_otorgados - prestamos_recibidos - pagos
  const totalOtorgado = gbaMovements
    .filter((m) => m.gbaMovement === 'prestamo_otorgado')
    .reduce((s, m) => s + m.amount, 0)
  const totalRecibido = gbaMovements
    .filter((m) => m.gbaMovement === 'prestamo_recibido')
    .reduce((s, m) => s + m.amount, 0)
  const totalPagos = gbaMovements
    .filter((m) => m.gbaMovement === 'pago_prestamo')
    .reduce((s, m) => s + m.amount, 0)

  // Saldo = lo que GBA le debe a ADA (otorgado) - lo que ADA le debe a GBA (recibido) - pagos hechos
  const saldoAFavor = totalOtorgado - totalPagos // GBA le debe a ADA
  const saldoEnContra = totalRecibido // ADA le debe a GBA
  const saldoNeto = saldoAFavor - saldoEnContra

  const handleDelete = async (tx) => {
    if (!window.confirm('¿Eliminar este movimiento GBA?')) return
    try {
      await deleteTransaction(tx.id)
      toast.success('Movimiento eliminado')
      refresh()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el movimiento')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Handshake size={24} className="text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">GBA — Gestión de Gastos Compartidos</h2>
        </div>
        <Button onClick={() => setFormModal({ open: true, data: null })}>
          <Plus size={16} /> Nuevo movimiento
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Préstamos otorgados</p>
          <p className="text-lg font-bold text-red-600">{fmtMoney(totalOtorgado)}</p>
          <p className="text-xs text-gray-400 mt-1">ADA prestó a GBA</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Préstamos recibidos</p>
          <p className="text-lg font-bold text-green-600">{fmtMoney(totalRecibido)}</p>
          <p className="text-xs text-gray-400 mt-1">GBA prestó a ADA</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Pagos realizados</p>
          <p className="text-lg font-bold text-blue-600">{fmtMoney(totalPagos)}</p>
          <p className="text-xs text-gray-400 mt-1">Abonos a deudas</p>
        </div>
        <div className={`border rounded-lg p-4 ${saldoNeto > 0 ? 'bg-green-50 border-green-200' : saldoNeto < 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <p className="text-xs text-gray-500 uppercase font-semibold">Saldo neto</p>
          <p className={`text-xl font-bold ${saldoNeto > 0 ? 'text-green-700' : saldoNeto < 0 ? 'text-red-700' : 'text-gray-700'}`}>
            {fmtMoney(Math.abs(saldoNeto))}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {saldoNeto > 0 ? 'GBA debe a ADA' : saldoNeto < 0 ? 'ADA debe a GBA' : 'Sin deuda'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Movimientos */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Movimientos GBA</h3>
            </div>
            {gbaMovements.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin movimientos registrados</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {gbaMovements.map((m) => {
                  const meta = getMovementMeta(m.gbaMovement)
                  const Icon = meta.icon
                  return (
                    <div key={m.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center`}>
                          <Icon size={16} className={meta.color} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{m.description}</div>
                          <div className="text-xs text-gray-500">{fmtDate(m.date)} · {meta.label}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${meta.color}`}>{fmtMoney(m.amount)}</span>
                        <button
                          onClick={() => setFormModal({ open: true, data: m })}
                          className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Proyectos GBA */}
        <div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Proyectos GBA ({gbaProjects.length})</h3>
            </div>
            {gbaProjects.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin proyectos GBA</p>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {gbaProjects.map((p) => (
                  <div key={p.id} className="px-4 py-2.5 hover:bg-gray-50">
                    <div className="text-sm font-medium text-gray-900">{p.name}</div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{p.client || 'Sin cliente'}</span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        p.status === 'Activo' ? 'bg-green-100 text-green-700' :
                        p.status === 'Finalizado' ? 'bg-gray-100 text-gray-500' :
                        'bg-amber-100 text-amber-700'
                      }`}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <FormGBAMovement
        open={formModal.open}
        data={formModal.data}
        onClose={() => setFormModal({ open: false, data: null })}
        onSaved={refresh}
      />
    </div>
  )
}

/* ─── Modal: Nuevo/Editar Movimiento GBA ─── */

function FormGBAMovement({ open, data, onClose, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const isEdit = !!data

  const resetForm = () => {
    setForm(data
      ? { date: data.date, amount: data.amount, gbaMovement: data.gbaMovement, description: data.description }
      : { date: todayIso(), amount: '', gbaMovement: 'prestamo_otorgado', description: '' }
    )
  }

  if (open && !form.date && !isEdit) resetForm()
  if (open && isEdit && form._editId !== data?.id) {
    resetForm()
    setForm((f) => ({ ...f, _editId: data.id }))
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    const amount = Number(form.amount)
    if (!amount || amount <= 0) return toast.error('Monto inválido')

    setSaving(true)
    try {
      if (isEdit) {
        await updateTransaction(data.id, {
          date: form.date,
          amount,
          gbaMovement: form.gbaMovement,
          description: form.description,
          category: 'GBA',
        })
        toast.success('Movimiento actualizado')
      } else {
        await addTransaction({
          date: form.date,
          type: form.gbaMovement === 'prestamo_recibido' ? 'ingreso' : 'gasto',
          account: null,
          amount,
          category: 'GBA',
          projectId: null,
          description: form.description,
          gbaMovement: form.gbaMovement,
          facturado: true,
        })
        toast.success('Movimiento GBA registrado')
      }
      onSaved()
      onClose()
      setForm({})
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar el movimiento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={() => { onClose(); setForm({}) }} title={isEdit ? 'Editar movimiento GBA' : 'Nuevo movimiento GBA'}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de movimiento</label>
          <select value={form.gbaMovement || ''} onChange={(e) => set('gbaMovement', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
            {MOVEMENT_TYPES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input type="date" value={form.date || ''} onChange={(e) => set('date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
            <input type="number" value={form.amount || ''} onChange={(e) => set('amount', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => { onClose(); setForm({}) }} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : (isEdit ? 'Guardar' : 'Registrar')}</Button>
        </div>
      </div>
    </Modal>
  )
}
