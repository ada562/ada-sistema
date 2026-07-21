import { useState, useEffect } from 'react'
import { Users, Plus, Eye, Pencil, Trash2, Phone, AlertTriangle, Cake, FileWarning } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/UI/Button'
import FormEmpleado from '../../components/equipo/FormEmpleado'
import { useEmpleadosStore } from '../../store/useEmpleadosStore'
import { useDocumentosStore } from '../../store/useDocumentosStore'
import { useNavigationStore } from '../../store/useNavigationStore'
import { getAge, getUpcomingBirthdays, getExpiringContracts } from '../../lib/dbEmpleados'
import { fmtDate } from '../../lib/formatters'

const statusColors = {
  Activo: 'bg-green-100 text-green-700',
  Vacaciones: 'bg-blue-100 text-blue-700',
  Incapacidad: 'bg-yellow-100 text-yellow-700',
  Retirado: 'bg-gray-100 text-gray-500',
}

const statusOptions = [
  { value: 'todos', label: 'Todos' },
  { value: 'Activo', label: 'Activos' },
  { value: 'Vacaciones', label: 'Vacaciones' },
  { value: 'Incapacidad', label: 'Incapacidad' },
  { value: 'Retirado', label: 'Retirados' },
]

export default function Equipo() {
  const setActiveView = useNavigationStore((s) => s.setActiveView)
  const { employees, openModal, deleteEmployee, fetchAll, initRealtime, teardownRealtime } = useEmpleadosStore()
  const {
    getByEmpleado,
    fetchAll: fetchDocumentos,
    initRealtime: initDocumentosRealtime,
    teardownRealtime: teardownDocumentosRealtime,
  } = useDocumentosStore()
  const [filtroEstado, setFiltroEstado] = useState('Activo')

  useEffect(() => {
    fetchAll()
    initRealtime()
    fetchDocumentos()
    initDocumentosRealtime()
    return () => {
      teardownRealtime()
      teardownDocumentosRealtime()
    }
  }, [fetchAll, initRealtime, teardownRealtime, fetchDocumentos, initDocumentosRealtime, teardownDocumentosRealtime])

  const filtered = filtroEstado === 'todos'
    ? employees
    : employees.filter((e) => e.status === filtroEstado)

  const birthdays = getUpcomingBirthdays(employees)
  const expiringContracts = getExpiringContracts(employees)

  const handleDelete = async (e) => {
    if (!window.confirm(`¿Eliminar a "${e.name}"?`)) return
    try {
      await deleteEmployee(e.id)
      toast.success('Empleado eliminado')
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el empleado')
    }
  }

  const countByStatus = (s) => employees.filter((e) => e.status === s).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Equipo</h2>
          <span className="text-sm text-gray-500">{employees.length} personas</span>
        </div>
        <Button onClick={() => openModal()}>
          <Plus size={16} />
          Nuevo empleado
        </Button>
      </div>

      {/* Alertas */}
      {(birthdays.length > 0 || expiringContracts.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {birthdays.length > 0 && (
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Cake size={16} className="text-pink-600" />
                <p className="text-xs font-semibold text-pink-700 uppercase">Próximos cumpleaños</p>
              </div>
              <div className="space-y-1">
                {birthdays.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{e.name}</span>
                    <span className="text-xs text-pink-600 font-medium">
                      {e.daysUntil === 0 ? '¡Hoy!' : e.daysUntil === 1 ? 'Mañana' : `En ${e.daysUntil} días`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {expiringContracts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileWarning size={16} className="text-amber-600" />
                <p className="text-xs font-semibold text-amber-700 uppercase">Contratos por vencer (30 días)</p>
              </div>
              <div className="space-y-1">
                {expiringContracts.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{e.name}</span>
                    <span className="text-xs text-amber-600 font-medium">{fmtDate(e.contractUntil)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4">
        {statusOptions.map((opt) => {
          const count = opt.value === 'todos' ? employees.length : countByStatus(opt.value)
          return (
            <button
              key={opt.value}
              onClick={() => setFiltroEstado(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filtroEstado === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Directorio de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((emp) => {
          const age = getAge(emp.birthDate)
          const empDocs = getByEmpleado(emp.id)
          const pendingDocs = [
            !empDocs.some((d) => d.tipo === 'cedula') && 'Cédula',
            !empDocs.some((d) => d.tipo === 'hoja_vida') && 'HV',
            !empDocs.some((d) => d.tipo === 'contrato') && 'Contrato',
            !empDocs.some((d) => d.tipo === 'certificados') && 'Cert.',
          ].filter(Boolean)

          return (
            <div key={emp.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-200 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    {emp.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 leading-tight">{emp.name}</h4>
                    <p className="text-xs text-gray-500">{emp.role || '—'}</p>
                  </div>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[emp.status] || 'bg-gray-100 text-gray-600'}`}>
                  {emp.status}
                </span>
              </div>

              <div className="space-y-1 text-xs text-gray-500 mb-3">
                {emp.department && <p>Área: {emp.department}</p>}
                {emp.phone && (
                  <p className="flex items-center gap-1">
                    <Phone size={11} /> {emp.phone}
                  </p>
                )}
                {emp.email && <p>{emp.email}</p>}
                {age !== null && <p>Edad: {age} años</p>}
                {emp.contractUntil && (
                  <p className={emp.contractUntil <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) ? 'text-amber-600 font-medium' : ''}>
                    Contrato hasta: {fmtDate(emp.contractUntil)}
                  </p>
                )}
              </div>

              {/* Docs pendientes */}
              {pendingDocs.length > 0 && pendingDocs.length < 4 && (
                <div className="flex items-center gap-1 mb-3">
                  <AlertTriangle size={12} className="text-amber-500" />
                  <span className="text-xs text-amber-600">Faltan: {pendingDocs.join(', ')}</span>
                </div>
              )}

              {/* Emergency contact quick access */}
              {emp.emergencyName && (
                <div className="text-xs bg-red-50 rounded p-2 mb-3">
                  <span className="font-medium text-red-700">Emergencia:</span>{' '}
                  <span className="text-red-600">{emp.emergencyName} ({emp.emergencyRelation}) {emp.emergencyPhone}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
                <button
                  onClick={() => setActiveView('empleado-detalle', emp.id)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                  title="Ver detalle"
                >
                  <Eye size={15} />
                </button>
                <button
                  onClick={() => openModal(emp)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                  title="Editar"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(emp)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  title="Eliminar"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-full bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-400">No hay empleados con estado "{filtroEstado}"</p>
          </div>
        )}
      </div>

      <FormEmpleado />
    </div>
  )
}
