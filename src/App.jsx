import { Toaster } from 'sonner'
import Layout from './components/UI/Layout'
import { useNavigationStore } from './store/useNavigationStore'

import Dashboard from './pages/Dashboard'
import Proyectos from './pages/Proyectos'
import ProyectoDetalle from './pages/ProyectoDetalle'
import Reportes from './pages/Reportes'
import Tesoreria from './pages/contabilidad/Tesoreria'
import GBA from './pages/contabilidad/GBA'
import Contratistas from './pages/contabilidad/Contratistas'
import Equipo from './pages/rrhh/Equipo'
import EmpleadoDetalle from './pages/rrhh/EmpleadoDetalle'
import Nomina from './pages/rrhh/Nomina'
import Contratos from './pages/rrhh/Contratos'
import Horarios from './pages/rrhh/Horarios'
import Bitacoras from './pages/proyectos/Bitacoras'
import VisitasGlobal from './pages/proyectos/Visitas'
import ResumenGerencia from './pages/gerencia/ResumenGerencia'
import Publicidad from './pages/marketing/Publicidad'
import Redes from './pages/marketing/Redes'

const views = {
  dashboard: Dashboard,
  proyectos: Proyectos,
  'proyecto-detalle': ProyectoDetalle,
  reportes: Reportes,
  tesoreria: Tesoreria,
  gba: GBA,
  'resumen-gerencia': ResumenGerencia,
  contratistas: Contratistas,
  equipo: Equipo,
  'empleado-detalle': EmpleadoDetalle,
  nomina: Nomina,
  bitacoras: Bitacoras,
  visitas: VisitasGlobal,
  contratos: Contratos,
  horarios: Horarios,
  publicidad: Publicidad,
  redes: Redes,
}

export default function App() {
  const activeView = useNavigationStore((s) => s.activeView)
  const Page = views[activeView] || Dashboard

  return (
    <>
      <Toaster richColors position="top-right" />
      <Layout>
        <Page />
      </Layout>
    </>
  )
}
