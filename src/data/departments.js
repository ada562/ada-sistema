import {
  LayoutDashboard,
  FileBarChart,
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
} from 'lucide-react'

export const topLevelItems = [
  { id: 'dashboard', label: 'Resumen General', icon: LayoutDashboard },
  { id: 'proyectos', label: 'Proyectos', icon: FolderKanban },
  { id: 'reportes', label: 'Reportes y Permisos', icon: FileBarChart },
]

export const departments = [
  {
    id: 'contabilidad',
    label: 'Contabilidad',
    icon: Landmark,
    modules: [
      { id: 'tesoreria', label: 'Tesorería', icon: Wallet },
      { id: 'gba', label: 'GBA', icon: Handshake },
      { id: 'contratistas', label: 'Contratistas', icon: Handshake },
    ],
  },
  {
    id: 'rrhh',
    label: 'Recursos Humanos',
    icon: Users,
    modules: [
      { id: 'equipo', label: 'Equipo', icon: Users },
      { id: 'nomina', label: 'Nómina', icon: BadgeDollarSign },
      { id: 'contratos', label: 'Contratos', icon: FileText },
      { id: 'horarios', label: 'Horarios', icon: Clock },
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
