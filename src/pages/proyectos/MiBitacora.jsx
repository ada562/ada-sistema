import { useState, useEffect, useMemo } from 'react'
import { NotebookPen, Plus, MapPin, HardHat, Palette, Gift } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/UI/Button'
import Modal from '../../components/UI/Modal'
import BitacoraSemanaGrid from '../../components/proyectos/BitacoraSemanaGrid'
import { useTimelogsStore } from '../../store/useTimelogsStore'
import { useVisitasStore } from '../../store/useVisitasStore'
import { useEmpleadosStore } from '../../store/useEmpleadosStore'
import { getProyectosDirectorio } from '../../lib/dbProyectos'
import { fmtDate, todayIso } from '../../lib/formatters'
import { TEMA_OPTIONS } from '../../lib/visitaTemas'
import { mondayOfLocal, addDaysLocal, toIsoLocal } from '../../lib/dateWeek'

const VISIT_TYPES = [
  { value: 'visita_obra', label: 'Visita a Obra', icon: HardHat },
  { value: 'reunion_diseno', label: 'Reunión de Diseño', icon: Palette },
  { value: 'obsequio', label: 'Obsequio', icon: Gift },
]

function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-48 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="h-24 bg-gray-200 rounded-lg" />
        <div className="h-24 bg-gray-200 rounded-lg" />
        <div className="h-24 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-64 bg-gray-200 rounded-lg" />
    </div>
  )
}

export default function MiBitacora() {
  const [visitaModalOpen, setVisitaModalOpen] = useState(false)

  const [proyectosDirectorio, setProyectosDirectorio] = useState([])
  const [loadingProyectos, setLoadingProyectos] = useState(true)

  const {
    timelogs,
    loading: loadingTimelogs,
    addTimelog,
    updateTimelog,
    deleteTimelog,
    fetchAll: fetchTimelogs,
    initRealtime: initTimelogsRealtime,
    teardownRealtime: teardownTimelogsRealtime,
  } = useTimelogsStore()

  const {
    visitas,
    loading: loadingVisitas,
    addVisita,
    fetchAll: fetchVisitas,
    initRealtime: initVisitasRealtime,
    teardownRealtime: teardownVisitasRealtime,
  } = useVisitasStore()

  const {
    employees,
    loading: loadingEmpleados,
    fetchAll: fetchEmpleados,
    initRealtime: initEmpleadosRealtime,
    teardownRealtime: teardownEmpleadosRealtime,
  } = useEmpleadosStore()

  useEffect(() => {
    fetchTimelogs()
    initTimelogsRealtime()
    fetchVisitas()
    initVisitasRealtime()
    fetchEmpleados()
    initEmpleadosRealtime()
    return () => {
      teardownTimelogsRealtime()
      teardownVisitasRealtime()
      teardownEmpleadosRealtime()
    }
  }, [
    fetchTimelogs, initTimelogsRealtime, teardownTimelogsRealtime,
    fetchVisitas, initVisitasRealtime, teardownVisitasRealtime,
    fetchEmpleados, initEmpleadosRealtime, teardownEmpleadosRealtime,
  ])

  useEffect(() => {
    let active = true
    setLoadingProyectos(true)
    getProyectosDirectorio()
      .then((data) => { if (active) setProyectosDirectorio(data) })
      .catch((err) => toast.error('No se pudieron cargar los proyectos: ' + err.message))
      .finally(() => { if (active) setLoadingProyectos(false) })
    return () => { active = false }
  }, [])

  // Yo -- gracias a la RLS de la migracion 013 (empleados_select_propio),
  // un usuario con rol 'empleado' solo puede leer su propia fila de
  // 'empleados' -- por eso employees[0] es siempre "mi" registro, sin
  // necesitar resolver el id manualmente en el frontend.
  const miEmpleado = employees[0] || null
  const miEmpleadoId = miEmpleado?.id || null

  const loading = loadingTimelogs || loadingVisitas || loadingEmpleados || loadingProyectos

  const currentWeekStart = useMemo(() => toIsoLocal(mondayOfLocal(new Date())), [])
  const currentWeekEnd = useMemo(() => toIsoLocal(addDaysLocal(mondayOfLocal(new Date()), 6)), [])

  const proyectosActivos = proyectosDirectorio.filter((p) => p.status === 'Activo')
  const proyectosPorId = new Map(proyectosDirectorio.map((p) => [p.id, p]))

  const misVisitas = visitas
    .filter((v) => v.date >= currentWeekStart && v.date <= currentWeekEnd)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (loading) return <PageSkeleton />

  if (!miEmpleadoId) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        No se encontró tu registro de empleado vinculado a esta cuenta. Contacta a RRHH.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <NotebookPen size={24} className="text-indigo-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Mi Bitácora</h2>
          <p className="text-sm text-gray-400">{miEmpleado.name}{miEmpleado.role ? ` · ${miEmpleado.role}` : ''}</p>
        </div>
      </div>

      {/* ─── Calendario semanal de horas ─── */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <BitacoraSemanaGrid
          employeeId={miEmpleadoId}
          proyectosDisponibles={proyectosActivos}
          proyectosPorId={proyectosPorId}
          timelogs={timelogs}
          addTimelog={addTimelog}
          updateTimelog={updateTimelog}
          deleteTimelog={deleteTimelog}
          lockPastWeeks
        />
        <p className="text-xs text-gray-400 mt-3">
          Las semanas anteriores a la actual quedan cerradas (solo lectura). Puedes registrar días de la semana en curso y de semanas futuras. Marca "Festivo" en un día sin necesidad de registrar días.
        </p>
      </div>

      {/* ─── Mis visitas de la semana actual ─── */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Mis visitas — semana actual</h3>
            <span className="text-xs text-gray-400">({fmtDate(currentWeekStart)} a {fmtDate(currentWeekEnd)})</span>
          </div>
          <Button size="sm" onClick={() => setVisitaModalOpen(true)}>
            <Plus size={14} /> Registrar visita
          </Button>
        </div>

        {misVisitas.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">Sin visitas registradas esta semana.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {misVisitas.map((v) => {
              const meta = VISIT_TYPES.find((t) => t.value === v.tipo) || VISIT_TYPES[0]
              const Icon = meta.icon
              const temaLabel = v.topic === 'otro' ? (v.topicOther || 'Otro') : TEMA_OPTIONS.find((t) => t.value === v.topic)?.label
              return (
                <div key={v.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                      <Icon size={11} /> {meta.label}
                    </span>
                    <span className="text-xs text-gray-400">{fmtDate(v.date)}</span>
                  </div>
                  <p className="text-sm text-gray-900 font-medium">{proyectosPorId.get(v.projectId)?.name || '—'}</p>
                  {temaLabel && <p className="text-xs text-gray-500">Tema: {temaLabel}</p>}
                  {v.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{v.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <FormMiVisita
        open={visitaModalOpen}
        onClose={() => setVisitaModalOpen(false)}
        proyectos={proyectosActivos}
        miEmpleadoId={miEmpleadoId}
        addVisita={addVisita}
        weekStart={currentWeekStart}
        weekEnd={currentWeekEnd}
      />
    </div>
  )
}

/* ─── Modal: Registrar visita (solo semana actual, solo yo como asistente
   -- la RLS de visita_asistentes para rol 'empleado' solo permite insertar
   la propia fila, asi que no se ofrece selector de otros asistentes) ─── */

function FormMiVisita({ open, onClose, proyectos, miEmpleadoId, addVisita, weekStart, weekEnd }) {
  const emptyForm = {
    projectId: '',
    tipo: 'visita_obra',
    date: todayIso() >= weekStart && todayIso() <= weekEnd ? todayIso() : weekStart,
    topic: '',
    topicOther: '',
    notes: '',
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (open) setForm(emptyForm)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.projectId) return toast.error('Selecciona un proyecto')
    if (form.date < weekStart || form.date > weekEnd) {
      return toast.error('La fecha debe estar dentro de la semana actual')
    }

    try {
      await addVisita({
        projectId: form.projectId,
        tipo: form.tipo,
        date: form.date,
        topic: form.topic,
        topicOther: form.topicOther,
        attendeeIds: [miEmpleadoId],
        notes: form.notes,
        amount: 0,
        invoiced: false,
      })
      toast.success('Visita registrada')
      onClose()
    } catch (err) {
      toast.error('Error al guardar la visita: ' + err.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar visita">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de visita *</label>
          <div className="flex gap-2">
            {VISIT_TYPES.map((vt) => (
              <button
                key={vt.value}
                type="button"
                onClick={() => set('tipo', vt.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1 flex items-center justify-center gap-1.5 ${
                  form.tipo === vt.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <vt.icon size={14} /> {vt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto *</label>
          <select
            value={form.projectId}
            onChange={(e) => set('projectId', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Seleccionar proyecto...</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha * (semana actual)</label>
          <input
            type="date"
            min={weekStart}
            max={weekEnd}
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
          <select
            value={form.topic}
            onChange={(e) => set('topic', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Sin especificar</option>
            {TEMA_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {form.topic === 'otro' && (
            <input
              type="text"
              value={form.topicOther}
              onChange={(e) => set('topicOther', e.target.value)}
              placeholder="Especifica el tema..."
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            placeholder="Descripción de la visita..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Registrar</Button>
        </div>
      </div>
    </Modal>
  )
}
