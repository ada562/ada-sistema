import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { departments, topLevelItems } from '../../data/departments'
import { useNavigationStore } from '../../store/useNavigationStore'

function TopLevelItem({ item }) {
  const { activeView, setActiveView } = useNavigationStore()
  const Icon = item.icon
  const isActive = activeView === item.id

  return (
    <button
      onClick={() => setActiveView(item.id)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-indigo-50 text-indigo-700'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <Icon size={18} />
      {item.label}
    </button>
  )
}

function DepartmentSection({ dept }) {
  const { activeView, setActiveView, expandedDepartments, toggleDepartment } =
    useNavigationStore()
  const isExpanded = expandedDepartments.includes(dept.id)
  const DeptIcon = dept.icon
  const hasActiveChild = dept.modules.some((m) => activeView === m.id)

  return (
    <div>
      <button
        onClick={() => toggleDepartment(dept.id)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
          hasActiveChild
            ? 'text-indigo-700'
            : 'text-gray-800 hover:bg-gray-100'
        }`}
      >
        <DeptIcon size={18} />
        <span className="flex-1 text-left">{dept.label}</span>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {isExpanded && (
        <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-gray-200 pl-3">
          {dept.modules.map((mod) => {
            const ModIcon = mod.icon
            const isActive = activeView === mod.id
            return (
              <button
                key={mod.id}
                onClick={() => setActiveView(mod.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <ModIcon size={16} />
                {mod.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { sidebarOpen, closeSidebar } = useNavigationStore()

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 flex flex-col transition-transform lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200">
          <div>
            <h1 className="text-lg font-bold text-gray-900">ADA Gestión</h1>
            <p className="text-xs text-gray-500">Arquitectura y Diseño</p>
          </div>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {topLevelItems.map((item) => (
            <TopLevelItem key={item.id} item={item} />
          ))}

          <div className="pt-3 pb-1 px-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Departamentos
            </p>
          </div>

          {departments.map((dept) => (
            <DepartmentSection key={dept.id} dept={dept} />
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-400">v0.1.0</p>
        </div>
      </aside>
    </>
  )
}
