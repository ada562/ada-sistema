import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ClipboardCheck, Printer } from 'lucide-react'
import Modal from '../UI/Modal'
import Button from '../UI/Button'
import ReciboArqueoCaja from './ReciboArqueoCaja'
import { useTesoreriaStore } from '../../store/useTesoreriaStore'
import { getArqueos, registrarArqueo } from '../../lib/dbArqueoCaja'
import { fmtMoney, fmtDate, todayIso } from '../../lib/formatters'

export default function ArqueoCaja({ open, onClose }) {
  const balances = useTesoreriaStore((s) => s.balances)
  const [saldoContado, setSaldoContado] = useState('')
  const [notas, setNotas] = useState('')
  const [historial, setHistorial] = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reciboArqueo, setReciboArqueo] = useState(null)

  const saldoSistema = balances.efectivo ?? 0
  const contado = Number(saldoContado)
  const diferencia = saldoContado !== '' ? contado - saldoSistema : null

  useEffect(() => {
    if (!open) return
    setLoadingHistorial(true)
    getArqueos()
      .then(setHistorial)
      .catch(() => toast.error('No se pudo cargar el historial de arqueos'))
      .finally(() => setLoadingHistorial(false))
  }, [open])

  if (!open) return null

  const handleRegistrar = async () => {
    if (saldoContado === '' || contado < 0) {
      toast.error('Ingresa el saldo contado')
      return
    }
    setSaving(true)
    try {
      const nuevo = await registrarArqueo({
        date: todayIso(),
        saldoSistema,
        saldoContado: contado,
        notas,
      })
      setHistorial((prev) => [nuevo, ...prev])
      setSaldoContado('')
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
    <Modal open={open} onClose={onClose} title="Arqueo de caja (efectivo)">
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Saldo según sistema</span>
            <span className="font-semibold text-gray-900">{fmtMoney(saldoSistema)}</span>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Saldo contado (físico)</label>
            <input
              type="number"
              value={saldoContado}
              onChange={(e) => setSaldoContado(e.target.value)}
              placeholder="0"
              className="w-full text-lg font-bold border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {diferencia !== null && (
            <div className="flex justify-between text-sm border-t border-gray-200 pt-3">
              <span className="text-gray-500">Diferencia</span>
              <span className={`font-bold ${diferencia === 0 ? 'text-gray-700' : diferencia > 0 ? 'text-green-700' : 'text-red-600'}`}>
                {diferencia > 0 ? '+' : ''}{fmtMoney(diferencia)} {diferencia === 0 ? '' : diferencia > 0 ? '(sobrante)' : '(faltante)'}
              </span>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notas (opcional)</label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej. arqueo de cierre del día"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleRegistrar} disabled={saving}>
            <ClipboardCheck size={16} />
            {saving ? 'Registrando...' : 'Registrar arqueo'}
          </Button>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Historial de conteos</p>
          {loadingHistorial ? (
            <p className="text-sm text-gray-400">Cargando...</p>
          ) : historial.length === 0 ? (
            <p className="text-sm text-gray-400">Sin arqueos registrados todavía.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {historial.map((a) => (
                <div key={a.id} className="px-3 py-2 text-sm flex justify-between items-center">
                  <div>
                    <p className="text-gray-900">{fmtDate(a.date)}</p>
                    <p className="text-xs text-gray-400">Sistema: {fmtMoney(a.saldoSistema)} · Contado: {fmtMoney(a.saldoContado)}</p>
                    {a.notas && <p className="text-xs text-gray-400 italic">{a.notas}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${a.diferencia === 0 ? 'text-gray-600' : a.diferencia > 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {a.diferencia > 0 ? '+' : ''}{fmtMoney(a.diferencia)}
                    </span>
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
    </Modal>
  )
}
