import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../UI/Button'
import { fmtDate } from '../../lib/formatters'
import { mondayOfLocal, addDaysLocal, toIsoLocal, DAY_LABELS } from '../../lib/dateWeek'

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
// "Otros" es una fila fija (no removible) para horas sin proyecto asociado
// (trabajo interno/administrativo) -- se persiste con proyecto_id=NULL y
// nota=<descripcion obligatoria> (migracion 014 agrega el CHECK que lo
// exige). Se identifica en el frontend con el sentinel OTROS_ID, traducido
// a projectId:null al leer/escribir -- nunca se guarda ese string.
//
// "Reposición" (sabado/domingo trabajado que se compensa despues) reutiliza
// la misma convencion de "nota" que Festivo, pero con dias>0 -- es un tag
// sobre una celda con horas reales, no una celda vacia.
const OTROS_ID = '__otros__'
const round2 = (n) => Math.round(n * 100) / 100

export default function BitacoraSemanaGrid({
  employeeId,
  proyectosDisponibles, // [{id, name, status}] -- opciones para "Agregar proyecto"
  proyectosPorId,       // Map id -> {id, name} -- resuelve nombres de filas ya existentes
  timelogs,             // TODOS los timelogs ya cargados; se filtran por employeeId aqui
  addTimelog,
  updateTimelog,
  deleteTimelog,
  lockPastWeeks = true,
}) {
  const [weekCursor, setWeekCursor] = useState(() => mondayOfLocal(new Date()))
  const [addedProjectIds, setAddedProjectIds] = useState([])
  const [addProjectSelect, setAddProjectSelect] = useState('')
  const [drafts, setDrafts] = useState({}) // `${proyectoId}::${dateIso}` -> string en edicion

  const weekStartIso = toIsoLocal(weekCursor)
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => toIsoLocal(addDaysLocal(weekCursor, i))),
    [weekCursor]
  )
  const currentWeekStartIso = useMemo(() => toIsoLocal(mondayOfLocal(new Date())), [])
  const isPastWeek = weekStartIso < currentWeekStartIso
  const readOnly = lockPastWeeks && isPastWeek

  const misTimelogs = useMemo(
    () => timelogs.filter((t) => t.employeeId === employeeId),
    [timelogs, employeeId]
  )

  const rowProjectIds = useMemo(() => {
    const ids = new Set(
      misTimelogs.filter((t) => days.includes(t.date)).map((t) => t.projectId)
    )
    addedProjectIds.forEach((id) => ids.add(id))
    return ids
  }, [misTimelogs, days, addedProjectIds])

  const rowProjects = [...rowProjectIds]
    .map((id) => proyectosPorId.get(id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))

  const proyectosParaAgregar = proyectosDisponibles.filter(
    (p) => !rowProjectIds.has(p.id) && (p.status === 'Activo' || p.status === undefined)
  )

  const findEntry = (proyectoId, date) =>
    misTimelogs.find((t) => t.projectId === (proyectoId === OTROS_ID ? null : proyectoId) && t.date === date) || null

  const cellKey = (proyectoId, date) => `${proyectoId}::${date}`

  const getCellValue = (proyectoId, date) => {
    const key = cellKey(proyectoId, date)
    if (drafts[key] !== undefined) return drafts[key]
    const entry = findEntry(proyectoId, date)
    if (!entry || entry.note === 'Festivo') return ''
    return entry.days > 0 ? String(entry.days) : ''
  }

  const isFestivo = (proyectoId, date) => findEntry(proyectoId, date)?.note === 'Festivo'

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
    try {
      if (value <= 0) {
        if (entry) await deleteTimelog(entry.id)
        return
      }
      // Preserva el tag "Reposición" si ya estaba puesto -- solo cambia el
      // numero de dias, no debe perder la marca al editar horas.
      const preservedNote = entry?.note === 'Reposición' ? 'Reposición' : ''
      if (entry) {
        if (entry.days === value && entry.note === preservedNote) return
        await updateTimelog(entry.id, { employeeId, projectId: proyectoId, date, days: value, note: preservedNote })
      } else {
        await addTimelog({ employeeId, projectId: proyectoId, date, days: value, note: '' })
      }
      toast.success('Guardado')
    } catch (err) {
      toast.error('No se pudo guardar el registro: ' + err.message)
    }
  }

  const toggleFestivo = async (proyectoId, date) => {
    const entry = findEntry(proyectoId, date)
    try {
      if (entry?.note === 'Festivo') {
        await deleteTimelog(entry.id)
        toast.success('Guardado')
        return
      }
      if (entry) {
        await updateTimelog(entry.id, { employeeId, projectId: proyectoId, date, days: 0, note: 'Festivo' })
      } else {
        await addTimelog({ employeeId, projectId: proyectoId, date, days: 0, note: 'Festivo' })
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
      toast.error('Ingresa las horas trabajadas antes de marcar reposición')
      return
    }
    try {
      const nextNote = entry.note === 'Reposición' ? '' : 'Reposición'
      await updateTimelog(entry.id, { employeeId, projectId: proyectoId, date, days: entry.days, note: nextNote })
      toast.success('Guardado')
    } catch (err) {
      toast.error('No se pudo marcar la reposición: ' + err.message)
    }
  }

  // Fila "Otros" -- misma idea de commitCell pero con dos campos por celda
  // (dias + descripcion), guardados juntos porque el CHECK de la migracion
  // 014 exige nota no vacia cuando proyecto_id es NULL.
  const otrosNoteKey = (date) => `${OTROS_ID}::note::${date}`

  const getOtrosDescValue = (date) => {
    const key = otrosNoteKey(date)
    if (drafts[key] !== undefined) return drafts[key]
    return findEntry(OTROS_ID, date)?.note || ''
  }

  const commitOtrosCell = async (date) => {
    const daysKey = cellKey(OTROS_ID, date)
    const noteKey = otrosNoteKey(date)
    const rawDays = drafts[daysKey]
    const rawNote = drafts[noteKey]
    if (rawDays === undefined && rawNote === undefined) return
    setDrafts((d) => {
      const next = { ...d }
      delete next[daysKey]
      delete next[noteKey]
      return next
    })

    const entry = findEntry(OTROS_ID, date)
    const daysValue = rawDays !== undefined
      ? (rawDays.trim() === '' ? 0 : Number(rawDays.replace(',', '.')))
      : (entry?.days || 0)
    const noteValue = (rawNote !== undefined ? rawNote : entry?.note || '').trim()

    if (rawDays !== undefined && rawDays.trim() !== '' && (Number.isNaN(daysValue) || daysValue < 0)) {
      toast.error('Ingresa un número de días válido')
      return
    }

    try {
      if (daysValue <= 0) {
        if (entry) await deleteTimelog(entry.id)
        return
      }
      if (!noteValue) {
        toast.error('Describe qué hiciste para guardar el registro de "Otros"')
        return
      }
      if (entry) {
        if (entry.days === daysValue && entry.note === noteValue) return
        await updateTimelog(entry.id, { employeeId, projectId: null, date, days: daysValue, note: noteValue })
      } else {
        await addTimelog({ employeeId, projectId: null, date, days: daysValue, note: noteValue })
      }
      toast.success('Guardado')
    } catch (err) {
      toast.error('No se pudo guardar el registro: ' + err.message)
    }
  }

  const handleAddProject = () => {
    if (!addProjectSelect) return
    setAddedProjectIds((ids) => [...ids, addProjectSelect])
    setAddProjectSelect('')
  }

  const handleRemoveEmptyRow = (proyectoId) => {
    const hasData = misTimelogs.some((t) => t.projectId === proyectoId && days.includes(t.date))
    if (hasData) return
    setAddedProjectIds((ids) => ids.filter((id) => id !== proyectoId))
  }

  const totalPorProyecto = (proyectoId) =>
    round2(days.reduce((sum, date) => {
      const entry = findEntry(proyectoId, date)
      return sum + (entry && entry.note !== 'Festivo' ? entry.days : 0)
    }, 0))

  const totalPorDia = (date) =>
    round2([...rowProjects, { id: OTROS_ID }].reduce((sum, p) => {
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
            Semana del {fmtDate(weekStartIso)} al {fmtDate(days[6])}
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
          Sin proyectos esta semana — usa "Agregar proyecto", o registra horas en la fila "Otros".
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
                      <span>{p.name}</span>
                      {!misTimelogs.some((t) => t.projectId === p.id && days.includes(t.date)) && (
                        <button
                          onClick={() => handleRemoveEmptyRow(p.id)}
                          className="text-gray-300 hover:text-red-500"
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

              {/* Fila fija "Otros" -- horas sin proyecto, requiere descripcion (migracion 014) */}
              <tr className="bg-indigo-50/40 hover:bg-indigo-50">
                <td className="px-3 py-2 text-gray-900 font-medium sticky left-0 bg-indigo-50/40">
                  Otros
                  <span className="block text-[10px] font-normal text-gray-400">sin proyecto</span>
                </td>
                {days.map((date) => {
                  const disabled = readOnly
                  return (
                    <td key={date} className="px-2 py-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={getCellValue(OTROS_ID, date)}
                          disabled={disabled}
                          onChange={(e) => handleDraftChange(OTROS_ID, date, e.target.value)}
                          onBlur={() => commitOtrosCell(date)}
                          className={`w-14 text-center border rounded-lg px-1 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                            disabled ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300'
                          }`}
                        />
                        <input
                          type="text"
                          placeholder="¿Qué hiciste?"
                          value={getOtrosDescValue(date)}
                          disabled={disabled}
                          onChange={(e) => setDraftValue(otrosNoteKey(date), e.target.value)}
                          onBlur={() => commitOtrosCell(date)}
                          className={`w-20 text-center border rounded-lg px-1 py-0.5 text-[10px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                            disabled ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300'
                          }`}
                        />
                      </div>
                    </td>
                  )
                })}
                <td className="px-3 py-2 text-center font-semibold text-gray-900">{totalPorProyecto(OTROS_ID) || '—'}</td>
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
