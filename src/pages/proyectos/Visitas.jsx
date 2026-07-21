import { useState, useEffect } from 'react'
import { MapPin, Plus, Pencil, Trash2, HardHat, Palette, Gift } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/UI/Button'
import Modal from '../../components/UI/Modal'
import { useVisitasStore } from '../../store/useVisitasStore'
import { useProyectosStore } from '../../store/useProyectosStore'
import { useEmpleadosStore } from '../../store/useEmpleadosStore'
import { fmtMoney, fmtDate, todayIso } from '../../lib/formatters'
import { useNavigationStore } from '../../store/useNavigationStore'
import { TEMA_OPTIONS, getTemaLabel } from '../../lib/visitaTemas'

const VISIT_TYPES = [
  { value: 'visita_obra', label: 'Visita a Obra', icon: HardHat, color: 'text-orange-600', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700' },
  { value: 'reunion_diseno', label: 'Reunión de Diseño', icon: Palette, color: 'text-indigo-600', bg: 'bg-indigo-50', badge: 'bg-indigo-100 text-indigo-700' },
  { value: 'obsequio', label: 'Obsequio', icon: Gift, color: 'text-pink-600', bg: 'bg-pink-50', badge: 'bg-pink-100 text-pink-700' },
]

function getTypeMeta(tipo) {
  return VISIT_TYPES.find((t) => t.value === tipo) || VISIT_TYPES[0]
}

export default function Visitas() {
  const [filterProject, setFilterProject] = useState('')
  const [filterType, setFilterType] = useState('')
  const [formModal, setFormModal] = useState({ open: false, data: null })
  const { setActiveView } = useNavigationStore()

  const {
    visitas: rawVisitas,
    addVisita,
    updateVisita,
    deleteVisita,
    fetchAll: fetchVisitas,
    initRealtime: initVisitasRealtime,
    teardownRealtime: teardownVisitasRealtime,
  } = useVisitasStore()

  const {
    projects: proyectos,
    getProyectoById,
    fetchAll: fetchProyectos,
    initRealtime: initProyectosRealtime,
    teardownRealtime: teardownProyectosRealtime,
  } = useProyectosStore()

  const {
    getEmpleadosActivos,
    getEmpleadoById,
    fetchAll: fetchEmpleados,
    initRealtime: initEmpleadosRealtime,
    teardownRealtime: teardownEmpleadosRealtime,
  } = useEmpleadosStore()

  useEffect(() => {
    fetchVisitas()
    initVisitasRealtime()
    fetchProyectos()
    initProyectosRealtime()
    fetchEmpleados()
    initEmpleadosRealtime()
    return () => {
      teardownVisitasRealtime()
      teardownProyectosRealtime()
      teardownEmpleadosRealtime()
    }
  }, [
    fetchVisitas, initVisitasRealtime, teardownVisitasRealtime,
    fetchProyectos, initProyectosRealtime, teardownProyectosRealtime,
    fetchEmpleados, initEmpleadosRealtime, teardownEmpleadosRealtime,
  ])

  const visitas = [...rawVisitas].sort((a, b) => b.date.localeCompare(a.date))
  const empleados = getEmpleadosActivos()

  const filtered = visitas.filter((v) => {
    if (filterProject && v.projectId !== filterProject) return false
    if (filterType && v.tipo !== filterType) return false
    return true
  })

  // Contadores por tipo
  const countByType = VISIT_TYPES.map((vt) => ({
    ...vt,
    count: visitas.filter((v) => v.tipo === vt.value).length,
  }))

  const handleDelete = async (v) => {
    if (!window.confirm('¿Eliminar esta visita?')) return
    try {
      await deleteVisita(v.id)
      toast.success('Visita eliminada')
    } catch (err) {
      toast.error('Error al eliminar la visita: ' + err.message)
    }
  }

  const getProjectName = (id) => proyectos.find((p) => p.id === id)?.name || '—'
  const getEmpName = (id) => getEmpleadoById(id)?.name || '—'

  // Paquete del proyecto seleccionado
  const selectedProject = filterProject ? getProyectoById(filterProject) : null
  const pkg = selectedProject?.visitPackage || null
  const projectVisitas = filterProject ? visitas.filter((v) => v.projectId === filterProject) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <MapPin size={24} className="text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Visitas</h2>
          <span className="text-sm text-gray-400">({filtered.length} registros)</span>
        </div>
        <Button onClick={() => setFormModal({ open: true, data: null })}>
          <Plus size={16} /> Nueva visita
        </Button>
      </div>

      {/* Resumen por tipo */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {countByType.map((vt) => {
          const Icon = vt.icon
          return (
            <button
              key={vt.value}
              onClick={() => setFilterType(filterType === vt.value ? '' : vt.value)}
              className={`border rounded-lg p-4 text-left transition-colors ${
                filterType === vt.value ? `${vt.bg} border-current ${vt.color}` : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className={vt.color} />
                <p className="text-xs text-gray-500 uppercase font-semibold">{vt.label}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{vt.count}</p>
            </button>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Todos los proyectos</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {(filterProject || filterType) && (
          <button onClick={() => { setFilterProject(''); setFilterType('') }} className="text-xs text-indigo-600 hover:underline">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Paquete incluido del proyecto seleccionado */}
      {pkg && (pkg.visita_obra > 0 || pkg.reunion_diseno > 0 || pkg.obsequio > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">Paquete incluido — {selectedProject.name}</p>
          <div className="grid grid-cols-3 gap-3">
            {VISIT_TYPES.map((vt) => {
              const included = pkg[vt.value] || 0
              if (included === 0) return null
              const used = projectVisitas.filter((v) => v.tipo === vt.value).length
              const extra = Math.max(used - included, 0)
              const Icon = vt.icon
              return (
                <div key={vt.value} className="bg-white rounded-lg border border-blue-100 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={14} className={vt.color} />
                    <span className="text-xs font-medium text-gray-700">{vt.label}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className={`text-lg font-bold ${used > included ? 'text-red-600' : 'text-green-700'}`}>{used}</span>
                      <span className="text-sm text-gray-400"> / {included}</span>
                    </div>
                    {extra > 0 && (
                      <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">+{extra} extra</span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-1.5 bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${used > included ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min((used / included) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="px-4 py-3 font-medium text-gray-600">Proyecto</th>
                <th className="px-4 py-3 font-medium text-gray-600">Tema</th>
                <th className="px-4 py-3 font-medium text-gray-600">Asistentes</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Valor</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center w-20">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin visitas registradas</td>
                </tr>
              ) : (
                filtered.map((v) => {
                  const meta = getTypeMeta(v.tipo)
                  const Icon = meta.icon
                  return (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{fmtDate(v.date)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.badge}`}>
                          <Icon size={11} /> {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setActiveView('proyecto-detalle', v.projectId)}
                          className="text-indigo-600 hover:underline font-medium"
                        >
                          {getProjectName(v.projectId)}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{getTemaLabel(v.topic, v.topicOther) || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {(v.attendeeIds || []).map((id) => getEmpName(id)).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {v.amount > 0 ? fmtMoney(v.amount) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setFormModal({ open: true, data: v })}
                            className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(v)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <FormVisitaGlobal
        open={formModal.open}
        data={formModal.data}
        proyectos={proyectos}
        empleados={empleados}
        visitas={visitas}
        getProyectoById={getProyectoById}
        onClose={() => setFormModal({ open: false, data: null })}
        addVisita={addVisita}
        updateVisita={updateVisita}
      />
    </div>
  )
}

/* ─── Modal: Crear/Editar Visita ─── */

function FormVisitaGlobal({ open, data, proyectos, empleados, visitas, getProyectoById, onClose, addVisita, updateVisita }) {
  const [form, setForm] = useState({})
  const isEdit = !!data

  const resetForm = () => {
    setForm(data
      ? { projectId: data.projectId, tipo: data.tipo || 'visita_obra', date: data.date, topic: data.topic, topicOther: data.topicOther || '', attendeeIds: data.attendeeIds || [], notes: data.notes, amount: data.amount, invoiced: data.invoiced }
      : { projectId: '', tipo: 'visita_obra', date: todayIso(), topic: '', topicOther: '', attendeeIds: [], notes: '', amount: '', invoiced: false }
    )
  }

  if (open && !form.date && !isEdit) resetForm()
  if (open && isEdit && form._editId !== data?.id) {
    resetForm()
    setForm((f) => ({ ...f, _editId: data.id }))
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const toggleAttendee = (empId) => {
    setForm((f) => ({
      ...f,
      attendeeIds: f.attendeeIds?.includes(empId)
        ? f.attendeeIds.filter((id) => id !== empId)
        : [...(f.attendeeIds || []), empId],
    }))
  }

  // Show package info for selected project
  const selectedProject = form.projectId ? getProyectoById(form.projectId) : null
  const pkg = selectedProject?.visitPackage || {}
  const included = pkg[form.tipo] || 0
  const allVisitas = form.projectId ? visitas.filter((v) => v.projectId === form.projectId && v.tipo === form.tipo) : []
  const used = allVisitas.length - (isEdit && data?.tipo === form.tipo ? 1 : 0) // don't count current if editing same type

  const handleSave = async () => {
    if (!form.projectId) return toast.error('Selecciona un proyecto')

    try {
      if (isEdit) {
        await updateVisita(data.id, form)
        toast.success('Visita actualizada')
      } else {
        await addVisita(form)
        toast.success('Visita registrada')
      }
      onClose()
      setForm({})
    } catch (err) {
      toast.error('Error al guardar la visita: ' + err.message)
    }
  }

  return (
    <Modal open={open} onClose={() => { onClose(); setForm({}) }} title={isEdit ? 'Editar visita' : 'Nueva visita'}>
      <div className="space-y-3">
        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de visita *</label>
          <div className="flex gap-2">
            {VISIT_TYPES.map((vt) => (
              <button
                key={vt.value}
                type="button"
                onClick={() => set('tipo', vt.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1 flex items-center justify-center gap-1.5 ${
                  form.tipo === vt.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <vt.icon size={14} /> {vt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Proyecto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto *</label>
          <select value={form.projectId || ''} onChange={(e) => set('projectId', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
            <option value="">Seleccionar proyecto...</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Package indicator */}
        {form.projectId && included > 0 && (
          <div className={`rounded-lg px-3 py-2 text-xs font-medium ${
            used >= included ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {used >= included
              ? `Ya usó ${used} de ${included} incluidas — esta visita será extra`
              : `${used} de ${included} incluidas usadas — quedan ${included - used}`
            }
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input type="date" value={form.date || ''} onChange={(e) => set('date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
            <input type="number" value={form.amount || ''} onChange={(e) => set('amount', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
          <select value={form.topic || ''} onChange={(e) => set('topic', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
            <option value="">Sin especificar</option>
            {TEMA_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {form.topic === 'otro' && (
            <input type="text" value={form.topicOther || ''} onChange={(e) => set('topicOther', e.target.value)}
              placeholder="Especifica el tema..."
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Asistentes</label>
          <div className="flex flex-wrap gap-1.5">
            {empleados.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => toggleAttendee(e.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  form.attendeeIds?.includes(e.id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {e.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => { onClose(); setForm({}) }}>Cancelar</Button>
          <Button onClick={handleSave}>{isEdit ? 'Guardar' : 'Registrar'}</Button>
        </div>
      </div>
    </Modal>
  )
}
