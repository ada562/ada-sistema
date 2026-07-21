import { useEffect } from 'react'
import { Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useEmpleadosStore } from '../../store/useEmpleadosStore'
import { TIPOS_HORARIO, PLANTILLAS_HORARIO } from '../../lib/horarios'

export default function Horarios() {
  const {
    getEmpleadosActivos,
    fetchAll,
    initRealtime,
    teardownRealtime,
    updateEmployee,
  } = useEmpleadosStore()

  useEffect(() => {
    fetchAll()
    initRealtime()
    return () => teardownRealtime()
  }, [fetchAll, initRealtime, teardownRealtime])

  const empleados = getEmpleadosActivos()

  const handleAsignar = async (emp, tipoHorario) => {
    try {
      await updateEmployee(emp.id, { ...emp, tipoHorario })
      toast.success(`${emp.name} asignado a ${tipoHorario}`)
    } catch (err) {
      toast.error(err.message || 'No se pudo asignar el horario')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Clock size={24} className="text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-900">Horarios</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Jornada laboral vigente por equipo (según comunicado interno). Asigna a cada colaborador el horario que le corresponde.
      </p>

      {/* Jornadas de referencia */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {TIPOS_HORARIO.map((tipo) => (
          <div key={tipo} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-indigo-50 border-b border-indigo-100">
              <p className="text-sm font-semibold text-indigo-700">{tipo}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-2">Día</th>
                  <th className="px-4 py-2">Ingreso</th>
                  <th className="px-4 py-2">Almuerzo</th>
                  <th className="px-4 py-2">Salida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {PLANTILLAS_HORARIO[tipo].map((row) => (
                  <tr key={row.dia}>
                    <td className="px-4 py-2 text-gray-900 font-medium">{row.dia}</td>
                    <td className="px-4 py-2 text-gray-700">{row.entrada}</td>
                    <td className="px-4 py-2 text-gray-500">{row.almuerzo || '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{row.salida}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Asignacion por empleado */}
      {empleados.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Sin empleados activos</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-2.5">Empleado</th>
                <th className="px-4 py-2.5">Horario asignado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {empleados.map((emp) => (
                <tr key={emp.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-500">{emp.role || 'Sin cargo'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={emp.tipoHorario || ''}
                      onChange={(e) => handleAsignar(emp, e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Sin asignar</option>
                      {TIPOS_HORARIO.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
