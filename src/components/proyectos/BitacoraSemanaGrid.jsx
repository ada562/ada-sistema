import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../UI/Button'
import { fmtDate } from '../../lib/formatters'
import { mondayOfLocal, addDaysLocal, toIsoLocal, DAY_LABELS as ALL_DAY_LABELS } from '../../lib/dateWeek'
import { useServiciosStore } from '../../store/useServiciosStore'

// Bitacora no muestra Domingo (se pidio explicitamente quitarlo del
// calendario semanal) -- a diferencia de Reportes.jsx y Tareas.jsx, que
// siguen usando DAY_LABELS completo (7 dias) de dateWeek.js sin cambios.
const DAY_LABELS = ALL_DAY_LABELS.slice(0, 6)

// BitacoraSemanaGrid -- vista de calendario semanal (columnas = dias
// Lunes..Domingo, filas = proyectos) para un empleado especifico. La misma
// pieza se usa en MiBitacora.jsx (rol empleado, lockPastWeeks=true) y en
// Bitacoras.jsx (admin, lockPastWeeks=false, con selector de empleado por
// fuera) -- ambas leen/escriben exactamente los mismos registros de
// 'registro_horas' via el store compartido, por lo que quedan sincronizadas
// en vivo entre si sin logica adicional.
//
// "Festivo" es un flag por celda (proyecto+dia), no por dia completo: se
// persiste como una fila normal de registro_horas con dias=0, nota='Festivo'
// -- evita una migracion nueva (no existe columna/tabla de festivos) y
// respeta el modelo de datos actual (una fila = un dia+proyecto).
//
// "Reposición" (sabado/domingo trabajado que se compensa despues) reutiliza
// la misma convencion de "nota" que Festivo, pero con dias>0 -- es un tag
// sobre una celda con horas reales, no una celda vacia.
//
// "Permiso" (salud/personal) -- horas de un dia que NO se trabajaron por un
// permiso medico o una vuelta personal. Se persiste con proyecto_id=NULL +
// nota obligatoria (migracion 014 agrega el CHECK que lo exige). Se
// identifica en el frontend con el sentinel PERMISO_ID, traducido a
// projectId:null al leer/escribir -- nunca se guarda ese string. La nota se
// distingue por convencion de texto: "[Permiso:Salud] ..." /
// "[Permiso:Personal] ...". findEntry() filtra por ese prefijo (la fila fija
// "Otros" que existia antes con la misma convencion projectId=NULL sin ese
// prefijo fue eliminada del todo -- ver PROYECTO_CONTEXTO.md). Se muestra
// como un item mas ("Permisos") dentro de la misma tabla de proyectos -- ya
// no es una caja aparte -- para que el total de la semana quede unificado.
//
// "Servicio" (servicios_proyecto) -- dentro de un proyecto con servicios
// definidos (ej. FACHADAS, ACABADOS), las horas se pueden atribuir a un
// servicio especifico en vez de siempre al proyecto madre. La seleccion es
// por fila/proyecto (no por celda): se elige una vez y aplica a las horas
// que se registren esa semana para ese proyecto. Solo es informativo -- NO
// descuenta presupuesto ni valida contra ningun limite (eso queda para un
// modulo futuro de presupuesto).
const PERMISO_ID = '__permiso__'
const PERMISO_NOTE_REGEX = /^\[Permiso:(Salud|Personal)\]\s?(.*)$/
const isPermisoNote = (note) => typeof note === 'string' && PERMISO_NOTE_REGEX.test(note)
const parsePermisoNote = (note) => {
  const m = typeof note === 'string' ? note.match(PERMISO_NOTE_REGEX) : null
  return m ? { motivo: m[1], descripcion: m[2] || '' } : { motivo: 'Salud', descripcion: '' }
}
const buildPermisoNote = (motivo, descripcion) =>
  `[Permiso:${motivo}]${descripcion ? ' ' + descripcion : ''}`
const round2 = (n) => Math.round(n * 100) / 100

export default function BitacoraSemanaGrid({
  employeeId,
  proyectosDisponibles, // [{id, name, status}] -- Activo/undefined aparecen como fila automatica; el resto queda disponible en "Agregar proyecto"
  proyectosPorId,       // Map id -> {id, name} -- resuelve nombres de filas ya existentes
  timelogs,             // TODOS los timelogs ya cargados; se filtran por employeeId aqui
  addTimelog,
  updateTimelog,
  deleteTimelog,
  lockPastWeeks = true,
}) {
  const [weekCursor, setWeekCursor] = useState(() => mondayOfLocal(new Date()))
  const [addedProjectIds, setAddedProjectIds] = useState([])
  const [hiddenProjectIds, setHiddenProjectIds] = useState([])
  const [addProjectSelect, setAddProjectSelect] = useState('')
  const [drafts, setDrafts] = useState({}) // `${proyectoId}::${dateIso}` -> string en edicion
  const [rowServicio, setRowServicio] = useState({}) // proyectoId -> servicioId elegido para esta semana

  const servicios = useServiciosStore((s) => s.servicios)
  const fetchServicios = useServiciosStore((s) => s.fetchAll)
  useEffect(() => {
    fetchServicios()
  }, [fetchServicios])

  const serviciosPorProyecto = useMemo(() => {
    const map = new Map()
    servicios.forEach((s) => {
      if (!map.has(s.projectId)) map.set(s.projectId, [])
      map.get(s.projectId).push(s)
    })
    return map
  }, [servicios])

  const weekStartIso = toIsoLocal(weekCursor)
  const days = useMemo(
    () => Array.from({ length: 6 }, (_, i) => toIsoLocal(addDaysLocal(weekCursor, i))),
    [weekCursor]
  )
  const currentWeekStartIso = useMemo(() => toIsoLocal(mondayOfLocal(new Date())), [])
  const isPastWeek = weekStartIso < currentWeekStartIso
  const readOnly = lockPastWeeks && isPastWeek

  const misTimelogs = useMemo(
    () => timelogs.filter((t) => t.employeeId === employeeId),
    [timelogs, employeeId]
  )

  // Todos los proyectos de 'proyectosDisponibles' aparecen siempre como fila,
  // sin necesidad de "Agregar proyecto" -- se pidio explicitamente que la
  // bitacora semanal no dependa de que ya exista un registro esa semana, y
  // que se muestren TODOS los proyectos (no solo los Activos): cada pagina
  // que usa este componente decide su propio alcance (MiBitacora.jsx sigue
  // pre-filtrando a Activo antes de pasarlo, Bitacoras.jsx/BitacoraCeo.jsx
  // pasan la lista completa sin filtrar). Ademas se incluye cualquier
  // proyecto con horas ya registradas esa semana (por si no esta en
  // 'proyectosDisponibles') y los agregados manualmente.
  // hiddenProjectIds permite ocultar una fila vacia que no aplica esa semana
  // (el boton "Quitar fila vacia") sin afectar otras semanas ni el registro
  // de otros empleados.
  const rowProjectIds = useMemo(() => {
    const ids = new Set(proyectosDisponibles.map((p) => p.id))
    misTimelogs
      .filter((t) => days.includes(t.date) && t.projectId)
      .forEach((t) => ids.add(t.projectId))
    addedProjectIds.forEach((id) => ids.add(id))
    hiddenProjectIds.forEach((id) => ids.delete(id))
    return ids
  }, [proyectosDisponibles, misTimelogs, days, addedProjectIds, hiddenProjectIds])

  const rowProjects = [...rowProjectIds]
    .map((id) => proyectosPorId.get(id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))

  const proyectosParaAgregar = proyectosDisponibles.filter((p) => !rowProjectIds.has(p.id))

  const findEntry = (proyectoId, date) => {
    if (proyectoId === PERMISO_ID) {
      return misTimelogs.find((t) => t.projectId === null && t.date === date && isPermisoNote(t.note)) || null
    }
    return misTimelogs.find((t) => t.projectId === proyectoId && t.date === date) || null
  }

  const cellKey = (proyectoId, date) => `${proyectoId}::${date}`

  const getCellValue = (proyectoId, date) => {
    const key = cellKey(proyectoId, date)
    if (drafts[key] !== undefined) return drafts[key]
    const entry = findEntry(proyectoId, date)
    if (!entry || entry.note === 'Festivo') return ''
    return entry.days > 0 ? String(entry.days) : ''
  }

  const isFestivo = (proyectoId, date) => findEntry(proyectoId, date)?.note === 'Festivo'

  const getRowServicioValue = (proyectoId) => {
    if (rowServicio[proyectoId] !== undefined) return rowServicio[proyectoId]
    const withServicio = days.map((date) => findEntry(proyectoId, date)).find((e) => e?.serviceId)
    return withServicio?.serviceId || ''
  }

  const setDraftValue = (key, value) => setDrafts((d) => ({ ...d, [key]: value }))

  const handleDraftChange = (proyectoId, date, value) => {
    setDraftValue(cellKey(proyectoId, date), value)
  }

  const commitCell = async (proyectoId, date) => {
    const key = cellKey(proyectoId, date)
    const raw = drafts[key]
    if (raw === undefined) return
    setDrafts((d) => {
      const next = { ...d }
      delete next[key]
      return next
    })

    const value = raw.trim() === '' ? 0 : Number(raw.replace(',', '.'))
    if (raw.trim() !== '' && (Number.isNaN(value) || value < 0)) {
      toast.error('Ingresa un número de días válido')
      return
    }

    const entry = findEntry(proyectoId, date)
    const serviceId = getRowServicioValue(proyectoId) || null
    try {
      if (value <= 0) {
        if (entry) await deleteTimelog(entry.id)
        return
      }
      // Preserva el tag "Reposición" si ya estaba puesto -- solo cambia el
      // numero de dias, no debe perder la marca al editar horas.
      const preservedNote = entry?.note === 'Reposición' ? 'Reposición' : ''
      if (entry) {
        if (entry.days === value && entry.note === preservedNote && (entry.serviceId || null) === serviceId) return
        await updateTimelog(entry.id, { employeeId, projectId: proyectoId, date, days: value, note: preservedNote, serviceId })
      } else {
        await addTimelog({ employeeId, projectId: proyectoId, date, days: value, note: '', serviceId })
      }
      toast.success('Guardado')
    } catch (err) {
      toast.error('No se pudo guardar el registro: ' + err.message)
    }
  }

  const toggleFestivo = async (proyectoId, date) => {
    const entry = findEntry(proyectoId, date)
    const serviceId = getRowServicioValue(proyectoId) || null
    try {
      if (entry?.note === 'Festivo') {
        await deleteTimelog(entry.id)
        toast.success('Guardado')
        return
      }
      if (entry) {
        await updateTimelog(entry.id, { employeeId, projectId: proyectoId, date, days: 0, note: 'Festivo', serviceId })
      } else {
        await addTimelog({ employeeId, projectId: proyectoId, date, days: 0, note: 'Festivo', serviceId })
      }
      toast.success('Guardado')
    } catch (err) {
      toast.error('No se pudo marcar el festivo: ' + err.message)
    }
  }

  const isReposicion = (proyectoId, date) => findEntry(proyectoId, date)?.note === 'Reposición'

  const toggleReposicion = async (proyectoId, date) => {
    const entry = findEntry(proyectoId, date)
    if (!entry || entry.days <= 0) {
      toast.error('Ingresa los días trabajados antes de marcar reposición')
      return
    }
    try {
      const nextNote = entry.note === 'Reposición' ? '' : 'Reposición'
      await updateTimelog(entry.id, { employeeId, projectId: proyectoId, date, days: entry.days, note: nextNote, serviceId: entry.serviceId || null })
      toast.success('Guardado')
    } catch (err) {
      toast.error('No se pudo marcar la reposición: ' + err.message)
    }
  }

  // Bloque "Permiso" -- horas de dia (dias + texto se guardan juntos), con
  // un tercer campo (motivo Salud/Personal) que se codifica dentro de la
  // nota (ver buildPermisoNote/parsePermisoNote).
  const permisoMotivoKey = (date) => `${PERMISO_ID}::motivo::${date}`
  const permisoNoteKey = (date) => `${PERMISO_ID}::note::${date}`

  const getPermisoMotivoValue = (date) => {
    const key = permisoMotivoKey(date)
    if (drafts[key] !== undefined) return drafts[key]
    return parsePermisoNote(findEntry(PERMISO_ID, date)?.note).motivo
  }

  const getPermisoDescValue = (date) => {
    const key = permisoNoteKey(date)
    if (drafts[key] !== undefined) return drafts[key]
    return parsePermisoNote(findEntry(PERMISO_ID, date)?.note).descripcion
  }

  const commitPermisoCell = async (date) => {
    const daysKey = cellKey(PERMISO_ID, date)
    const motivoKey = permisoMotivoKey(date)
    const noteKey = permisoNoteKey(date)
    const rawDays = drafts[daysKey]
    const rawMotivo = drafts[motivoKey]
    const rawNote = drafts[noteKey]
    if (rawDays === undefined && rawMotivo === undefined && rawNote === undefined) return
    setDrafts((d) => {
      const next = { ...d }
      delete next[daysKey]
      delete next[motivoKey]
      delete next[noteKey]
      return next
    })

    const entry = findEntry(PERMISO_ID, date)
    const parsedPrev = parsePermisoNote(entry?.note)
    const daysValue = rawDays !== undefined
      ? (rawDays.trim() === '' ? 0 : Number(rawDays.replace(',', '.')))
      : (entry?.days || 0)
    const motivoValue = rawMotivo !== undefined ? rawMotivo : parsedPrev.motivo
    const descValue = (rawNote !== undefined ? rawNote : parsedPrev.descripcion).trim()

    if (rawDays !== undefined && rawDays.trim() !== '' && (Number.isNaN(daysValue) || daysValue < 0)) {
      toast.error('Ingresa un número de días válido')
      return
    }

    try {
      if (daysValue <= 0) {
        if (entry) await deleteTimelog(entry.id)
        return
      }
      const noteValue = buildPermisoNote(motivoValue, descValue)
      if (entry) {
        if (entry.days === daysValue && entry.note === noteValue) return
        await updateTimelog(entry.id, { employeeId, projectId: null, date, days: daysValue, note: noteValue })
      } else {
        await addTimelog({ employeeId, projectId: null, date, days: daysValue, note: noteValue })
      }
      toast.success('Guardado')
    } catch (err) {
      toast.error('No se pudo guardar el permiso: ' + err.message)
    }
  }

  const handleAddProject = () => {
    if (!addProjectSelect) return
    setAddedProjectIds((ids) => [...ids, addProjectSelect])
    setHiddenProjectIds((ids) => ids.filter((id) => id !== addProjectSelect))
    setAddProjectSelect('')
  }

  const handleRemoveEmptyRow = (proyectoId) => {
    const hasData = misTimelogs.some((t) => t.projectId === proyectoId && days.includes(t.date))
    if (hasData) return
    setAddedProjectIds((ids) => ids.filter((id) => id !== proyectoId))
    setHiddenProjectIds((ids) => [...ids, proyectoId])
  }

  const totalPorProyecto = (proyectoId) =>
    round2(days.reduce((sum, date) => {
      const entry = findEntry(proyectoId, date)
      return sum + (entry && entry.note !== 'Festivo' ? entry.days : 0)
    }, 0))

  const totalPorDia = (date) =>
    round2([...rowProjects, { id: PERMISO_ID }].reduce((sum, p) => {
      const entry = findEntry(p.id, date)
      return sum + (entry && entry.note !== 'Festivo' ? entry.days : 0)
    }, 0))

  const totalSemana = round2(days.reduce((s, date) => s + totalPorDia(date), 0))

  const goToWeek = (delta) => setWeekCursor((c) => addDaysLocal(c, delta * 7))

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToWeek(-1)}
            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-gray-900 text-center">
            Semana del {fmtDate(weekStartIso)} al {fmtDate(days[5])}
            {weekStartIso === currentWeekStartIso && (
              <span className="block text-[10px] font-semibold text-indigo-500 text-center">Semana actual</span>
            )}
          </span>
          <button
            onClick={() => goToWeek(1)}
            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
            aria-label="Semana siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={addProjectSelect}
            onChange={(e) => setAddProjectSelect(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Agregar proyecto...</option>
            {proyectosParaAgregar.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={handleAddProject} disabled={!addProjectSelect}>
            <Plus size={14} /> Agregar
          </Button>
        </div>
      </div>

      {readOnly && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          Esta semana ya cerró — solo lectura.
        </p>
      )}

      {rowProjects.length === 0 && (
        <p className="text-xs text-gray-400 mb-3">
          Sin proyectos esta semana — usa "Agregar proyecto" para empezar a registrar días.
        </p>
      )}
      <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2 font-medium text-gray-600 sticky left-0 bg-gray-50 min-w-[160px]">Proyecto</th>
                {days.map((date, i) => (
                  <th
                    key={date}
                    className={`px-2 py-2 font-medium text-center min-w-[90px] ${i >= 5 ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    {DAY_LABELS[i]}
                    <br />
                    <span className="font-normal text-[11px]">{fmtDate(date)}</span>
                  </th>
                ))}
                <th className="px-3 py-2 font-medium text-gray-600 text-center min-w-[80px]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rowProjects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-900 font-medium sticky left-0 bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span>{p.name}</span>
                        {(serviciosPorProyecto.get(p.id) || []).length > 0 && (
                          <select
                            value={getRowServicioValue(p.id)}
                            disabled={readOnly}
                            onChange={(e) => setRowServicio((r) => ({ ...r, [p.id]: e.target.value }))}
                            title="Servicio al que pertenecen estos días"
                            className={`text-[10px] border rounded px-1 py-0.5 focus:ring-1 focus:ring-indigo-400 ${
                              readOnly ? 'bg-gray-100 border-gray-200 text-gray-400' : 'border-gray-200 text-gray-500'
                            }`}
                          >
                            <option value="">Servicio general</option>
                            {serviciosPorProyecto.get(p.id).map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      {!misTimelogs.some((t) => t.projectId === p.id && days.includes(t.date)) && (
                        <button
                          onClick={() => handleRemoveEmptyRow(p.id)}
                          className="text-gray-300 hover:text-red-500 shrink-0"
                          title="Quitar fila vacía"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                  {days.map((date, i) => {
                    const festivo = isFestivo(p.id, date)
                    const reposicion = isReposicion(p.id, date)
                    const disabled = readOnly
                    return (
                      <td key={date} className="px-2 py-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={getCellValue(p.id, date)}
                            disabled={disabled || festivo}
                            onChange={(e) => handleDraftChange(p.id, date, e.target.value)}
                            onBlur={() => commitCell(p.id, date)}
                            className={`w-14 text-center border rounded-lg px-1 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                              disabled || festivo ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300'
                            }`}
                          />
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              disabled={disabled || reposicion}
                              onClick={() => toggleFestivo(p.id, date)}
                              title="Marcar día como festivo"
                              className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors ${
                                festivo
                                  ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                  : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                              } ${disabled || reposicion ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                              Festivo
                            </button>
                            {i >= 5 && (
                              <button
                                type="button"
                                disabled={disabled || festivo}
                                onClick={() => toggleReposicion(p.id, date)}
                                title="Marcar como día de reposición"
                                className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors ${
                                  reposicion
                                    ? 'bg-amber-100 border-amber-300 text-amber-700'
                                    : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                                } ${disabled || festivo ? 'opacity-40 cursor-not-allowed' : ''}`}
                              >
                                Repos.
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-center font-semibold text-gray-900">{totalPorProyecto(p.id) || '—'}</td>
                </tr>
              ))}
              <tr className="bg-amber-50/50 hover:bg-amber-50">
                <td className="px-3 py-2 text-gray-900 font-medium sticky left-0 bg-amber-50/50">
                  Permisos
                  <div className="text-[10px] font-normal text-gray-400">salud / personal</div>
                </td>
                {days.map((date, i) => (
                  <td
                    key={date}
                    className="px-2 py-2 text-center"
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) commitPermisoCell(date)
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Días"
                        value={getCellValue(PERMISO_ID, date)}
                        disabled={readOnly}
                        onChange={(e) => handleDraftChange(PERMISO_ID, date, e.target.value)}
                        className={`w-14 text-center border rounded-lg px-1 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                          readOnly ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300'
                        }`}
                      />
                      <select
                        value={getPermisoMotivoValue(date)}
                        disabled={readOnly}
                        onChange={(e) => setDraftValue(permisoMotivoKey(date), e.target.value)}
                        className={`w-14 border rounded px-0.5 py-0.5 text-[9px] focus:ring-1 focus:ring-indigo-500 ${
                          readOnly ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300'
                        }`}
                      >
                        <option value="Salud">Salud</option>
                        <option value="Personal">Personal</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Detalle"
                        title="Detalle (opcional)"
                        value={getPermisoDescValue(date)}
                        disabled={readOnly}
                        onChange={(e) => setDraftValue(permisoNoteKey(date), e.target.value)}
                        className={`w-14 text-center border rounded px-0.5 py-0.5 text-[9px] focus:ring-1 focus:ring-indigo-500 ${
                          readOnly ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300'
                        }`}
                      />
                    </div>
                  </td>
                ))}
                <td className="px-3 py-2 text-center font-semibold text-gray-900">{totalPorProyecto(PERMISO_ID) || '—'}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-gray-50">Total día</td>
                {days.map((date) => (
                  <td key={date} className="px-2 py-2 text-center font-semibold text-gray-700">
                    {totalPorDia(date) || '—'}
                  </td>
                ))}
                <td className="px-3 py-2 text-center font-semibold text-gray-900">{totalSemana || '—'}</td>
              </tr>
            </tfoot>
          </table>
      </div>
    </div>
  )
}
