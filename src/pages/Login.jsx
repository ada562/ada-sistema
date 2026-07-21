import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { login } from '../lib/dbAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      // useAuthStore recibe el cambio de sesion via onAuthStateChange
    } catch {
      toast.error('Correo o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo-ada.png"
            alt="ADA"
            className="h-20 w-auto mx-auto mb-4"
            onError={(e) => {
              e.target.onerror = null
              e.target.src = '/logo-ada.svg'
            }}
          />
          <h1 className="text-2xl font-bold text-gray-900">ADA Gestión</h1>
          <p className="text-sm text-gray-500 mt-1">Arquitectura · Diseño · Acabados</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@adainteriors.co"
              autoFocus
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <span className="animate-pulse">Verificando...</span>
            ) : (
              <>
                <LogIn size={16} /> Ingresar
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          ADA Estudio © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
