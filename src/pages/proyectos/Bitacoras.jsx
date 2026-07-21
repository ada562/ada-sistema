import { useState, useEffect, useMemo } from 'react'
import { ClipboardList, Plus, Pencil, Trash2, Calendar, List } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/UI/Button'
import Modal from '../../components/UI/Modal'
import BitacoraSemanaGrid from '../../components/proyectos/BitacoraSemanaGrid'
import { useTimelogsStore } from '../../store/useTimelogsStore'
import { useProyectosStore } from '../../store/useProyectosStore'
import { useEmpleadosStore } from '../../store/useEmpleadosStore'
import { fmtDate, todayIso } from '../../lib/formatters'
import { useNavigationStore } from '../../store/useNavigationStore'

// Sentinel para filas de bitacora sin proyecto (proyecto_id NULL, migracion
// 014 -- fila "Otros" del calendario). Solo vive en el frontend, nunca se
// guarda en la base de datos.
const OTROS_VALUE = '__otros__'

export default function Bitacoras() {
  const [viewMode, setViewMode] = useState('calendario') // 'calendario' | 'historial'
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')
  const [formModal, setFormModal] = useState({ open: false, data: null })
  const { setActiveView } = useNavigationStore()

  const {
    timelogs: rawTimelogs,
    addTimelog,
    updateTimelog,
    deleteTimelog,
    fetchAll: fetchTimelogs,
    initRealtime: initTimelogsRealtime,
    teardownRealtime: teardownTimelogsRealtime,
  } = useTimelogsStore()

  const {
    projects: proyectos,
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
    fetchTimelogs()
    initTimelogsRealtime()
    fetchProyectos()
    initProyectosRealtime()
    fetchEmpleados()
    initEmpleadosRealtime()
    return () => {
      teardownTimelogsRealtime()
      teardownProyectosRealtime()
      teardownEmpleadosRealtime()
    }
  }, [
    fetchTimelogs, initTimelogsRealtime, teardownTimelogsRealtime,
    fetchProyectos, initProyectosRealtime, teardownProyectosRealtime,
    fetchEmpleados, initEmpleadosRealtime, teardownEmpleadosRealtime,
  ])

  const timelogs = [...rawTimelogs].sort((a, b) => b.date.localeCompare(a.date))
  const empleados = getEmpleadosActivos()
  const proyectosPorId = useMemo(() => new Map(proyectos.map((p) => [p.id, p])), [proyectos])

  useEffect(() => {
    if (!selectedEmployeeId && empleados.length > 0) setSelectedEmployeeId(empleados[0].id)
  }, [empleados, selectedEmployeeId])

  const filtered = timelogs.filter((t) => {
    if (filterProject === OTROS_VALUE) {
      if (t.projectId !== null) return false
    } else if (filterProject && t.projectId !== filterProject) {
      return false
    }
    if (filterEmployee && t.employeeId !== filterEmployee) return false
    return true
  })

  const totalDays = filtered.reduce((s, t) => s + t.days, 0)

  const handleDelete = async (t) => {
    if (!window.confirm('¿Eliminar este registro de bitácora?')) return
    try {
      await deleteTimelog(t.id)
      toast.success('Registro eliminado')
    } catch (err) {
      toast.error('Error al eliminar el registro: ' + err.message)
    }
  }

  const getProjectName = (id) => (id === null ? 'Otros' : proyectos.find((p) => p.id === id)?.name || '—')
  const getEmpName = (id) => getEmpleadoById(id)?.name || '—'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ClipboardList size={24} className="text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Bitácoras</h2>
          <span className="text-sm text-gray-400">({filtered.length} registros · {totalDays} días)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendario')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendario' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar size={14} /> Calendario
            </button>
            <button
              onClick={() => setViewMode('historial')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'historial' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List size={14} /> Historial
            </button>
          </div>
          <Button onClick={() => setFormModal({ open: true, data: null })}>
            <Plus size={16} /> Nuevo registro
          </Button>
        </div>
      </div>

      {viewMode === 'calendario' ? (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {empleados.length === 0 && <option value="">Sin empleados activos</option>}
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          {selectedEmployeeId ? (
            <BitacoraSemanaGrid
              employeeId={selectedEmployeeId}
              proyectosDisponibles={proyectos}
              proyectosPorId={proyectosPorId}
              timelogs={timelogs}
              addTimelog={addTimelog}
              updateTimelog={updateTimelog}
              deleteTimelog={deleteTimelog}
              lockPastWeeks={false}
            />
          ) : (
            <div className="text-center text-gray-400 py-8 text-sm">Selecciona un empleado para ver su calendario</div>
          )}
        </div>
      ) : (
        <>
          {/* Filtros */}
          <div className="flex items-center gap-3 mb-4">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Todos los proyectos</option>
              <option value={OTROS_VALUE}>Otros (sin proyecto)</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Todos los empleados</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            {(filterProject || filterEmployee) && (
              <button
                onClick={() => { setFilterProject(''); setFilterEmployee('') }}
                className="text-xs text-indigo-600 hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">Fecha</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Proyecto</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Empleado</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-center">Días</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Nota</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-center w-20">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin registros de bitácora</td>
                    </tr>
                  ) : (
                    filtered.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">{fmtDate(t.date)}</td>
                        <td className="px-4 py-3">
                          {t.projectId === null ? (
                            <span className="text-gray-500 font-medium">Otros</span>
                          ) : (
                            <button
                              onClick={() => setActiveView('proyecto-detalle', t.projectId)}
                              className="text-indigo-600 hover:underline font-medium"
                            >
                              {getProjectName(t.projectId)}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{getEmpName(t.employeeId)}</td>
                        <td className="px-4 py-3 text-center font-medium text-gray-900">{t.days}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs max-w-[250px] truncate">{t.note || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setFormModal({ open: true, data: t })}
                              className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(t)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      <FormBitacoraGlobal
        open={formModal.open}
        data={formModal.data}
        proyectos={proyectos}
        empleados={empleados}
        onClose={() => setFormModal({ open: false, data: null })}
        addTimelog={addTimelog}
        updateTimelog={updateTimelog}
      />
    </div>
  )
}

/* ─── Modal: Crear/Editar Bitácora ─── */

function FormBitacoraGlobal({ open, data, proyectos, empleados, onClose, addTimelog, updateTimelog }) {
  const [form, setForm] = useState({})
  const isEdit = !!data

  const resetForm = () => {
    setForm(data
      ? { projectId: data.projectId === null ? OTROS_VALUE : data.projectId, employeeId: data.employeeId, date: data.date, days: data.days, note: data.note }
      : { projectId: '', employeeId: '', date: todayIso(), days: 1, note: '' }
    )
  }

  if (open && !form.date && !isEdit) resetForm()
  if (open && isEdit && form._editId !== data?.id) {
    resetForm()
    setForm((f) => ({ ...f, _editId: data.id }))
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const isOtros = form.projectId === OTROS_VALUE

  const handleSave = async () => {
    if (!form.projectId) return toast.error('Selecciona un proyecto')
    if (isOtros && !form.note?.trim()) return toast.error('Describe qué hiciste — obligatorio para "Otros"')
    if (!form.employeeId) return toast.error('Selecciona un empleado')

    const payload = { ...form, projectId: isOtros ? null : form.projectId }

    try {
      if (isEdit) {
        await updateTimelog(data.id, payload)
        toast.success('Registro actualizado')
      } else {
        await addTimelog(payload)
        toast.success('Registro creado')
      }
      onClose()
      setForm({})
    } catch (err) {
      toast.error('Error al guardar el registro: ' + err.message)
    }
  }

  return (
    <Modal open={open} onClose={() => { onClose(); setForm({}) }} title={isEdit ? 'Editar registro' : 'Nuevo registro de bitácora'}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto *</label>
          <select value={form.projectId || ''} onChange={(e) => set('projectId', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
            <option value="">Seleccionar proyecto...</option>
            <option value={OTROS_VALUE}>Otros (sin proyecto)</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Empleado *</label>
          <select value={form.employeeId || ''} onChange={(e) => set('employeeId', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
            <option value="">Seleccionar empleado...</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Días</label>
            <input type="number" step="0.5" min="0.5" value={form.days || ''} onChange={(e) => set('days', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nota{isOtros && ' * — describe qué hiciste'}
          </label>
          <textarea value={form.note || ''} onChange={(e) => set('note', e.target.value)} rows={2}
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
