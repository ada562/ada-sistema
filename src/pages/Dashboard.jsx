import { LayoutDashboard } from 'lucide-react'

export default function Dashboard() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <LayoutDashboard size={24} className="text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-900">Resumen General</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Empleados activos</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">9</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Proyectos activos</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">42</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Transacciones</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">129</p>
        </div>
      </div>
    </div>
  )
}
