import { ArrowLeft, FolderKanban, TrendingUp, TrendingDown, Users, DollarSign, FileText, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../components/UI/Button'
import FormProyecto from '../components/proyectos/FormProyecto'
import { useNavigationStore } from '../store/useNavigationStore'
import { useProyectosStore } from '../store/useProyectosStore'
import { getProyectoById, getProjectMetrics } from '../lib/dbProyectos'
import { getTransactions } from '../lib/dbTesoreria'
import { getTimelogsByProject } from '../lib/dbTimelogs'
import { getEmpleadoById } from '../lib/dbEmpleados'
import { fmtMoney, fmtDate } from '../lib/formatters'

function MetricCard({ label, value, icon: Icon, color, bgColor }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon size={18} className={color} />
        </div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

export default function ProyectoDetalle() {
  const { viewParam, setActiveView } = useNavigationStore()
  const { openModal, deleteProject } = useProyectosStore()
  const proyecto = getProyectoById(viewParam)

  if (!proyecto) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Proyecto no encontrado</p>
        <Button variant="ghost" onClick={() => setActiveView('proyectos')} className="mt-4">
          Volver a proyectos
        </Button>
      </div>
    )
  }

  const metrics = getProjectMetrics(proyecto.id)
  const transactions = getTransactions().filter((tx) => tx.projectId === proyecto.id)
  const timelogs = getTimelogsByProject(proyecto.id)

  const contractWithIva = proyecto.contractValue
    ? proyecto.contractValue * (1 + (proyecto.ivaPct || 0) / 100)
    : 0

  const handleDelete = () => {
    if (!window.confirm(`¿Eliminar el proyecto "${proyecto.name}"? Esta acción no se puede deshacer.`)) return
    deleteProject(proyecto.id)
    toast.success('Proyecto eliminado')
    setActiveView('proyectos')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('proyectos')}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </button>
          <FolderKanban size={24} className="text-indigo-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{proyecto.name}</h2>
            <p className="text-sm text-gray-500">
              {proyecto.client && `Cliente: ${proyecto.client} · `}
              {proyecto.serviceType && `${proyecto.serviceType} · `}
              {proyecto.status}
              {proyecto.startDate && ` · Inicio: ${fmtDate(proyecto.startDate)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openModal(proyecto)}>
            <Pencil size={14} />
            Editar
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 size={14} />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard
          label="Valor contrato"
          value={contractWithIva ? fmtMoney(contractWithIva) : '—'}
          icon={FileText}
          color="text-gray-700"
          bgColor="bg-gray-100"
        />
        <MetricCard
          label="Ingresos"
          value={fmtMoney(metrics.ingresos)}
          icon={TrendingUp}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <MetricCard
          label="Gastos"
          value={fmtMoney(metrics.gastos)}
          icon={TrendingDown}
          color="text-red-600"
          bgColor="bg-red-50"
        />
        <MetricCard
          label="Mano de obra"
          value={fmtMoney(metrics.costoManoObra)}
          icon={Users}
          color="text-orange-600"
          bgColor="bg-orange-50"
        />
        <MetricCard
          label="Rentabilidad"
          value={fmtMoney(metrics.rentabilidad)}
          icon={DollarSign}
          color={metrics.rentabilidad >= 0 ? 'text-green-700' : 'text-red-700'}
          bgColor={metrics.rentabilidad >= 0 ? 'bg-green-50' : 'bg-red-50'}
        />
      </div>

      {/* Notas */}
      {proyecto.notes && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Notas</h3>
          <p className="text-sm text-gray-600">{proyecto.notes}</p>
        </div>
      )}

      {/* Movimientos */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            Movimientos ({transactions.length})
          </h3>
        </div>
        {transactions.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">Sin movimientos asignados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2 font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-2 font-medium text-gray-600">Tipo</th>
                  <th className="px-4 py-2 font-medium text-gray-600">Cuenta</th>
                  <th className="px-4 py-2 font-medium text-gray-600">Categoría</th>
                  <th className="px-4 py-2 font-medium text-gray-600">Descripción</th>
                  <th className="px-4 py-2 font-medium text-gray-600 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{fmtDate(tx.date)}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          tx.type === 'ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {tx.type === 'ingreso' ? 'Ingreso' : 'Gasto'}
                        </span>
                      </td>
                      <td className="px-4 py-2 capitalize">{tx.account}</td>
                      <td className="px-4 py-2 text-gray-600">{tx.category}</td>
                      <td className="px-4 py-2 text-gray-600 max-w-[200px] truncate">{tx.description || '—'}</td>
                      <td className={`px-4 py-2 text-right font-medium ${
                        tx.type === 'ingreso' ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {tx.type === 'ingreso' ? '+' : '-'}{fmtMoney(tx.amount)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Horas registradas */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            Horas registradas ({metrics.totalHoras} días)
          </h3>
        </div>
        {timelogs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">Sin horas registradas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2 font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-2 font-medium text-gray-600">Empleado</th>
                  <th className="px-4 py-2 font-medium text-gray-600 text-right">Días</th>
                  <th className="px-4 py-2 font-medium text-gray-600 text-right">Costo</th>
                  <th className="px-4 py-2 font-medium text-gray-600">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {timelogs
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((log) => {
                    const emp = getEmpleadoById(log.employeeId)
                    const costo = emp ? log.days * ((emp.monthlyRate + (emp.nonConstitutiveSalary || 0)) / 23) : 0
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{fmtDate(log.date)}</td>
                        <td className="px-4 py-2 text-gray-700">{emp?.name || 'Desconocido'}</td>
                        <td className="px-4 py-2 text-right">{log.days}</td>
                        <td className="px-4 py-2 text-right text-orange-700 font-medium">{fmtMoney(costo)}</td>
                        <td className="px-4 py-2 text-gray-500">{log.note || '—'}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FormProyecto />
    </div>
  )
}
