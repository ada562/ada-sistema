import { useState, useEffect } from 'react'
import { Filter, X } from 'lucide-react'
import { useTesoreriaStore } from '../../store/useTesoreriaStore'
import { useProyectosStore } from '../../store/useProyectosStore'
import { getCategorias } from '../../lib/dbCategorias'

export default function FiltrosTesoreria() {
  const { filters, setFilter, resetFilters } = useTesoreriaStore()
  const [categorias, setCategorias] = useState({ ingreso: [], gasto: [] })
  const proyectos = useProyectosStore((s) => s.projects)

  useEffect(() => {
    getCategorias().then(setCategorias)
  }, [])

  const allCategorias = [...new Set([
    ...categorias.gasto,
    ...categorias.ingreso,
  ])].sort()

  const hasFilters = filters.tipo !== 'todos' ||
    filters.cuenta !== 'todas' ||
    filters.categoria !== 'todas' ||
    filters.proyecto !== 'todos' ||
    filters.fechaDesde ||
    filters.fechaHasta

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter size={16} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filtros</span>
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
          >
            <X size={14} /> Limpiar
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo</label>
          <select
            value={filters.tipo}
            onChange={(e) => setFilter('tipo', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="todos">Todos</option>
            <option value="ingreso">Ingreso</option>
            <option value="gasto">Gasto</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Cuenta</label>
          <select
            value={filters.cuenta}
            onChange={(e) => setFilter('cuenta', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="todas">Todas</option>
            <option value="banco">Banco</option>
            <option value="efectivo">Efectivo</option>
            <option value="nequi">Nequi</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Categoría</label>
          <select
            value={filters.categoria}
            onChange={(e) => setFilter('categoria', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="todas">Todas</option>
            {allCategorias.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Proyecto</label>
          <select
            value={filters.proyecto}
            onChange={(e) => setFilter('proyecto', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="todos">Todos</option>
            <option value="sin-proyecto">Sin proyecto</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            value={filters.fechaDesde}
            onChange={(e) => setFilter('fechaDesde', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            value={filters.fechaHasta}
            onChange={(e) => setFilter('fechaHasta', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  )
}
