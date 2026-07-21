import { Menu } from 'lucide-react'
import { useNavigationStore } from '../../store/useNavigationStore'
import Sidebar from './Sidebar'

export default function Layout({ children, session, perfil, onLogout }) {
  const { toggleSidebar } = useNavigationStore()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar session={session} perfil={perfil} onLogout={onLogout} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button
            onClick={toggleSidebar}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">ADA Gestión</h1>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
