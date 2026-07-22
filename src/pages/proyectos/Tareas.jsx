import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { ClipboardList, ChevronLeft, ChevronRight, Plus, X, Check } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { useTareasStore } from '../../store/useTareasStore'
import { useEmpleadosStore } from '../../store/useEmpleadosStore'
import { mondayOfLocal, addDaysLocal, toIsoLocal, DAY_LABELS } from '../../lib/dateWeek'

function startOfMonthLocal(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export default function Tareas() {
  const perfil = useAuthStore((s) => s.perfil)
  const isAdminORrhh = perfil?.rol === 'admin' || perfil?.rol === 'rrhh'

  const {
    tareas,
    loading: loadingTareas,
    addTarea,
    toggleTarea,
    deleteTarea,
    fetchAll: fetchTareas,
    initRealtime: initTareasRealtime,
    teardownRealtime: teardownTareasRealtime,
  } = useTareasStore()

  const {
    employees,
    getEmpleadosActivos,
    fetchAll: fetchEmpleados,
    initRealtime: initEmpleadosRealtime,
    teardownRealtime: teardownEmpleadosRealtime,
  } = useEmpleadosStore()

  useEffect(() => {
    fetchTareas()
    initTareasRealtime()
    fetchEmpleados()
    initEmpleadosRealtime()
    return () => {
      teardownTareasRealtime()
      teardownEmpleadosRealtime()
    }
  }, [fetchTareas, initTareasRealtime, teardownTareasRealtime, fetchEmpleados, initEmpleadosRealtime, teardownEmpleadosRealtime])

  // Empleado: siempre su propia agenda (RLS de 'tareas' ya solo devuelve su
  // fila de 'empleados'). Admin/rrhh: selector, igual que Bitacoras.jsx.
  const miEmpleado = !isAdminORrhh ? employees[0] || null : null
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const empleadosActivos = isAdminORrhh ? getEmpleadosActivos() : []

  useEffect(() => {
    if (isAdminORrhh && !selectedEmployeeId && empleadosActivos.length > 0) {
      setSelectedEmployeeId(empleadosActivos[0].id)
    }
  }, [isAdminORrhh, empleadosActivos, selectedEmployeeId])

  const employeeId = isAdminORrhh ? selectedEmployeeId : miEmpleado?.id || ''

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <ClipboardList size={24} className="text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-900">Tareas</h2>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {isAdminORrhh && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {empleadosActivos.length === 0 && <option value="">Sin empleados activos</option>}
              {empleadosActivos.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        )}
        {!isAdminORrhh && !miEmpleado ? (
          <div className="text-center text-gray-500 py-8 text-sm">
            No se encontró tu registro de empleado vinculado a esta cuenta. Contacta a RRHH.
          </div>
        ) : employeeId ? (
          <CalendarioMensual
            employeeId={employeeId}
            tareas={tareas}
            loading={loadingTareas}
            addTarea={addTarea}
            toggleTarea={toggleTarea}
            deleteTarea={deleteTarea}
          />
        ) : (
          <div className="text-center text-gray-400 py-8 text-sm">Selecciona un empleado para ver su calendario</div>
        )}
      </div>
    </div>
  )
}

/* ─── Calendario mensual estilo Asana ─── */

function CalendarioMensual({ employeeId, tareas, loading, addTarea, toggleTarea, deleteTarea }) {
  const [monthCursor, setMonthCursor] = useState(() => startOfMonthLocal(new Date()))
  const [addingDate, setAddingDate] = useState(null)
  const [draftTitulo, setDraftTitulo] = useState('')

  const gridStart = useMemo(() => mondayOfLocal(monthCursor), [monthCursor])
  const gridDays = useMemo(
    () => Array.from({ length: 42 }, (_, i) => addDaysLocal(gridStart, i)),
    [gridStart]
  )
  const monthLabel = monthCursor.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  const misTareas = useMemo(
    () => tareas.filter((t) => t.employeeId === employeeId),
    [tareas, employeeId]
  )
  const tareasPorFecha = useMemo(() => {
    const map = new Map()
    misTareas.forEach((t) => {
      if (!map.has(t.date)) map.set(t.date, [])
      map.get(t.date).push(t)
    })
    return map
  }, [misTareas])

  const goToMonth = (delta) => setMonthCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))

  const handleAdd = async (date) => {
    if (!draftTitulo.trim()) {
      setAddingDate(null)
      return
    }
    try {
      await addTarea({ employeeId, date, titulo: draftTitulo.trim() })
      toast.success('Tarea agregada')
    } catch (err) {
      toast.error('No se pudo agregar la tarea: ' + err.message)
    }
    setDraftTitulo('')
    setAddingDate(null)
  }

  const handleToggle = async (t) => {
    try {
      await toggleTarea(t.id, !t.completada)
    } catch (err) {
      toast.error('No se pudo actualizar la tarea: ' + err.message)
    }
  }

  const handleDelete = async (t) => {
    try {
      await deleteTarea(t.id)
    } catch (err) {
      toast.error('No se pudo eliminar la tarea: ' + err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-4">
        <button onClick={() => goToMonth(-1)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50" aria-label="Mes anterior">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-gray-900 capitalize min-w-[140px] text-center">{monthLabel}</span>
        <button onClick={() => goToMonth(1)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50" aria-label="Mes siguiente">
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5 text-xs">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center font-medium text-gray-500 py-1 hidden sm:block">{d.slice(0, 3)}</div>
          ))}
          {gridDays.map((d) => {
            const dateIso = toIsoLocal(d)
            const inMonth = d.getMonth() === monthCursor.getMonth()
            const isToday = dateIso === toIsoLocal(new Date())
            const items = tareasPorFecha.get(dateIso) || []
            return (
              <div
                key={dateIso}
                className={`min-h-[90px] border rounded-lg p-1.5 flex flex-col gap-1 ${
                  inMonth ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
                } ${isToday ? 'ring-2 ring-indigo-400' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${inMonth ? 'text-gray-700' : 'text-gray-300'}`}>{d.getDate()}</span>
                  <button
                    onClick={() => { setAddingDate(dateIso); setDraftTitulo('') }}
                    className="text-gray-300 hover:text-indigo-600"
                    title="Agregar tarea"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <div className="space-y-1 overflow-y-auto max-h-[70px]">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      className={`group flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] leading-tight ${
                        t.completada ? 'bg-green-50 text-green-700 line-through' : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      <button onClick={() => handleToggle(t)} className="shrink-0">
                        {t.completada ? <Check size={10} /> : <span className="w-2.5 h-2.5 border border-current rounded-sm block" />}
                      </button>
                      <span className="flex-1 break-words">{t.titulo}</span>
                      <button onClick={() => handleDelete(t)} className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                {addingDate === dateIso && (
                  <input
                    autoFocus
                    type="text"
                    value={draftTitulo}
                    onChange={(e) => setDraftTitulo(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(dateIso); if (e.key === 'Escape') setAddingDate(null) }}
                    onBlur={() => handleAdd(dateIso)}
                    placeholder="Nueva tarea..."
                    className="w-full text-[10px] border border-indigo-300 rounded px-1 py-0.5 focus:outline-none"
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
