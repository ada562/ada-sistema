import { useEffect, lazy, Suspense } from 'react'
import { Toaster } from 'sonner'
import Layout from './components/UI/Layout'
import Login from './pages/Login'
import SinAcceso from './components/UI/SinAcceso'
import { useNavigationStore } from './store/useNavigationStore'
import { useAuthStore } from './store/useAuthStore'
import { usePermisosStore } from './store/usePermisosStore'
import { usePermission } from './hooks/usePermission'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Proyectos = lazy(() => import('./pages/Proyectos'))
const ProyectoDetalle = lazy(() => import('./pages/ProyectoDetalle'))
const Reportes = lazy(() => import('./pages/Reportes'))
const Tesoreria = lazy(() => import('./pages/contabilidad/Tesoreria'))
const ArqueoCaja = lazy(() => import('./pages/contabilidad/ArqueoCaja'))
const GBA = lazy(() => import('./pages/contabilidad/GBA'))
const Contratistas = lazy(() => import('./pages/contabilidad/Contratistas'))
const Equipo = lazy(() => import('./pages/rrhh/Equipo'))
const EmpleadoDetalle = lazy(() => import('./pages/rrhh/EmpleadoDetalle'))
const Nomina = lazy(() => import('./pages/rrhh/Nomina'))
const Contratos = lazy(() => import('./pages/rrhh/Contratos'))
const Horarios = lazy(() => import('./pages/rrhh/Horarios'))
const Bitacoras = lazy(() => import('./pages/proyectos/Bitacoras'))
const VisitasGlobal = lazy(() => import('./pages/proyectos/Visitas'))
const MiBitacora = lazy(() => import('./pages/proyectos/MiBitacora'))
const ResumenGerencia = lazy(() => import('./pages/gerencia/ResumenGerencia'))
const Publicidad = lazy(() => import('./pages/marketing/Publicidad'))
const Redes = lazy(() => import('./pages/marketing/Redes'))

const views = {
  dashboard: Dashboard,
  proyectos: Proyectos,
  'proyecto-detalle': ProyectoDetalle,
  reportes: Reportes,
  tesoreria: Tesoreria,
  'arqueo-caja': ArqueoCaja,
  gba: GBA,
  'resumen-gerencia': ResumenGerencia,
  contratistas: Contratistas,
  equipo: Equipo,
  'empleado-detalle': EmpleadoDetalle,
  nomina: Nomina,
  bitacoras: Bitacoras,
  visitas: VisitasGlobal,
  'mi-bitacora': MiBitacora,
  contratos: Contratos,
  horarios: Horarios,
  publicidad: Publicidad,
  redes: Redes,
}

function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-48 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="h-24 bg-gray-200 rounded-lg" />
        <div className="h-24 bg-gray-200 rounded-lg" />
        <div className="h-24 bg-gray-200 rounded-lg" />
      </div>
    </div>
  )
}

function FullPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <PageSkeleton />
    </div>
  )
}

export default function App() {
  const session = useAuthStore((s) => s.session)
  const perfil = useAuthStore((s) => s.perfil)
  const loading = useAuthStore((s) => s.loading)
  const init = useAuthStore((s) => s.init)
  const logout = useAuthStore((s) => s.logout)
  const fetchPermisos = usePermisosStore((s) => s.fetchAll)
  const activeView = useNavigationStore((s) => s.activeView)
  const puedeVerVista = usePermission(activeView)
  const Page = views[activeView] || Dashboard

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (session) fetchPermisos()
  }, [session, fetchPermisos])

  if (loading) {
    return (
      <>
        <Toaster richColors position="top-right" />
        <FullPageSkeleton />
      </>
    )
  }

  if (!session) {
    return (
      <>
        <Toaster richColors position="top-right" />
        <Login />
      </>
    )
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      <Layout session={session} perfil={perfil} onLogout={logout}>
        <Suspense fallback={<PageSkeleton />}>
          {puedeVerVista ? <Page /> : <SinAcceso />}
        </Suspense>
      </Layout>
    </>
  )
}
