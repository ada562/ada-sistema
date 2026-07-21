import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ClipboardCheck, Printer } from 'lucide-react'
import Button from '../../components/UI/Button'
import ReciboArqueoCaja from '../../components/tesoreria/ReciboArqueoCaja'
import { getArqueos, registrarArqueo, DENOMINACIONES } from '../../lib/dbArqueoCaja'
import { fmtMoney, fmtDate, todayIso } from '../../lib/formatters'

function emptyCantidades() {
  return DENOMINACIONES.reduce((acc, d) => ({ ...acc, [d]: '' }), {})
}

export default function ArqueoCaja() {
  const [cantidades, setCantidades] = useState(emptyCantidades)
  const [notas, setNotas] = useState('')
  const [historial, setHistorial] = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reciboArqueo, setReciboArqueo] = useState(null)

  useEffect(() => {
    getArqueos()
      .then(setHistorial)
      .catch(() => toast.error('No se pudo cargar el historial de arqueos'))
      .finally(() => setLoadingHistorial(false))
  }, [])

  const denominaciones = DENOMINACIONES.map((d) => {
    const cantidad = Number(cantidades[d]) || 0
    return { denom: d, cantidad, subtotal: d * cantidad }
  })
  const total = denominaciones.reduce((sum, d) => sum + d.subtotal, 0)

  const handleCantidad = (denom, value) => {
    setCantidades((prev) => ({ ...prev, [denom]: value }))
  }

  const handleRegistrar = async () => {
    if (total <= 0) {
      toast.error('Ingresa al menos una cantidad')
      return
    }
    setSaving(true)
    try {
      const nuevo = await registrarArqueo({
        date: todayIso(),
        denominaciones: denominaciones.filter((d) => d.cantidad > 0),
        total,
        notas,
      })
      setHistorial((prev) => [nuevo, ...prev])
      setCantidades(emptyCantidades())
      setNotas('')
      toast.success('Arqueo registrado')
      setReciboArqueo(nuevo)
    } catch (err) {
      toast.error(err.message || 'No se pudo registrar el arqueo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ClipboardCheck size={24} className="text-indigo-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Arqueo de Caja</h2>
          <p className="text-sm text-gray-500">Contador de billetes y monedas — uso personal, no comparado contra el sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Conteo por denominación</p>
          <div className="divide-y divide-gray-100">
            {denominaciones.map(({ denom, cantidad, subtotal }) => (
              <div key={denom} className="flex items-center gap-3 py-2">
                <span className="w-24 text-sm text-gray-600">{fmtMoney(denom)}</span>
                <input
                  type="number"
                  min="0"
                  value={cantidades[denom]}
                  onChange={(e) => handleCantidad(denom, e.target.value)}
                  placeholder="0"
                  className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="flex-1 text-right text-sm font-medium text-gray-900">
                  {subtotal > 0 ? fmtMoney(subtotal) : '—'}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center border-t border-gray-200 mt-3 pt-3">
            <span className="font-semibold text-gray-700">Total contado</span>
            <span className="text-xl font-bold text-indigo-600">{fmtMoney(total)}</span>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700 block mb-1">Notas (opcional)</label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej. conteo de cierre del día"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={handleRegistrar} disabled={saving}>
              <ClipboardCheck size={16} />
              {saving ? 'Registrando...' : 'Registrar arqueo'}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Historial de conteos</p>
          {loadingHistorial ? (
            <p className="text-sm text-gray-400">Cargando...</p>
          ) : historial.length === 0 ? (
            <p className="text-sm text-gray-400">Sin arqueos registrados todavía.</p>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto divide-y divide-gray-100">
              {historial.map((a) => (
                <div key={a.id} className="py-2 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-900">{fmtDate(a.date)}</p>
                    {a.notas && <p className="text-xs text-gray-400 italic">{a.notas}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{fmtMoney(a.total)}</span>
                    <button
                      onClick={() => setReciboArqueo(a)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                      title="Imprimir recibo"
                    >
                      <Printer size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ReciboArqueoCaja open={!!reciboArqueo} onClose={() => setReciboArqueo(null)} arqueo={reciboArqueo} />
    </div>
  )
}
