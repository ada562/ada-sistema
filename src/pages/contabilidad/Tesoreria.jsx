import { useEffect, useState } from 'react'
import { Wallet, Plus, ClipboardCheck } from 'lucide-react'
import Button from '../../components/UI/Button'
import SaldoCards from '../../components/tesoreria/SaldoCards'
import FiltrosTesoreria from '../../components/tesoreria/FiltrosTesoreria'
import TablaMovimientos from '../../components/tesoreria/TablaMovimientos'
import FormMovimiento from '../../components/tesoreria/FormMovimiento'
import ArqueoCaja from '../../components/tesoreria/ArqueoCaja'
import { useTesoreriaStore } from '../../store/useTesoreriaStore'
import { useProyectosStore } from '../../store/useProyectosStore'

export default function Tesoreria() {
  const [arqueoOpen, setArqueoOpen] = useState(false)
  const openModal = useTesoreriaStore((s) => s.openModal)
  const fetchAll = useTesoreriaStore((s) => s.fetchAll)
  const initRealtime = useTesoreriaStore((s) => s.initRealtime)
  const teardownRealtime = useTesoreriaStore((s) => s.teardownRealtime)
  const fetchProyectos = useProyectosStore((s) => s.fetchAll)
  const initProyectosRealtime = useProyectosStore((s) => s.initRealtime)
  const teardownProyectosRealtime = useProyectosStore((s) => s.teardownRealtime)

  useEffect(() => {
    fetchAll()
    initRealtime()
    fetchProyectos()
    initProyectosRealtime()
    return () => {
      teardownRealtime()
      teardownProyectosRealtime()
    }
  }, [fetchAll, initRealtime, teardownRealtime, fetchProyectos, initProyectosRealtime, teardownProyectosRealtime])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wallet size={24} className="text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Tesorería</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setArqueoOpen(true)}>
            <ClipboardCheck size={18} />
            Arqueo de caja
          </Button>
          <Button onClick={() => openModal()}>
            <Plus size={18} />
            Nuevo movimiento
          </Button>
        </div>
      </div>

      <SaldoCards />
      <FiltrosTesoreria />
      <TablaMovimientos />
      <FormMovimiento />
      <ArqueoCaja open={arqueoOpen} onClose={() => setArqueoOpen(false)} />
    </div>
  )
}
