import { FileBarChart } from 'lucide-react'

export default function Reportes() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FileBarChart size={24} className="text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-900">Reportes y Permisos</h2>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Módulo en construcción</p>
      </div>
    </div>
  )
}
