import { useState, useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import {
  ClipboardList, ChevronLeft, ChevronRight, Plus, X, Check,
  Paperclip, Image as ImageIcon, Mic, Video, Download, Trash2, MessageSquarePlus,
} from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { useTareasStore } from '../../store/useTareasStore'
import { useTareaReportesStore } from '../../store/useTareaReportesStore'
import { useEmpleadosStore } from '../../store/useEmpleadosStore'
import { mondayOfLocal, addDaysLocal, toIsoLocal, DAY_LABELS } from '../../lib/dateWeek'
import { fmtDateTime } from '../../lib/formatters'
import Modal from '../../components/UI/Modal'
import Button from '../../components/UI/Button'

function startOfMonthLocal(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

// Paleta estilo Asana -- color asignado de forma deterministica por id de
// tarea (hash simple), asi cada tarea mantiene siempre el mismo color sin
// necesidad de guardar nada nuevo en la base de datos.
const PALETTE = [
  { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', dot: 'bg-rose-400' },
  { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', dot: 'bg-amber-400' },
  { bg: 'bg-lime-50', border: 'border-lime-300', text: 'text-lime-700', dot: 'bg-lime-500' },
  { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-700', dot: 'bg-teal-400' },
  { bg: 'bg-sky-50', border: 'border-sky-300', text: 'text-sky-700', dot: 'bg-sky-400' },
  { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', dot: 'bg-indigo-400' },
  { bg: 'bg-fuchsia-50', border: 'border-fuchsia-300', text: 'text-fuchsia-700', dot: 'bg-fuchsia-400' },
  { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', dot: 'bg-orange-400' },
]
function colorForTarea(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
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
    reportes,
    loading: loadingReportes,
    getByTarea,
    crear: crearReporte,
    eliminar: eliminarReporte,
    getUrl: getReporteUrl,
    fetchAll: fetchReportes,
    initRealtime: initReportesRealtime,
    teardownRealtime: teardownReportesRealtime,
  } = useTareaReportesStore()

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
    fetchReportes()
    initReportesRealtime()
    fetchEmpleados()
    initEmpleadosRealtime()
    return () => {
      teardownTareasRealtime()
      teardownReportesRealtime()
      teardownEmpleadosRealtime()
    }
  }, [
    fetchTareas, initTareasRealtime, teardownTareasRealtime,
    fetchReportes, initReportesRealtime, teardownReportesRealtime,
    fetchEmpleados, initEmpleadosRealtime, teardownEmpleadosRealtime,
  ])

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

  const [selectedTarea, setSelectedTarea] = useState(null)

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
            onOpenTarea={setSelectedTarea}
          />
        ) : (
          <div className="text-center text-gray-400 py-8 text-sm">Selecciona un empleado para ver su calendario</div>
        )}
      </div>

      {selectedTarea && (
        <DetalleTareaModal
          tarea={selectedTarea}
          onClose={() => setSelectedTarea(null)}
          reportes={getByTarea(selectedTarea.id)}
          loadingReportes={loadingReportes}
          crearReporte={crearReporte}
          eliminarReporte={eliminarReporte}
          getReporteUrl={getReporteUrl}
          puedeEscribir={!isAdminORrhh}
          empleadoId={employeeId}
        />
      )}
    </div>
  )
}

/* ─── Calendario mensual estilo Asana ─── */

function CalendarioMensual({ employeeId, tareas, loading, addTarea, toggleTarea, deleteTarea, onOpenTarea }) {
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
      <div className="flex items-center justify-center gap-3 mb-5">
        <button onClick={() => goToMonth(-1)} className="p-1.5 text-gray-400 hover:text-white hover:bg-indigo-500 rounded-lg transition-colors" aria-label="Mes anterior">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full px-4 py-1.5 capitalize min-w-[160px] text-center shadow-sm">
          {monthLabel}
        </span>
        <button onClick={() => goToMonth(1)} className="p-1.5 text-gray-400 hover:text-white hover:bg-indigo-500 rounded-lg transition-colors" aria-label="Mes siguiente">
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5 text-xs">
          {DAY_LABELS.map((d, i) => (
            <div
              key={d}
              className={`text-center font-semibold py-1.5 rounded-md hidden sm:block ${
                i >= 5 ? 'text-amber-600 bg-amber-50' : 'text-indigo-600 bg-indigo-50'
              }`}
            >
              {d.slice(0, 3)}
            </div>
          ))}
          {gridDays.map((d) => {
            const dateIso = toIsoLocal(d)
            const inMonth = d.getMonth() === monthCursor.getMonth()
            const isToday = dateIso === toIsoLocal(new Date())
            const items = tareasPorFecha.get(dateIso) || []
            return (
              <div
                key={dateIso}
                className={`min-h-[96px] border-2 rounded-xl p-1.5 flex flex-col gap-1 transition-shadow ${
                  inMonth ? 'bg-white border-gray-200 hover:shadow-md' : 'bg-gray-50 border-gray-100'
                } ${isToday ? 'ring-2 ring-indigo-400 border-indigo-300 bg-indigo-50/40 shadow-sm' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${isToday ? 'text-indigo-600' : inMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                    {d.getDate()}
                  </span>
                  <button
                    onClick={() => { setAddingDate(dateIso); setDraftTitulo('') }}
                    className="text-gray-300 hover:text-white hover:bg-indigo-500 rounded-full p-0.5 transition-colors"
                    title="Agregar tarea"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <div className="space-y-1 overflow-y-auto max-h-[74px]">
                  {items.map((t) => {
                    const c = colorForTarea(t.id)
                    return (
                      <div
                        key={t.id}
                        className={`group flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] leading-tight cursor-pointer ${
                          t.completada
                            ? 'bg-gray-50 border-gray-200 text-gray-400 line-through'
                            : `${c.bg} ${c.border} ${c.text}`
                        }`}
                        onClick={() => onOpenTarea(t)}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggle(t) }}
                          className="shrink-0"
                          title="Marcar completada"
                        >
                          {t.completada
                            ? <Check size={10} />
                            : <span className={`w-2.5 h-2.5 rounded-full block ${c.dot}`} />}
                        </button>
                        <span className="flex-1 break-words">{t.titulo}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(t) }}
                          className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    )
                  })}
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

/* ─── Detalle de tarea + reportes de avance (texto + imagen/audio/video) ─── */

const MAX_SIZE_BYTES = 25 * 1024 * 1024 // 25MB
const ACCEPTED = 'image/*,audio/*,video/*'

function tipoAdjuntoDeArchivo(file) {
  if (file.type.startsWith('image/')) return 'imagen'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('video/')) return 'video'
  return null
}

function fmtSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function IconoAdjunto({ tipo, size = 14 }) {
  if (tipo === 'imagen') return <ImageIcon size={size} />
  if (tipo === 'audio') return <Mic size={size} />
  if (tipo === 'video') return <Video size={size} />
  return <Paperclip size={size} />
}

function DetalleTareaModal({
  tarea, onClose, reportes, loadingReportes,
  crearReporte, eliminarReporte, getReporteUrl,
  puedeEscribir, empleadoId,
}) {
  const [descripcion, setDescripcion] = useState('')
  const [file, setFile] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const fileInputRef = useRef(null)

  const handlePickFile = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > MAX_SIZE_BYTES) {
      toast.error('El archivo supera el límite de 25MB')
      return
    }
    if (!tipoAdjuntoDeArchivo(f)) {
      toast.error('Solo se aceptan imágenes, audio o video')
      return
    }
    setFile(f)
  }

  const handleEnviar = async () => {
    if (!descripcion.trim() && !file) {
      toast.error('Escribe una descripción o adjunta un archivo')
      return
    }
    setEnviando(true)
    try {
      await crearReporte({
        tareaId: tarea.id,
        empleadoId,
        descripcion: descripcion.trim() || null,
        tipoAdjunto: file ? tipoAdjuntoDeArchivo(file) : null,
        file: file || null,
      })
      toast.success('Reporte agregado')
      setDescripcion('')
      setFile(null)
    } catch (err) {
      toast.error('No se pudo agregar el reporte: ' + err.message)
    } finally {
      setEnviando(false)
    }
  }

  const handleDelete = async (r) => {
    if (!window.confirm('¿Eliminar este reporte? Esta acción no se puede deshacer.')) return
    setDeletingId(r.id)
    try {
      await eliminarReporte(r.id, r.storagePath)
      toast.success('Reporte eliminado')
    } catch (err) {
      toast.error('No se pudo eliminar el reporte: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleView = async (r) => {
    try {
      const url = await getReporteUrl(r.storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error('No se pudo abrir el adjunto: ' + err.message)
    }
  }

  return (
    <Modal open onClose={onClose} title={tarea.titulo}>
      <div className="space-y-4">
        {puedeEscribir && (
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Contá cómo va el avance de esta tarea..."
              rows={2}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  <Paperclip size={13} /> Adjuntar foto/audio/video
                </button>
                <input ref={fileInputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handlePickFile} />
                {file && (
                  <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5">
                    <IconoAdjunto tipo={tipoAdjuntoDeArchivo(file)} size={11} />
                    {file.name}
                    <button onClick={() => setFile(null)} className="text-indigo-400 hover:text-indigo-700"><X size={11} /></button>
                  </span>
                )}
              </div>
              <Button size="sm" onClick={handleEnviar} disabled={enviando}>
                <MessageSquarePlus size={14} /> {enviando ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Reportes de avance</p>
          {loadingReportes ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : reportes.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">Sin reportes todavía.</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {reportes.map((r) => (
                <li key={r.id} className="bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {r.descripcion && <p className="text-sm text-gray-700 break-words">{r.descripcion}</p>}
                      {r.storagePath && (
                        <button
                          onClick={() => handleView(r)}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 mt-1"
                        >
                          <IconoAdjunto tipo={r.tipoAdjunto} size={12} />
                          {r.fileName} <span className="text-gray-400">({fmtSize(r.sizeBytes)})</span>
                          <Download size={11} />
                        </button>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">{fmtDateTime(r.createdAt)}</p>
                    </div>
                    {puedeEscribir && (
                      <button
                        onClick={() => handleDelete(r)}
                        disabled={deletingId === r.id}
                        className="shrink-0 p-1 text-gray-300 hover:text-red-500 disabled:opacity-50"
                        title="Eliminar reporte"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
