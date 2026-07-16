import { Megaphone } from 'lucide-react'

export default function Publicidad() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Megaphone size={24} className="text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-900">Publicidad</h2>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Módulo en construcción</p>
        <p className="text-xs text-gray-400 mt-2">Campañas y presupuesto publicitario</p>
      </div>
    </div>
  )
}
