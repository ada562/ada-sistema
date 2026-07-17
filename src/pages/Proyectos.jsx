import { useState } from 'react'
import { FolderKanban, Plus, Eye, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../components/UI/Button'
import FormProyecto from '../components/proyectos/FormProyecto'
import { useProyectosStore } from '../store/useProyectosStore'
import { useNavigationStore } from '../store/useNavigationStore'
import { fmtMoney } from '../lib/formatters'

const statusColors = {
  Activo: 'bg-green-100 text-green-700',
  Pausado: 'bg-yellow-100 text-yellow-700',
  Terminado: 'bg-gray-100 text-gray-600',
}

const statusOptions = [
  { value: 'todos', label: 'Todos' },
  { value: 'Activo', label: 'Activos' },
  { value: 'Pausado', label: 'Pausados' },
  { value: 'Terminado', label: 'Terminados' },
]

export default function Proyectos() {
  const setActiveView = useNavigationStore((s) => s.setActiveView)
  const { projects, openModal, deleteProject } = useProyectosStore()
  const [filtroEstado, setFiltroEstado] = useState('todos')

  const filtered = filtroEstado === 'todos'
    ? projects
    : projects.filter((p) => p.status === filtroEstado)

  const activos = projects.filter((p) => p.status === 'Activo').length
  const pausados = projects.filter((p) => p.status === 'Pausado').length
  const terminados = projects.filter((p) => p.status === 'Terminado').length

  const handleDelete = (p) => {
    if (!window.confirm(`¿Eliminar el proyecto "${p.name}"? Esta acción no se puede deshacer.`)) return
    deleteProject(p.id)
    toast.success('Proyecto eliminado')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FolderKanban size={24} className="text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Proyectos</h2>
        </div>
        <Button onClick={() => openModal()}>
          <Plus size={16} />
          Nuevo proyecto
        </Button>
      </div>

      {/* Filtros por estado */}
      <div className="flex items-center gap-2 mb-4">
        {statusOptions.map((opt) => {
          const count = opt.value === 'todos' ? projects.length
            : opt.value === 'Activo' ? activos
            : opt.value === 'Pausado' ? pausados
            : terminados
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

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Proyecto</th>
                <th className="px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Contrato</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Ingresos</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Gastos</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Rentabilidad</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.name}
                    {p.esDeGBA && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">GBA</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.client || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[p.status] || 'bg-gray-100 text-gray-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {p.contractValue ? fmtMoney(p.contractValue) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-green-700">
                    {p.metrics.ingresos > 0 ? fmtMoney(p.metrics.ingresos) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-red-700">
                    {p.metrics.gastos > 0 ? fmtMoney(p.metrics.gastos) : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${
                    p.metrics.rentabilidad >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {(p.metrics.ingresos > 0 || p.metrics.gastos > 0 || p.metrics.costoManoObra > 0)
                      ? fmtMoney(p.metrics.rentabilidad)
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setActiveView('proyecto-detalle', p.id)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                        title="Ver detalle"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => openModal(p)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No hay proyectos con estado "{filtroEstado}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FormProyecto />
    </div>
  )
}
