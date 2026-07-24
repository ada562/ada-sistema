import { useState, useEffect, useMemo } from 'react'
import { ClipboardList, Plus, Pencil, Trash2, Calendar, List, BarChart3, ChevronLeft, ChevronRight, Check, X as XIcon } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/UI/Button'
import Modal from '../../components/UI/Modal'
import BitacoraSemanaGrid from '../../components/proyectos/BitacoraSemanaGrid'
import { useTimelogsStore } from '../../store/useTimelogsStore'
import { useProyectosStore } from '../../store/useProyectosStore'
import { useEmpleadosStore } from '../../store/useEmpleadosStore'
import { useServiciosStore } from '../../store/useServiciosStore'
import { useAuthStore } from '../../store/useAuthStore'
import { fmtDate, fmtMoney, todayIso } from '../../lib/formatters'
import { mondayOfLocal, addDaysLocal, toIsoLocal } from '../../lib/dateWeek'
import { useNavigationStore } from '../../store/useNavigationStore'

// Sentinel para filtrar filas de bitacora sin proyecto (proyecto_id NULL).
// Ya no se puede crear una fila nueva "Otros" (se quito del calendario y del
// modal manual), pero registros historicos con projectId=null que no son
// "Permiso" (ver PERMISO_NOTE_REGEX) siguen existiendo en la base y deben
// poder filtrarse/mostrarse igual. Solo vive en el frontend.
const OTROS_VALUE = '__sin_proyecto__'
const PERMISO_NOTE_REGEX = /^\[Permiso:(Salud|Personal)\]/
const round2 = (n) => Math.round(n * 100) / 100
const isPermisoNote = (note) => typeof note === 'string' && PERMISO_NOTE_REGEX.test(note)

function labelSinProyecto(note) {
  const m = typeof note === 'string' ? note.match(PERMISO_NOTE_REGEX) : null
  if (m) return `Permiso (${m[1]})`
  return 'Otros (histórico)'
}

export default function Bitacoras() {
  const [viewMode, setViewMode] = useState('calendario') // 'calendario' | 'historial' | 'resumen'
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')
  const [formModal, setFormModal] = useState({ open: false, data: null })
  const [resumenWeekCursor, setResumenWeekCursor] = useState(() => mondayOfLocal(new Date()))
  const { setActiveView } = useNavigationStore()
  const perfil = useAuthStore((s) => s.perfil)
  const isAdmin = perfil?.rol === 'admin'

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

  const {
    servicios,
    fetchAll: fetchServicios,
    initRealtime: initServiciosRealtime,
    teardownRealtime: teardownServiciosRealtime,
  } = useServiciosStore()

  useEffect(() => {
    fetchTimelogs()
    initTimelogsRealtime()
    fetchProyectos()
    initProyectosRealtime()
    fetchEmpleados()
    initEmpleadosRealtime()
    fetchServicios()
    initServiciosRealtime()
    return () => {
      teardownTimelogsRealtime()
      teardownProyectosRealtime()
      teardownEmpleadosRealtime()
      teardownServiciosRealtime()
    }
  }, [
    fetchTimelogs, initTimelogsRealtime, teardownTimelogsRealtime,
    fetchProyectos, initProyectosRealtime, teardownProyectosRealtime,
    fetchEmpleados, initEmpleadosRealtime, teardownEmpleadosRealtime,
    fetchServicios, initServiciosRealtime, teardownServiciosRealtime,
  ])

  const timelogs = [...rawTimelogs].sort((a, b) => b.date.localeCompare(a.date))
  const empleados = getEmpleadosActivos()
  const proyectosPorId = useMemo(() => new Map(proyectos.map((p) => [p.id, p])), [proyectos])
  const serviciosPorId = useMemo(() => new Map(servicios.map((s) => [s.id, s])), [servicios])
  const serviciosPorProyecto = useMemo(() => {
    const map = new Map()
    servicios.forEach((s) => {
      if (!map.has(s.projectId)) map.set(s.projectId, [])
      map.get(s.projectId).push(s)
    })
    return map
  }, [servicios])

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
  const trabajadoresCount = new Set(filtered.filter((t) => !isPermisoNote(t.note)).map((t) => t.employeeId)).size
  const permisosCount = filtered.filter((t) => isPermisoNote(t.note)).length

  const handleDelete = async (t) => {
    if (!window.confirm('¿Eliminar este registro de bitácora?')) return
    try {
      await deleteTimelog(t.id)
      toast.success('Registro eliminado')
    } catch (err) {
      toast.error('Error al eliminar el registro: ' + err.message)
    }
  }

  const getProjectName = (id) => (id === null ? 'Sin proyecto' : proyectos.find((p) => p.id === id)?.name || '—')
  const getEmpName = (id) => getEmpleadoById(id)?.name || '—'
  const getServicioName = (id) => (id ? serviciosPorId.get(id)?.name || '—' : '—')

  // Resumen semanal -- quien registro bitacora esta semana + (solo admin)
  // cuanto gana cada uno. No usa BitacoraSemanaGrid (esa componente es por
  // un solo empleado); aca se agrega sobre todos los empleados activos a la
  // vez para la semana seleccionada con resumenWeekCursor.
  const resumenWeekStartIso = toIsoLocal(resumenWeekCursor)
  const resumenWeekDays = useMemo(
    () => Array.from({ length: 6 }, (_, i) => toIsoLocal(addDaysLocal(resumenWeekCursor, i))),
    [resumenWeekCursor]
  )
  const resumenPorEmpleado = useMemo(
    () => empleados.map((e) => {
      const delEmpleado = timelogs.filter((t) => t.employeeId === e.id && resumenWeekDays.includes(t.date))
      const totalDias = round2(delEmpleado.reduce((s, t) => s + (t.note === 'Festivo' ? 0 : t.days), 0))
      return { empleado: e, registro: delEmpleado.length > 0, totalDias }
    }),
    [empleados, timelogs, resumenWeekDays]
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ClipboardList size={24} className="text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Bitácoras</h2>
          <span className="text-sm text-gray-400">
            ({trabajadoresCount} trabajadores y {permisosCount} permisos · {totalDays} días)
          </span>
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
            <button
              onClick={() => setViewMode('resumen')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'resumen' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 size={14} /> Resumen
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
      ) : viewMode === 'resumen' ? (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => setResumenWeekCursor((c) => addDaysLocal(c, -7))}
              className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
              aria-label="Semana anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-gray-900">
              Semana del {fmtDate(resumenWeekStartIso)} al {fmtDate(resumenWeekDays[5])}
            </span>
            <button
              onClick={() => setResumenWeekCursor((c) => addDaysLocal(c, 7))}
              className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
              aria-label="Semana siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {!isAdmin && (
            <p className="text-xs text-gray-400 mb-3 text-center">
              El valor/tarifa de cada empleado solo es visible para administradores.
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2 font-medium text-gray-600">Empleado</th>
                  <th className="px-3 py-2 font-medium text-gray-600 text-center">¿Registró bitácora?</th>
                  <th className="px-3 py-2 font-medium text-gray-600 text-center">Días registrados</th>
                  {isAdmin && <th className="px-3 py-2 font-medium text-gray-600 text-right">Tarifa mensual</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resumenPorEmpleado.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 4 : 3} className="px-3 py-8 text-center text-gray-400">Sin empleados activos</td>
                  </tr>
                ) : (
                  resumenPorEmpleado.map(({ empleado, registro, totalDias }) => (
                    <tr key={empleado.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-900 font-medium">{empleado.name}</td>
                      <td className="px-3 py-2 text-center">
                        {registro ? (
                          <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
                            <Check size={12} /> Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium">
                            <XIcon size={12} /> No
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center font-medium text-gray-900">{totalDias || '—'}</td>
                      {isAdmin && (
                        <td className="px-3 py-2 text-right text-gray-700">
                          {empleado.monthlyRate ? fmtMoney(empleado.monthlyRate) : '—'}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
              <option value={OTROS_VALUE}>Sin proyecto (Otros / Permiso)</option>
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
                    <th className="px-4 py-3 font-medium text-gray-600">Servicio</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Empleado</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-center">Días</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Nota</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-center w-20">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin registros de bitácora</td>
                    </tr>
                  ) : (
                    filtered.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">{fmtDate(t.date)}</td>
                        <td className="px-4 py-3">
                          {t.projectId === null ? (
                            <span className="text-gray-500 font-medium">{labelSinProyecto(t.note)}</span>
                          ) : (
                            <button
                              onClick={() => setActiveView('proyecto-detalle', t.projectId)}
                              className="text-indigo-600 hover:underline font-medium"
                            >
                              {getProjectName(t.projectId)}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{getServicioName(t.serviceId)}</td>
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
        serviciosPorProyecto={serviciosPorProyecto}
        onClose={() => setFormModal({ open: false, data: null })}
        addTimelog={addTimelog}
        updateTimelog={updateTimelog}
      />
    </div>
  )
}

/* ─── Modal: Crear/Editar Bitácora ─── */

function FormBitacoraGlobal({ open, data, proyectos, empleados, serviciosPorProyecto, onClose, addTimelog, updateTimelog }) {
  const [form, setForm] = useState({})
  const isEdit = !!data

  const resetForm = () => {
    setForm(data
      ? { projectId: data.projectId, employeeId: data.employeeId, date: data.date, days: data.days, note: data.note, serviceId: data.serviceId || '' }
      : { projectId: '', employeeId: '', date: todayIso(), days: 1, note: '', serviceId: '' }
    )
  }

  const serviciosDisponibles = serviciosPorProyecto.get(form.projectId) || []

  if (open && !form.date && !isEdit) resetForm()
  if (open && isEdit && form._editId !== data?.id) {
    resetForm()
    setForm((f) => ({ ...f, _editId: data.id }))
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.projectId) return toast.error('Selecciona un proyecto')
    if (!form.employeeId) return toast.error('Selecciona un empleado')

    const payload = { ...form }

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
          <select value={form.projectId || ''} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, serviceId: '' }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
            <option value="">Seleccionar proyecto...</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {serviciosDisponibles.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Servicio</label>
            <select value={form.serviceId || ''} onChange={(e) => set('serviceId', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">Servicio general</option>
              {serviciosDisponibles.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Nota</label>
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
