import { Clock } from 'lucide-react'

export default function Horarios() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Clock size={24} className="text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-900">Horarios</h2>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Módulo en construcción</p>
        <p className="text-xs text-gray-400 mt-2">Control de horarios y bitácora</p>
      </div>
    </div>
  )
}
