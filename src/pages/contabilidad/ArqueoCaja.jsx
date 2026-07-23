import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ClipboardCheck, Printer, Trash2 } from 'lucide-react'
import Button from '../../components/UI/Button'
import ReciboArqueoCaja from '../../components/tesoreria/ReciboArqueoCaja'
import { DENOMINACIONES } from '../../lib/dbArqueoCaja'
import { useArqueoCajaStore } from '../../store/useArqueoCajaStore'
import { useTesoreriaStore } from '../../store/useTesoreriaStore'
import { useAuthStore } from '../../store/useAuthStore'
import { fmtMoney, fmtDate, todayIso } from '../../lib/formatters'

function emptyCantidades() {
  return DENOMINACIONES.reduce((acc, d) => ({ ...acc, [d]: '' }), {})
}

export default function ArqueoCaja() {
  const [cantidades, setCantidades] = useState(emptyCantidades)
  const [notas, setNotas] = useState('')
  const [pendienteMonto, setPendienteMonto] = useState('')
  const [pendienteConcepto, setPendienteConcepto] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [reciboArqueo, setReciboArqueo] = useState(null)

  const isAdmin = useAuthStore((s) => s.perfil?.rol === 'admin')

  const {
    arqueos: historial,
    loading: loadingHistorial,
    fetchAll,
    registrar,
    eliminar,
    initRealtime,
    teardownRealtime,
  } = useArqueoCajaStore()

  // Saldo del sistema via useTesoreriaStore (no un fetch aparte) para que se
  // actualice solo en tiempo real -- antes se pedia una sola vez al abrir la
  // pagina y quedaba desactualizado si el saldo cambiaba (ej. corrigiendo un
  // movimiento en Tesoreria) mientras el usuario seguia en Arqueo de Caja.
  const {
    balances,
    fetchBalances,
    initRealtime: initRealtimeTesoreria,
    teardownRealtime: teardownRealtimeTesoreria,
  } = useTesoreriaStore()
  const saldoSistema = balances.efectivo

  useEffect(() => {
    fetchAll()
    initRealtime()
    return () => teardownRealtime()
  }, [fetchAll, initRealtime, teardownRealtime])

  useEffect(() => {
    fetchBalances()
    initRealtimeTesoreria()
    return () => teardownRealtimeTesoreria()
  }, [fetchBalances, initRealtimeTesoreria, teardownRealtimeTesoreria])

  const arqueoHoy = historial.find((a) => a.date === todayIso())

  const denominaciones = DENOMINACIONES.map((d) => {
    const cantidad = Number(cantidades[d]) || 0
    return { denom: d, cantidad, subtotal: d * cantidad }
  })
  const total = denominaciones.reduce((sum, d) => sum + d.subtotal, 0)
  const diferencia = saldoSistema != null ? total - saldoSistema : null

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
      const nuevo = await registrar({
        date: todayIso(),
        denominaciones: denominaciones.filter((d) => d.cantidad > 0),
        total,
        notas,
        saldoSistema,
        pendienteMonto: Number(pendienteMonto) || null,
        pendienteConcepto,
      })
      setCantidades(emptyCantidades())
      setNotas('')
      setPendienteMonto('')
      setPendienteConcepto('')
      toast.success('Arqueo registrado')
      setReciboArqueo(nuevo)
    } catch (err) {
      toast.error(err.message || 'No se pudo registrar el arqueo')
    } finally {
      setSaving(false)
    }
  }

  const handleEliminar = async (arqueo) => {
    if (!window.confirm(`¿Eliminar el arqueo del ${fmtDate(arqueo.date)}? Esta acción no se puede deshacer.`)) return
    setDeletingId(arqueo.id)
    try {
      await eliminar(arqueo.id)
      toast.success('Arqueo eliminado')
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el arqueo')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ClipboardCheck size={24} className="text-indigo-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Arqueo de Caja</h2>
          <p className="text-sm text-gray-500">Cuenta tu efectivo y compara contra el saldo de Tesorería — visible también para Gerencia</p>
        </div>
      </div>

      {!loadingHistorial && (
        arqueoHoy ? (
          arqueoHoy.diferencia === 0 ? (
            <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-green-700">✓ Hoy estás cuadrada con el efectivo</p>
            </div>
          ) : (
            <div className={`mb-6 rounded-lg border px-4 py-3 text-center ${arqueoHoy.diferencia > 0 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-sm font-semibold ${arqueoHoy.diferencia > 0 ? 'text-amber-700' : 'text-red-700'}`}>
                {arqueoHoy.diferencia > 0
                  ? `Hoy te sobran ${fmtMoney(arqueoHoy.diferencia)} según tu último conteo`
                  : `Hoy te faltan ${fmtMoney(Math.abs(arqueoHoy.diferencia))} según tu último conteo`}
              </p>
            </div>
          )
        ) : (
          <div className="mb-6 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-center">
            <p className="text-sm text-gray-500">Aún no registras un conteo de caja hoy</p>
          </div>
        )
      )}

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

          {saldoSistema != null && (
            <div className="flex justify-between items-center mt-1 text-sm">
              <span className="text-gray-500">Saldo según sistema (Tesorería)</span>
              <span className="text-gray-700">{fmtMoney(saldoSistema)}</span>
            </div>
          )}
          {total > 0 && diferencia != null && (
            diferencia === 0 ? (
              <div className="mt-3 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-center">
                <p className="text-sm font-semibold text-green-700">✓ Estás cuadrada, no falta nada</p>
              </div>
            ) : (
              <div className={`mt-3 rounded-lg border px-3 py-2 text-center ${diferencia > 0 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-sm font-semibold ${diferencia > 0 ? 'text-amber-700' : 'text-red-700'}`}>
                  {diferencia > 0
                    ? `Te sobra ${fmtMoney(diferencia)} frente al sistema`
                    : `Te falta ${fmtMoney(Math.abs(diferencia))} frente al sistema`}
                </p>
              </div>
            )
          )}

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

          <div className="mt-4 border-t border-gray-100 pt-4">
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Efectivo pendiente (recibido pero no lo tengo físicamente)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={pendienteMonto}
                onChange={(e) => setPendienteMonto(e.target.value)}
                placeholder="Monto"
                className="w-32 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                value={pendienteConcepto}
                onChange={(e) => setPendienteConcepto(e.target.value)}
                placeholder="Concepto (ej. lo maneja Juan David)"
                className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Solo anotación personal, no crea movimientos en Tesorería.</p>
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
                    {a.pendienteMonto > 0 && (
                      <p className="text-xs text-amber-600">
                        Pendiente: {fmtMoney(a.pendienteMonto)}{a.pendienteConcepto ? ` — ${a.pendienteConcepto}` : ''}
                      </p>
                    )}
                    {a.saldoSistema > 0 && (
                      a.diferencia === 0 ? (
                        <p className="text-xs text-green-600 font-medium">✓ Cuadrada</p>
                      ) : (
                        <p className={`text-xs font-medium ${a.diferencia > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                          {a.diferencia > 0 ? `Sobró ${fmtMoney(a.diferencia)}` : `Faltó ${fmtMoney(Math.abs(a.diferencia))}`}
                        </p>
                      )
                    )}
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
                    {isAdmin && (
                      <button
                        onClick={() => handleEliminar(a)}
                        disabled={deletingId === a.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                        title="Eliminar arqueo"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
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
