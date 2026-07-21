import { useEffect, useState } from 'react'
import { Handshake, Plus, Pencil, Trash2, DollarSign, ChevronDown, ChevronUp, Phone, Mail, FileText, Printer } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/UI/Button'
import Modal from '../../components/UI/Modal'
import { useContratistasStore } from '../../store/useContratistasStore'
import ReciboContratista from '../../components/contratistas/ReciboContratista'
import { fmtMoney, fmtDate, todayIso } from '../../lib/formatters'

export default function Contratistas() {
  const contratistas = useContratistasStore((s) => s.contratistas)
  const loading = useContratistasStore((s) => s.loading)
  const fetchAll = useContratistasStore((s) => s.fetchAll)
  const initRealtime = useContratistasStore((s) => s.initRealtime)
  const teardownRealtime = useContratistasStore((s) => s.teardownRealtime)
  const addContratista = useContratistasStore((s) => s.addContratista)
  const updateContratista = useContratistasStore((s) => s.updateContratista)
  const deleteContratistaAction = useContratistasStore((s) => s.deleteContratista)
  const addPayment = useContratistasStore((s) => s.addPayment)
  const updatePayment = useContratistasStore((s) => s.updatePayment)
  const deletePayment = useContratistasStore((s) => s.deletePayment)
  const registrarAbonoAction = useContratistasStore((s) => s.registrarAbono)
  const getPaymentsByContractor = useContratistasStore((s) => s.getPaymentsByContractor)
  const getContratistaResumen = useContratistasStore((s) => s.getContratistaResumen)

  const [expanded, setExpanded] = useState(null)
  const [formModal, setFormModal] = useState({ open: false, data: null })
  const [payModal, setPayModal] = useState({ open: false, contractorId: null, data: null })
  const [abonoModal, setAbonoModal] = useState({ open: false, payment: null, contractor: null })
  const [reciboModal, setReciboModal] = useState({ open: false, payment: null, contractor: null })

  useEffect(() => {
    fetchAll()
    initRealtime()
    return () => teardownRealtime()
  }, [fetchAll, initRealtime, teardownRealtime])

  const toggle = (id) => setExpanded(expanded === id ? null : id)

  const handleDeleteContratista = async (c) => {
    if (!window.confirm(`¿Eliminar contratista "${c.name}"?`)) return
    try {
      await deleteContratistaAction(c.id)
      toast.success('Contratista eliminado')
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el contratista')
    }
  }

  const handleDeletePayment = async (p) => {
    if (!window.confirm('¿Eliminar esta cuenta?')) return
    try {
      await deletePayment(p.id)
      toast.success('Cuenta eliminada')
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la cuenta')
    }
  }

  // Totals
  const totals = contratistas.reduce(
    (acc, c) => {
      const r = getContratistaResumen(c.id)
      acc.facturado += r.totalFacturado
      acc.pagado += r.totalPagado
      acc.pendiente += r.pendiente
      return acc
    },
    { facturado: 0, pagado: 0, pendiente: 0 }
  )

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Handshake size={24} className="text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Contratistas</h2>
        </div>
        <Button onClick={() => setFormModal({ open: true, data: null })}>
          <Plus size={16} /> Nuevo contratista
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Total facturado</p>
          <p className="text-lg font-bold text-gray-900">{fmtMoney(totals.facturado)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Total pagado</p>
          <p className="text-lg font-bold text-green-700">{fmtMoney(totals.pagado)}</p>
        </div>
        <div className={`border rounded-lg p-4 ${totals.pendiente > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <p className="text-xs text-gray-500 uppercase font-semibold">Pendiente por pagar</p>
          <p className={`text-lg font-bold ${totals.pendiente > 0 ? 'text-red-700' : 'text-green-700'}`}>{fmtMoney(totals.pendiente)}</p>
        </div>
      </div>

      {/* Lista de contratistas */}
      <div className="space-y-3">
        {contratistas.map((c) => {
          const resumen = getContratistaResumen(c.id)
          const isExpanded = expanded === c.id
          const payments = isExpanded ? getPaymentsByContractor(c.id) : []

          return (
            <div key={c.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Contractor header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => toggle(c.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    {c.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{c.name}</div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {c.phone && <span className="flex items-center gap-1"><Phone size={10} /> {c.phone}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail size={10} /> {c.email}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{fmtMoney(resumen.totalFacturado)}</div>
                    <div className={`text-xs ${resumen.pendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {resumen.pendiente > 0 ? `Pendiente: ${fmtMoney(resumen.pendiente)}` : 'Al día'}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              {/* Expanded: payments */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Cuentas y pagos</span>
                      {c.notes && <span className="text-xs text-gray-400">— {c.notes}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setFormModal({ open: true, data: c }) }}>
                        <Pencil size={13} /> Editar
                      </Button>
                      <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDeleteContratista(c) }}>
                        <Trash2 size={13} />
                      </Button>
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); setPayModal({ open: true, contractorId: c.id, data: null }) }}>
                        <Plus size={13} /> Nueva cuenta
                      </Button>
                    </div>
                  </div>

                  {payments.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Sin cuentas registradas</p>
                  ) : (
                    <div className="space-y-2">
                      {payments.map((p) => {
                        const pendiente = p.amount - p.paidAmount
                        const pct = p.amount > 0 ? Math.round((p.paidAmount / p.amount) * 100) : 0
                        const isPago = pendiente <= 0

                        return (
                          <div key={p.id} className="bg-white rounded-lg border border-gray-200 p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <FileText size={13} className="text-gray-400 shrink-0" />
                                  <span className="text-sm font-medium text-gray-900 truncate">{p.description || 'Sin descripción'}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPago ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {isPago ? 'Pagado' : `${pct}%`}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mb-2">
                                  Fecha: {fmtDate(p.date)}
                                  {p.datePagoTotal && ` · Pagado total: ${fmtDate(p.datePagoTotal)}`}
                                </div>
                                {/* Progress bar */}
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${isPago ? 'bg-green-500' : 'bg-indigo-500'}`}
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                  <div className="text-xs text-gray-600 whitespace-nowrap">
                                    {fmtMoney(p.paidAmount)} / {fmtMoney(p.amount)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-3 shrink-0">
                                {!isPago && (
                                  <button
                                    onClick={() => setAbonoModal({ open: true, payment: p, contractor: c })}
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg text-xs font-medium flex items-center gap-1"
                                    title="Registrar abono"
                                  >
                                    <DollarSign size={13} /> Abonar
                                  </button>
                                )}
                                <button
                                  onClick={() => setReciboModal({ open: true, payment: p, contractor: c })}
                                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                                  title="Ver recibo"
                                >
                                  <Printer size={13} />
                                </button>
                                <button
                                  onClick={() => setPayModal({ open: true, contractorId: c.id, data: p })}
                                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                  title="Editar cuenta"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeletePayment(p)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Eliminar"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modales */}
      <FormContratista
        open={formModal.open}
        data={formModal.data}
        onClose={() => setFormModal({ open: false, data: null })}
        addContratista={addContratista}
        updateContratista={updateContratista}
      />
      <FormCuenta
        open={payModal.open}
        contractorId={payModal.contractorId}
        data={payModal.data}
        onClose={() => setPayModal({ open: false, contractorId: null, data: null })}
        addPayment={addPayment}
        updatePayment={updatePayment}
      />
      <AbonoModal
        open={abonoModal.open}
        payment={abonoModal.payment}
        contractor={abonoModal.contractor}
        onClose={() => setAbonoModal({ open: false, payment: null, contractor: null })}
        registrarAbono={registrarAbonoAction}
      />
      <ReciboContratista
        open={reciboModal.open}
        onClose={() => setReciboModal({ open: false, payment: null, contractor: null })}
        payment={reciboModal.payment}
        contractor={reciboModal.contractor}
      />
    </div>
  )
}

/* ─── Modal: Crear/Editar Contratista ─── */

function FormContratista({ open, data, onClose, addContratista, updateContratista }) {
  const [form, setForm] = useState({})
  const isEdit = !!data

  const resetForm = () => {
    setForm(data ? { ...data } : { name: '', phone: '', email: '', notes: '', active: true })
  }

  if (open && !form.name && form.name !== '' && !isEdit) resetForm()
  if (open && isEdit && form.id !== data?.id) resetForm()

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name?.trim()) return toast.error('Nombre requerido')
    try {
      if (isEdit) {
        await updateContratista(data.id, form)
        toast.success('Contratista actualizado')
      } else {
        await addContratista(form)
        toast.success('Contratista creado')
      }
      onClose()
      setForm({})
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar el contratista')
    }
  }

  return (
    <Modal open={open} onClose={() => { onClose(); setForm({}) }} title={isEdit ? 'Editar contratista' : 'Nuevo contratista'}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
          <input type="text" value={form.name || ''} onChange={(e) => set('name', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input type="text" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => { onClose(); setForm({}) }}>Cancelar</Button>
          <Button onClick={handleSave}>{isEdit ? 'Guardar' : 'Crear'}</Button>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Modal: Crear/Editar Cuenta ─── */

function FormCuenta({ open, contractorId, data, onClose, addPayment, updatePayment }) {
  const [form, setForm] = useState({})
  const isEdit = !!data

  const resetForm = () => {
    setForm(data ? { ...data } : { date: todayIso(), amount: '', paidAmount: '0', description: '' })
  }

  if (open && !form.date && !isEdit) resetForm()
  if (open && isEdit && form.id !== data?.id) resetForm()

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    try {
      if (isEdit) {
        await updatePayment(data.id, form)
        toast.success('Cuenta actualizada')
      } else {
        await addPayment({ ...form, contractorId })
        toast.success('Cuenta creada')
      }
      onClose()
      setForm({})
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar la cuenta')
    }
  }

  return (
    <Modal open={open} onClose={() => { onClose(); setForm({}) }} title={isEdit ? 'Editar cuenta' : 'Nueva cuenta'}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input type="date" value={form.date || ''} onChange={(e) => set('date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor total</label>
            <input type="number" value={form.amount || ''} onChange={(e) => set('amount', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => { onClose(); setForm({}) }}>Cancelar</Button>
          <Button onClick={handleSave}>{isEdit ? 'Guardar' : 'Crear'}</Button>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Modal: Registrar Abono ─── */

function AbonoModal({ open, payment, contractor, onClose, registrarAbono }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('banco')

  if (!open || !payment) return null

  const pendiente = payment.amount - payment.paidAmount

  const handleAbono = async () => {
    const monto = Number(amount)
    if (!monto || monto <= 0) return toast.error('Monto inválido')
    if (monto > pendiente) return toast.error(`El abono excede el pendiente (${fmtMoney(pendiente)})`)

    try {
      await registrarAbono(payment.id, { amount: monto, method, date: todayIso() })
      toast.success(`Abono de ${fmtMoney(monto)} registrado`)
      onClose()
      setAmount('')
      setMethod('banco')
    } catch (err) {
      toast.error(err.message || 'No se pudo registrar el abono')
    }
  }

  return (
    <Modal open={open} onClose={() => { onClose(); setAmount(''); setMethod('banco') }} title="Registrar abono">
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Contratista</span>
            <span className="font-semibold text-gray-900">{contractor?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Descripción</span>
            <span className="text-gray-700 text-right max-w-[250px] truncate">{payment.description}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Valor total</span>
            <span className="text-gray-700">{fmtMoney(payment.amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Pagado</span>
            <span className="text-green-700">{fmtMoney(payment.paidAmount)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
            <span className="font-semibold text-gray-700">Pendiente</span>
            <span className="font-bold text-red-700">{fmtMoney(pendiente)}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monto del abono</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Máximo ${fmtMoney(pendiente)}`}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Medio de pago</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
            <option value="banco">Banco</option>
            <option value="efectivo">Efectivo</option>
            <option value="nequi">Nequi</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => { onClose(); setAmount(''); setMethod('banco') }}>Cancelar</Button>
          <Button onClick={handleAbono}>Registrar abono</Button>
        </div>
        <p className="text-xs text-gray-400 text-center">El abono se registrará automáticamente como gasto en Tesorería</p>
      </div>
    </Modal>
  )
}
