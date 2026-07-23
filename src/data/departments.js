import {
  FolderKanban,
  Landmark,
  Wallet,
  Handshake,
  Users,
  BadgeDollarSign,
  FileText,
  Clock,
  Megaphone,
  Share2,
  ClipboardList,
  MapPin,
  BriefcaseBusiness,
  TrendingUp,
  ShieldCheck,
  NotebookPen,
  ClipboardCheck,
  CalendarDays,
  ClipboardX,
} from 'lucide-react'

export const topLevelItems = []

export const departments = [
  {
    id: 'gerencia',
    label: 'Gerencia',
    icon: BriefcaseBusiness,
    modules: [
      { id: 'resumen-gerencia', label: 'Resumen General', icon: TrendingUp },
      { id: 'bitacora-ceo', label: 'Bitácora CEO', icon: NotebookPen },
      { id: 'reportes', label: 'Reportes', icon: ShieldCheck },
    ],
  },
  {
    id: 'proyectos',
    label: 'Proyectos',
    icon: FolderKanban,
    modules: [
      { id: 'proyectos', label: 'Proyectos ADA', icon: FolderKanban },
      { id: 'bitacoras', label: 'Bitácoras', icon: ClipboardList },
      { id: 'visitas', label: 'Visitas', icon: MapPin },
      { id: 'mi-bitacora', label: 'Mi Bitácora', icon: NotebookPen },
      { id: 'tareas', label: 'Tareas', icon: CalendarDays },
    ],
  },
  {
    id: 'contabilidad',
    label: 'Contabilidad',
    icon: Landmark,
    modules: [
      { id: 'tesoreria', label: 'Tesorería', icon: Wallet },
      { id: 'arqueo-caja', label: 'Arqueo de Caja', icon: ClipboardCheck },
      { id: 'gba', label: 'GBA', icon: Handshake },
      { id: 'contratistas', label: 'Contratistas', icon: Handshake },
    ],
  },
  {
    id: 'rrhh',
    label: 'Gestión Humana',
    icon: Users,
    modules: [
      { id: 'equipo', label: 'Equipo', icon: Users },
      { id: 'nomina', label: 'Nómina', icon: BadgeDollarSign },
      { id: 'contratos', label: 'Contratos', icon: FileText },
      { id: 'horarios', label: 'Horarios', icon: Clock },
      { id: 'permisos', label: 'Permisos', icon: ClipboardX },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    modules: [
      { id: 'publicidad', label: 'Publicidad', icon: Megaphone },
      { id: 'redes', label: 'Redes', icon: Share2 },
    ],
  },
]
