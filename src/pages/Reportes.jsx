import { useState, useEffect, useMemo } from 'react'
import { FileBarChart, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTimelogsStore } from '../store/useTimelogsStore'
import { useEmpleadosStore } from '../store/useEmpleadosStore'
import { useAccesoDiarioStore } from '../store/useAccesoDiarioStore'
import { mondayOfLocal, addDaysLocal, toIsoLocal, DAY_LABELS } from '../lib/dateWeek'
import { fmtDate } from '../lib/formatters'
import { PLANTILLAS_HORARIO } from '../lib/horarios'

const round2 = (n) => Math.round(n * 100) / 100

function fmtHora(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Compara la hora de llegada contra la plantilla de horario del dia (lunes=0
// ... sabado=5) -- domingo no tiene entrada asignada en ninguna plantilla.
function evaluarPuntualidad(horaLlegadaIso, tipoHorario, fecha) {
  if (!horaLlegadaIso) return null
  if (!tipoHorario || !PLANTILLAS_HORARIO[tipoHorario]) return null
  const dow = new Date(fecha + 'T00:00:00').getDay() // 0 domingo..6 sabado
  const idx = dow === 0 ? -1 : dow - 1 // Lunes=0..Sabado=5
  const plantilla = PLANTILLAS_HORARIO[tipoHorario][idx]
  if (!plantilla) return null
  const [h, m] = plantilla.entrada.split(':').map(Number)
  const llegada = new Date(horaLlegadaIso)
  const limite = new Date(llegada)
  limite.setHours(h, m, 0, 0)
  return llegada.getTime() <= limite.getTime() ? 'Puntual' : 'Tarde'
}

export default function Reportes() {
  const [weekCursor, setWeekCursor] = useState(() => mondayOfLocal(new Date()))

  const { getEmpleadosActivos, fetchAll: fetchEmpleados, initRealtime: initEmpleadosRealtime, teardownRealtime: teardownEmpleadosRealtime } = useEmpleadosStore()
  const {
    timelogs,
    fetchAll: fetchTimelogs,
    initRealtime: initTimelogsRealtime,
    teardownRealtime: teardownTimelogsRealtime,
  } = useTimelogsStore()
  const {
    accesos,
    loading: loadingAccesos,
    fetchAll: fetchAccesos,
    initRealtime: initAccesosRealtime,
    teardownRealtime: teardownAccesosRealtime,
  } = useAccesoDiarioStore()

  useEffect(() => {
    fetchEmpleados()
    initEmpleadosRealtime()
    fetchTimelogs()
    initTimelogsRealtime()
    fetchAccesos()
    initAccesosRealtime()
    return () => {
      teardownEmpleadosRealtime()
      teardownTimelogsRealtime()
      teardownAccesosRealtime()
    }
  }, [
    fetchEmpleados, initEmpleadosRealtime, teardownEmpleadosRealtime,
    fetchTimelogs, initTimelogsRealtime, teardownTimelogsRealtime,
    fetchAccesos, initAccesosRealtime, teardownAccesosRealtime,
  ])

  const empleados = getEmpleadosActivos()
  const weekStartIso = toIsoLocal(weekCursor)
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => toIsoLocal(addDaysLocal(weekCursor, i))),
    [weekCursor]
  )

  const filas = useMemo(
    () => empleados.map((e) => {
      const delEmpleado = timelogs.filter((t) => t.employeeId === e.id && weekDays.includes(t.date))
      const totalHoras = round2(delEmpleado.reduce((s, t) => s + (t.note === 'Festivo' ? 0 : t.days), 0))
      const accesosSemana = weekDays.map((date) => {
        const acceso = accesos.find((a) => a.employeeId === e.id && a.date === date)
        const estado = evaluarPuntualidad(acceso?.horaLlegada, e.tipoHorario, date)
        return { date, hora: acceso ? fmtHora(acceso.horaLlegada) : null, estado }
      })
      return { empleado: e, totalHoras, accesosSemana }
    }),
    [empleados, timelogs, accesos, weekDays]
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FileBarChart size={24} className="text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-900">Reportes</h2>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          <button onClick={() => setWeekCursor((c) => addDaysLocal(c, -7))} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50" aria-label="Semana anterior">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-gray-900">Semana del {fmtDate(weekStartIso)} al {fmtDate(weekDays[6])}</span>
          <button onClick={() => setWeekCursor((c) => addDaysLocal(c, 7))} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50" aria-label="Semana siguiente">
            <ChevronRight size={18} />
          </button>
        </div>

        {loadingAccesos ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2 font-medium text-gray-600 sticky left-0 bg-gray-50 min-w-[140px]">Empleado</th>
                  <th className="px-3 py-2 font-medium text-gray-600 text-center min-w-[80px]">Horas semana</th>
                  {DAY_LABELS.map((d, i) => (
                    <th key={d} className="px-2 py-2 font-medium text-gray-600 text-center min-w-[80px]">
                      {d.slice(0, 3)}<br />
                      <span className="font-normal text-[10px]">{fmtDate(weekDays[i])}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filas.length === 0 ? (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400">Sin empleados activos</td></tr>
                ) : (
                  filas.map(({ empleado, totalHoras, accesosSemana }) => (
                    <tr key={empleado.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-900 font-medium sticky left-0 bg-white">{empleado.name}</td>
                      <td className="px-3 py-2 text-center font-semibold text-gray-900">{totalHoras || '—'}</td>
                      {accesosSemana.map(({ date, hora, estado }) => (
                        <td key={date} className="px-2 py-2 text-center">
                          {hora ? (
                            <div className="flex flex-col items-center">
                              <span className="text-gray-700">{hora}</span>
                              {estado && (
                                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${
                                  estado === 'Puntual' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                                }`}>
                                  {estado}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
