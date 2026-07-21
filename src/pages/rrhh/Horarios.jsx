import { useEffect, useState } from 'react'
import { Clock, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/UI/Button'
import Modal from '../../components/UI/Modal'
import { useEmpleadosStore } from '../../store/useEmpleadosStore'

const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']
const DIAS_ABREV = { Lunes: 'L', Martes: 'M', Miercoles: 'X', Jueves: 'J', Viernes: 'V', Sabado: 'S', Domingo: 'D' }

function formatHora(hhmm) {
  if (!hhmm) return '—'
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

export default function Horarios() {
  const [editModal, setEditModal] = useState({ open: false, empleado: null })

  const {
    getEmpleadosActivos,
    fetchAll,
    initRealtime,
    teardownRealtime,
    updateEmployee,
  } = useEmpleadosStore()

  useEffect(() => {
    fetchAll()
    initRealtime()
    return () => teardownRealtime()
  }, [fetchAll, initRealtime, teardownRealtime])

  const empleados = getEmpleadosActivos()

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Clock size={24} className="text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-900">Horarios</h2>
        <span className="text-sm text-gray-400">({empleados.length} empleados activos)</span>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Jornada laboral de referencia por empleado (entrada, salida y días laborales). No registra horas trabajadas — eso se lleva en Bitácora.
      </p>

      {empleados.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Sin empleados activos</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-2.5">Empleado</th>
                <th className="px-4 py-2.5">Entrada</th>
                <th className="px-4 py-2.5">Salida</th>
                <th className="px-4 py-2.5">Días laborales</th>
                <th className="px-4 py-2.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {empleados.map((emp) => (
                <tr key={emp.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-500">{emp.role || 'Sin cargo'}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatHora(emp.horarioEntrada)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatHora(emp.horarioSalida)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {DIAS.map((d) => (
                        <span
                          key={d}
                          title={d}
                          className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-medium ${
                            emp.diasLaborales?.includes(d) ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-300'
                          }`}
                        >
                          {DIAS_ABREV[d]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => setEditModal({ open: true, empleado: emp })}>
                      <Pencil size={14} /> Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormHorario
        open={editModal.open}
        empleado={editModal.empleado}
        onClose={() => setEditModal({ open: false, empleado: null })}
        updateEmployee={updateEmployee}
      />
    </div>
  )
}

/* ─── Modal: Editar jornada laboral de un empleado ─── */

function FormHorario({ open, empleado, onClose, updateEmployee }) {
  const [horarioEntrada, setHorarioEntrada] = useState('')
  const [horarioSalida, setHorarioSalida] = useState('')
  const [diasLaborales, setDiasLaborales] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && empleado) {
      setHorarioEntrada(empleado.horarioEntrada || '')
      setHorarioSalida(empleado.horarioSalida || '')
      setDiasLaborales(empleado.diasLaborales?.length ? empleado.diasLaborales : ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'])
    }
  }, [open, empleado])

  if (!open || !empleado) return null

  const toggleDia = (d) => {
    setDiasLaborales((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  const handleClose = () => onClose()

  const handleSave = async () => {
    if (horarioEntrada && horarioSalida && horarioEntrada >= horarioSalida) {
      return toast.error('La hora de salida debe ser posterior a la de entrada')
    }
    if (diasLaborales.length === 0) {
      return toast.error('Selecciona al menos un día laboral')
    }
    setSaving(true)
    try {
      await updateEmployee(empleado.id, { ...empleado, horarioEntrada, horarioSalida, diasLaborales })
      toast.success('Horario actualizado')
      handleClose()
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar el horario')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Jornada laboral — ${empleado.name}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora de entrada</label>
            <input type="time" value={horarioEntrada} onChange={(e) => setHorarioEntrada(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora de salida</label>
            <input type="time" value={horarioSalida} onChange={(e) => setHorarioSalida(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Días laborales</label>
          <div className="flex gap-2 flex-wrap">
            {DIAS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDia(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  diasLaborales.includes(d) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </div>
    </Modal>
  )
}
