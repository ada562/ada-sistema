import { useEffect, useState } from 'react'
import { FileText, Plus, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/UI/Button'
import Modal from '../../components/UI/Modal'
import { useContratosStore } from '../../store/useContratosStore'
import { useEmpleadosStore } from '../../store/useEmpleadosStore'
import { fmtMoney, fmtDate, todayIso } from '../../lib/formatters'

const TIPOS_CONTRATO = ['Término fijo', 'Término indefinido', 'Prestación de servicios', 'Obra o labor', 'Aprendizaje']

const estadoColors = {
  Vigente: 'bg-green-100 text-green-700',
  Renovado: 'bg-blue-100 text-blue-700',
  Vencido: 'bg-red-100 text-red-700',
  Terminado: 'bg-gray-100 text-gray-500',
}

export default function Contratos() {
  const [formModal, setFormModal] = useState({ open: false, empleadoId: null })
  const [expanded, setExpanded] = useState(() => new Set())

  const {
    contratos,
    fetchAll: fetchContratos,
    initRealtime: initContratosRealtime,
    teardownRealtime: teardownContratosRealtime,
    registrarContrato,
    getContratosByEmpleado,
    getVigentesPorVencer,
  } = useContratosStore()

  const {
    getEmpleadosActivos,
    fetchAll: fetchEmpleados,
    initRealtime: initEmpleadosRealtime,
    teardownRealtime: teardownEmpleadosRealtime,
  } = useEmpleadosStore()

  useEffect(() => {
    fetchContratos()
    initContratosRealtime()
    fetchEmpleados()
    initEmpleadosRealtime()
    return () => {
      teardownContratosRealtime()
      teardownEmpleadosRealtime()
    }
  }, [fetchContratos, initContratosRealtime, teardownContratosRealtime, fetchEmpleados, initEmpleadosRealtime, teardownEmpleadosRealtime])

  const empleados = getEmpleadosActivos()
  const porVencer = getVigentesPorVencer(30)

  const toggleExpand = (empleadoId) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(empleadoId)) next.delete(empleadoId)
      else next.add(empleadoId)
      return next
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText size={24} className="text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Contratos</h2>
          <span className="text-sm text-gray-400">({empleados.length} empleados activos)</span>
        </div>
        <Button onClick={() => setFormModal({ open: true, empleadoId: null })}>
          <Plus size={16} /> Registrar contrato
        </Button>
      </div>

      {porVencer.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <p className="text-xs font-semibold text-amber-700 uppercase">Contratos por vencer (30 días)</p>
          </div>
          <div className="space-y-1">
            {porVencer.map((c) => {
              const emp = empleados.find((e) => e.id === c.employeeId)
              return (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{emp?.name || '—'} · {c.type}</span>
                  <span className="text-xs text-amber-600 font-medium">{fmtDate(c.endDate)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {empleados.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Sin empleados activos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {empleados.map((emp) => {
            const historial = getContratosByEmpleado(emp.id)
            const vigente = historial.find((c) => c.status === 'Vigente')
            const pasados = historial.filter((c) => c.id !== vigente?.id)
            const isExpanded = expanded.has(emp.id)

            return (
              <div key={emp.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-500">{emp.role || 'Sin cargo'}</p>
                  </div>
                  {vigente ? (
                    <div className="flex items-center gap-3 text-sm">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${estadoColors[vigente.status]}`}>
                        {vigente.type}
                      </span>
                      <span className="text-gray-600">
                        {fmtDate(vigente.startDate)} — {vigente.endDate ? fmtDate(vigente.endDate) : 'Indefinido'}
                      </span>
                      <span className="text-gray-900 font-medium">{fmtMoney(vigente.monthlySalary)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Sin contrato registrado</span>
                  )}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setFormModal({ open: true, empleadoId: emp.id })}>
                      {vigente ? 'Renovar' : 'Registrar'}
                    </Button>
                    {pasados.length > 0 && (
                      <button
                        onClick={() => toggleExpand(emp.id)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                        title="Ver historial"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && pasados.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500 text-left">
                          <th className="py-1 font-medium">Tipo</th>
                          <th className="py-1 font-medium">Periodo</th>
                          <th className="py-1 font-medium text-right">Salario</th>
                          <th className="py-1 font-medium text-center">Estado</th>
                          <th className="py-1 font-medium">Notas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pasados.map((c) => (
                          <tr key={c.id}>
                            <td className="py-1.5 text-gray-700">{c.type}</td>
                            <td className="py-1.5 text-gray-600">{fmtDate(c.startDate)} — {c.endDate ? fmtDate(c.endDate) : 'Indefinido'}</td>
                            <td className="py-1.5 text-right text-gray-700">{fmtMoney(c.monthlySalary)}</td>
                            <td className="py-1.5 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${estadoColors[c.status]}`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="py-1.5 text-gray-500 max-w-[200px] truncate">{c.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <FormContrato
        open={formModal.open}
        empleadoIdInicial={formModal.empleadoId}
        empleados={empleados}
        onClose={() => setFormModal({ open: false, empleadoId: null })}
        registrarContrato={registrarContrato}
      />
    </div>
  )
}

/* ─── Modal: Registrar contrato (alta o renovación) ─── */

function FormContrato({ open, empleadoIdInicial, empleados, onClose, registrarContrato }) {
  const emptyForm = {
    employeeId: '', type: '', startDate: todayIso(), endDate: '',
    monthlySalary: '', nonConstitutiveSalary: '', notes: '',
  }
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm({ ...emptyForm, employeeId: empleadoIdInicial || '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, empleadoIdInicial])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleClose = () => {
    setForm(emptyForm)
    onClose()
  }

  const handleSave = async () => {
    if (!form.employeeId) return toast.error('Selecciona un empleado')
    if (!form.type) return toast.error('Selecciona el tipo de contrato')
    if (!form.startDate) return toast.error('La fecha de inicio es obligatoria')
    if (form.endDate && form.endDate < form.startDate) return toast.error('La fecha de fin no puede ser anterior a la de inicio')

    setSaving(true)
    try {
      await registrarContrato(form)
      toast.success('Contrato registrado')
      handleClose()
    } catch (err) {
      toast.error(err.message || 'No se pudo registrar el contrato')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Registrar contrato">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Empleado *</label>
          <select value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
            <option value="">Seleccionar empleado...</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de contrato *</label>
          <select value={form.type} onChange={(e) => set('type', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
            <option value="">Seleccionar tipo...</option>
            {TIPOS_CONTRATO.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio *</label>
            <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
            <input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)}
              placeholder="Vacío = indefinido"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            <p className="text-[11px] text-gray-400 mt-1">Vacío = término indefinido</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salario mensual</label>
            <input type="number" min="0" step="1000" value={form.monthlySalary} onChange={(e) => set('monthlySalary', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salario no constitutivo</label>
            <input type="number" min="0" step="1000" value={form.nonConstitutiveSalary} onChange={(e) => set('nonConstitutiveSalary', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <p className="text-xs text-gray-400">
          Si el empleado ya tiene un contrato vigente, queda marcado como "Renovado" automáticamente al guardar este.
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </div>
    </Modal>
  )
}
