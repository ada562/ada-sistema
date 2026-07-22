import { useEffect, useMemo } from 'react'
import { NotebookPen } from 'lucide-react'
import BitacoraSemanaGrid from '../../components/proyectos/BitacoraSemanaGrid'
import { useTimelogsStore } from '../../store/useTimelogsStore'
import { useProyectosStore } from '../../store/useProyectosStore'

// Bitacora CEO -- registro de horas de Alejandra Duran Agudelo (CEO), llevado
// desde este tab de Gerencia en lugar de un portal de autoservicio (ella no
// requiere cuenta de portal). Reusa el mismo componente/tabla registro_horas
// que Bitacoras.jsx (admin) y MiBitacora.jsx (empleado) -- mismo store,
// misma sincronizacion en vivo -- solo cambia el employeeId, que aca queda
// fijo (no hay selector de empleado).
const ALEJANDRA_CEO_ID = 'cd1d2411-e5dc-43d7-bfd2-1fc9ca9c31dc'

export default function BitacoraCeo() {
  const {
    timelogs,
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

  useEffect(() => {
    fetchTimelogs()
    initTimelogsRealtime()
    fetchProyectos()
    initProyectosRealtime()
    return () => {
      teardownTimelogsRealtime()
      teardownProyectosRealtime()
    }
  }, [
    fetchTimelogs, initTimelogsRealtime, teardownTimelogsRealtime,
    fetchProyectos, initProyectosRealtime, teardownProyectosRealtime,
  ])

  const proyectosPorId = useMemo(() => new Map(proyectos.map((p) => [p.id, p])), [proyectos])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <NotebookPen size={24} className="text-indigo-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Bitácora CEO</h2>
          <p className="text-sm text-gray-400">Alejandra Duran Agudelo · CEO</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <BitacoraSemanaGrid
          employeeId={ALEJANDRA_CEO_ID}
          proyectosDisponibles={proyectos}
          proyectosPorId={proyectosPorId}
          timelogs={timelogs}
          addTimelog={addTimelog}
          updateTimelog={updateTimelog}
          deleteTimelog={deleteTimelog}
          lockPastWeeks={false}
        />
      </div>
    </div>
  )
}
