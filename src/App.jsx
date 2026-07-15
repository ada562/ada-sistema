import { Toaster } from 'sonner'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster richColors position="top-right" />
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">
          ADA Gestión
        </h1>
        <p className="text-sm text-gray-500">
          Sistema de gestión — Firma de Arquitectura y Diseño de Interiores
        </p>
      </header>
      <main className="p-6">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-600">Proyecto inicializado correctamente.</p>
          <p className="text-sm text-gray-400 mt-2">
            Primer módulo: Tesorería
          </p>
        </div>
      </main>
    </div>
  )
}
