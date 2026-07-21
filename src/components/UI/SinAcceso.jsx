import { ShieldOff } from 'lucide-react'

export default function SinAcceso() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <ShieldOff className="text-gray-300 mb-4" size={48} />
      <h2 className="text-lg font-semibold text-gray-700">Sin acceso</h2>
      <p className="text-sm text-gray-400 mt-1">No tenés permiso para ver este módulo.</p>
    </div>
  )
}
