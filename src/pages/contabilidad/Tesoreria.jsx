import { Wallet, Plus } from 'lucide-react'
import Button from '../../components/UI/Button'
import SaldoCards from '../../components/tesoreria/SaldoCards'
import FiltrosTesoreria from '../../components/tesoreria/FiltrosTesoreria'
import TablaMovimientos from '../../components/tesoreria/TablaMovimientos'
import FormMovimiento from '../../components/tesoreria/FormMovimiento'
import { useTesoreriaStore } from '../../store/useTesoreriaStore'

export default function Tesoreria() {
  const openModal = useTesoreriaStore((s) => s.openModal)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wallet size={24} className="text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Tesorería</h2>
        </div>
        <Button onClick={() => openModal()}>
          <Plus size={18} />
          Nuevo movimiento
        </Button>
      </div>

      <SaldoCards />
      <FiltrosTesoreria />
      <TablaMovimientos />
      <FormMovimiento />
    </div>
  )
}
