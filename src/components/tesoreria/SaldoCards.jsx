import { Landmark, Banknote, Smartphone } from 'lucide-react'
import { useTesoreriaStore } from '../../store/useTesoreriaStore'
import { fmtMoney } from '../../lib/formatters'

const cuentas = [
  { key: 'banco', label: 'Banco', icon: Landmark, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'efectivo', label: 'Efectivo', icon: Banknote, color: 'text-green-600', bg: 'bg-green-50' },
  { key: 'nequi', label: 'Nequi', icon: Smartphone, color: 'text-purple-600', bg: 'bg-purple-50' },
]

export default function SaldoCards() {
  const balances = useTesoreriaStore((s) => s.balances)

  const total = Object.values(balances).reduce((sum, v) => sum + v, 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cuentas.map(({ key, label, icon: Icon, color, bg }) => (
        <div key={key} className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${bg}`}>
              <Icon size={20} className={color} />
            </div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
          </div>
          <p className={`text-xl font-bold ${balances[key] >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {fmtMoney(balances[key])}
          </p>
        </div>
      ))}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-indigo-50">
            <Landmark size={20} className="text-indigo-600" />
          </div>
          <p className="text-sm font-medium text-gray-500">Total</p>
        </div>
        <p className={`text-xl font-bold ${total >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
          {fmtMoney(total)}
        </p>
      </div>
    </div>
  )
}
