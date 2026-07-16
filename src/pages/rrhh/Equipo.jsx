import { Users } from 'lucide-react'

export default function Equipo() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Users size={24} className="text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-900">Equipo</h2>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Módulo en construcción</p>
        <p className="text-xs text-gray-400 mt-2">Gestión de empleados y roles</p>
      </div>
    </div>
  )
}
