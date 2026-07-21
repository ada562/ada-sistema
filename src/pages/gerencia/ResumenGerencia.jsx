import { useState, useEffect } from 'react'
import { TrendingUp, Plus, Pencil, Trash2, AlertTriangle, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/UI/Button'
import Modal from '../../components/UI/Modal'
import { getTransactions, getAccountBalances } from '../../lib/dbTesoreria'
import { useProyectosStore } from '../../store/useProyectosStore'
import { useContratistasStore } from '../../store/useContratistasStore'
import { useEmpleadosStore } from '../../store/useEmpleadosStore'
import { getSettings } from '../../lib/dbSettings'
import { useCalendarioStore } from '../../store/useCalendarioStore'
import { fmtMoney, fmtDate } from '../../lib/formatters'
import { useNavigationStore } from '../../store/useNavigationStore'

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MONTH_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function ResumenGerencia() {
  const [calModal, setCalModal] = useState({ open: false, data: null })
  const { setActiveView } = useNavigationStore()

  const [transactions, setTransactions] = useState([])
  const [balances, setBalances] = useState({ banco: 0, efectivo: 0, nequi: 0 })
  const [balancesLoading, setBalancesLoading] = useState(true)
  const proyectos = useProyectosStore((s) => s.projects)
  const fetchProyectos = useProyectosStore((s) => s.fetchAll)
  const initProyectosRealtime = useProyectosStore((s) => s.initRealtime)
  const teardownProyectosRealtime = useProyectosStore((s) => s.teardownRealtime)
  const addCalendarioItem = useCalendarioStore((s) => s.addItem)
  const updateCalendarioItem = useCalendarioStore((s) => s.updateItem)
  const deleteCalendarioItem = useCalendarioStore((s) => s.deleteItem)
  const getProximosPagos = useCalendarioStore((s) => s.getProximosPagos)
  const fetchCalendario = useCalendarioStore((s) => s.fetchAll)
  const initCalendarioRealtime = useCalendarioStore((s) => s.initRealtime)
  const teardownCalendarioRealtime = useCalendarioStore((s) => s.teardownRealtime)
  const contratistas = useContratistasStore((s) => s.contratistas)
  const contratistasLoading = useContratistasStore((s) => s.loading)
  const fetchContratistas = useContratistasStore((s) => s.fetchAll)
  const initContratistasRealtime = useContratistasStore((s) => s.initRealtime)
  const teardownContratistasRealtime = useContratistasStore((s) => s.teardownRealtime)
  const getPaymentsByContractor = useContratistasStore((s) => s.getPaymentsByContractor)
  const empleadosLoading = useEmpleadosStore((s) => s.loading)
  const fetchEmpleados = useEmpleadosStore((s) => s.fetchAll)
  const initEmpleadosRealtime = useEmpleadosStore((s) => s.initRealtime)
  const teardownEmpleadosRealtime = useEmpleadosStore((s) => s.teardownRealtime)
  const getEmpleadosActivos = useEmpleadosStore((s) => s.getEmpleadosActivos)
  const empleados = getEmpleadosActivos().filter((e) => e.monthlyRate > 0)
  const [cargaPct, setCargaPct] = useState(29)
  const proximosPagos = getProximosPagos()

  useEffect(() => {
    getSettings().then((s) => setCargaPct(s.cargaPrestacionalPct || 29))
    Promise.all([getAccountBalances(), getTransactions()]).then(([b, tx]) => {
      setBalances(b)
      setTransactions(tx)
      setBalancesLoading(false)
    })
  }, [])

  useEffect(() => {
    fetchProyectos()
    initProyectosRealtime()
    return () => teardownProyectosRealtime()
  }, [fetchProyectos, initProyectosRealtime, teardownProyectosRealtime])

  useEffect(() => {
    fetchCalendario()
    initCalendarioRealtime()
    return () => teardownCalendarioRealtime()
  }, [fetchCalendario, initCalendarioRealtime, teardownCalendarioRealtime])

  useEffect(() => {
    fetchContratistas()
    initContratistasRealtime()
    return () => teardownContratistasRealtime()
  }, [fetchContratistas, initContratistasRealtime, teardownContratistasRealtime])

  useEffect(() => {
    fetchEmpleados()
    initEmpleadosRealtime()
    return () => teardownEmpleadosRealtime()
  }, [fetchEmpleados, initEmpleadosRealtime, teardownEmpleadosRealtime])

  if (balancesLoading || contratistasLoading || empleadosLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-24 bg-gray-200 rounded-lg" />
          <div className="h-24 bg-gray-200 rounded-lg" />
          <div className="h-24 bg-gray-200 rounded-lg" />
          <div className="h-24 bg-gray-200 rounded-lg" />
        </div>
      </div>
    )
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // ─── Saldos ───
  const totalCaja = balances.banco + balances.efectivo + balances.nequi

  // ─── Ingresos/Gastos del mes ───
  const mm = String(currentMonth + 1).padStart(2, '0')
  const monthStart = `${currentYear}-${mm}-01`
  const monthEnd = `${currentYear}-${mm}-31`
  const monthTx = transactions.filter((t) => t.date >= monthStart && t.date <= monthEnd)
  const ingresosMes = monthTx.filter((t) => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0)
  const gastosMes = monthTx.filter((t) => t.type === 'gasto').reduce((s, t) => s + t.amount, 0)
  const resultadoMes = ingresosMes - gastosMes

  // ─── Acumulados año ───
  const yearStart = `${currentYear}-01-01`
  const yearEnd = `${currentYear}-12-31`
  const yearTx = transactions.filter((t) => t.date >= yearStart && t.date <= yearEnd)
  const ingresosAno = yearTx.filter((t) => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0)
  const gastosAno = yearTx.filter((t) => t.type === 'gasto').reduce((s, t) => s + t.amount, 0)
  const resultadoAno = ingresosAno - gastosAno

  // ─── Deudas contratistas ───
  let deudaContratistas = 0
  contratistas.forEach((c) => {
    const pays = getPaymentsByContractor(c.id)
    pays.forEach((p) => { deudaContratistas += Math.max(p.amount - p.paidAmount, 0) })
  })

  // ─── GBA ───
  const gbaTx = transactions.filter((t) => t.category === 'GBA' && t.gbaMovement)
  const gbaOtorgado = gbaTx.filter((t) => t.gbaMovement === 'prestamo_otorgado').reduce((s, t) => s + t.amount, 0)
  const gbaRecibido = gbaTx.filter((t) => t.gbaMovement === 'prestamo_recibido').reduce((s, t) => s + t.amount, 0)
  const gbaPagos = gbaTx.filter((t) => t.gbaMovement === 'pago_prestamo').reduce((s, t) => s + t.amount, 0)
  const gbaDeuda = gbaRecibido - gbaOtorgado + gbaPagos // positive = GBA nos debe

  // ─── Proyectos activos ───
  const proyectosActivos = proyectos.filter((p) => p.status === 'Activo')
  const valorContratado = proyectosActivos.reduce((s, p) => s + (p.contractValue || 0), 0)

  // ─── Saldos por cobrar y por pagar ───
  // Por cobrar: proyectos con ingresos < valor contrato
  const porCobrar = proyectosActivos
    .map((p) => {
      const ingresosP = transactions.filter((t) => t.projectId === p.id && t.type === 'ingreso').reduce((s, t) => s + t.amount, 0)
      const pendiente = (p.contractValue || 0) - ingresosP
      return { ...p, pendiente, tipo: 'proyecto' }
    })
    .filter((p) => p.pendiente > 0)
    .sort((a, b) => b.pendiente - a.pendiente)
    .slice(0, 5)

  // Por pagar: contratistas con saldo pendiente
  const porPagar = contratistas
    .map((c) => {
      const pays = getPaymentsByContractor(c.id)
      const pendiente = pays.reduce((s, p) => s + Math.max(p.amount - p.paidAmount, 0), 0)
      return { ...c, pendiente, tipo: 'contratista' }
    })
    .filter((c) => c.pendiente > 0)

  // GBA entry
  const saldosCombined = [
    ...porCobrar.map((p) => ({ name: p.name, client: p.client, tipo: 'PROYECTO', estado: 'Por cobrar', valor: p.pendiente })),
    ...porPagar.map((c) => ({ name: c.name, tipo: 'CONTRATISTA', estado: 'Por pagar', valor: c.pendiente })),
  ]
  if (Math.abs(gbaDeuda) > 0) {
    saldosCombined.push({
      name: `Préstamo GBA / ADA`,
      tipo: 'GBA',
      estado: gbaDeuda > 0 ? 'Nos deben' : 'Debemos',
      valor: Math.abs(gbaDeuda),
    })
  }

  // ─── Gráfico barras: últimos 6 meses ───
  const last6 = []
  for (let i = 5; i >= 0; i--) {
    let m = currentMonth - i
    let y = currentYear
    if (m < 0) { m += 12; y-- }
    const mStr = String(m + 1).padStart(2, '0')
    const mStart = `${y}-${mStr}-01`
    const mEnd = `${y}-${mStr}-31`
    const mTx = transactions.filter((t) => t.date >= mStart && t.date <= mEnd)
    const ing = mTx.filter((t) => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0)
    const gas = mTx.filter((t) => t.type === 'gasto').reduce((s, t) => s + t.amount, 0)
    last6.push({ label: `${MONTH_NAMES[m]} ${String(y).slice(2)}`, ingresos: ing, gastos: gas })
  }
  const maxBar = Math.max(...last6.map((m) => Math.max(m.ingresos, m.gastos)), 1)

  // ─── Proyección mensual (próximos 6 meses) ───
  const salarioMensualTotal = empleados.reduce((s, e) => s + e.monthlyRate + (e.nonConstitutiveSalary || 0), 0)
  const aportesMensual = empleados.reduce((s, e) => s + Math.round(e.monthlyRate * cargaPct / 100), 0)
  const primaLegalTotal = empleados.reduce((s, e) => s + e.monthlyRate / 2, 0)
  const primaNoConstTotal = empleados.reduce((s, e) => s + (e.nonConstitutiveSalary || 0) / 2, 0)

  const proyeccion = []
  for (let i = 0; i < 6; i++) {
    let m = currentMonth + i
    let y = currentYear
    if (m > 11) { m -= 12; y++ }
    const esPrima = m === 5 || m === 11 // junio o diciembre
    const gastoNomina = salarioMensualTotal + aportesMensual
    const gastoPrima = esPrima ? primaLegalTotal + primaNoConstTotal : 0
    const total = gastoNomina + gastoPrima
    proyeccion.push({
      label: `${MONTH_FULL[m]} ${y}`,
      short: MONTH_NAMES[m],
      nomina: gastoNomina,
      prima: gastoPrima,
      total,
      heavy: esPrima,
    })
  }

  // ─── Por facturar ───
  const sinFactura = transactions
    .filter((t) => t.type === 'ingreso' && t.projectId && t.facturado === false)

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <TrendingUp size={24} className="text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-900">Resumen General</h2>
      </div>
      <p className="text-sm text-gray-500 mb-5">Estado consolidado de caja, proyectos y cobros pendientes, actualizado en tiempo real con cada movimiento registrado.</p>

      {/* ═══ 00 CALENDARIO TRIBUTARIO ═══ */}
      <Section num="00" title="Calendario tributario · Próximos pagos">
        <div className="flex justify-end mb-2">
          <Button size="sm" variant="outline" onClick={() => setCalModal({ open: true, data: null })}>
            <Plus size={13} /> Agregar pago
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase">
              <th className="pb-2 font-medium">Pago</th>
              <th className="pb-2 font-medium">Próxima fecha</th>
              <th className="pb-2 font-medium">Vence</th>
              <th className="pb-2 font-medium text-right">Monto</th>
              <th className="pb-2 font-medium text-center w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {proximosPagos.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="py-2 font-medium text-gray-900">{p.name}</td>
                <td className="py-2 text-gray-600">{fmtDate(p.nextDate)}</td>
                <td className="py-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    p.daysUntil <= 7 ? 'bg-red-100 text-red-700' :
                    p.daysUntil <= 15 ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    en {p.daysUntil} días
                  </span>
                </td>
                <td className="py-2 text-right font-medium text-gray-900">{p.amount > 0 ? fmtMoney(p.amount) : '—'}</td>
                <td className="py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setCalModal({ open: true, data: p })} className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50"><Pencil size={12} /></button>
                    <button onClick={async () => { try { await deleteCalendarioItem(p.id); toast.success('Eliminado') } catch (err) { toast.error('Error al eliminar: ' + err.message) } }} className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ═══ SALDOS DE CAJA ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Banco empresa" value={fmtMoney(balances.banco)} sub="Saldo actual" negative={balances.banco < 0} />
        <MetricCard label="Efectivo" value={fmtMoney(balances.efectivo)} sub="Saldo actual" />
        <MetricCard label="Nequi" value={fmtMoney(balances.nequi)} sub="Saldo actual" />
        <MetricCard label="Caja total empresa" value={fmtMoney(totalCaja)} sub="Suma de las 3 cuentas" accent />
      </div>

      {/* ═══ INGRESOS/GASTOS MES + ACUMULADO ═══ */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <MetricCard label="Ingresos del mes" value={fmtMoney(ingresosMes)} />
        <MetricCard label="Gastos del mes" value={fmtMoney(gastosMes)} />
        <MetricCard label="Resultado del mes" value={fmtMoney(resultadoMes)} negative={resultadoMes < 0} accent />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <MetricCard label={`Ingresos acumulados ${currentYear}`} value={fmtMoney(ingresosAno)} />
        <MetricCard label={`Gastos acumulados ${currentYear}`} value={fmtMoney(gastosAno)} />
        <MetricCard label={`Resultado acumulado ${currentYear}`} value={fmtMoney(resultadoAno)} negative={resultadoAno < 0} accent warn={resultadoAno < 0} />
      </div>

      {/* ═══ 02 DEUDAS ═══ */}
      <Section num="02" title="Deudas con contratistas, con GBA y facturación pendiente">
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Contratistas — Se les debe" value={fmtMoney(deudaContratistas)} sub={`${porPagar.length} contratista(s) con saldo pendiente`} negative />
          <MetricCard label="GBA nos debe" value={fmtMoney(Math.abs(gbaDeuda))} sub={gbaDeuda > 0 ? 'Le prestamos, a favor nuestro' : 'ADA le debe a GBA'} accent={gbaDeuda > 0} />
          <MetricCard label="Falta por facturar" value={fmtMoney(0)} sub={`${sinFactura.length} pago(s) sin factura / cuenta de cobro`} />
        </div>
      </Section>

      {/* ═══ 03 GRÁFICO INGRESOS VS GASTOS ═══ */}
      <Section num="03" title={`Ingresos vs. Gastos · Últimos 6 meses`}>
        {/* Simple bar chart */}
        <div className="flex items-end gap-4 h-[160px] mb-2">
          {last6.map((m, i) => (
            <div key={i} className="flex-1 flex items-end gap-1 h-full">
              <div className="flex-1 flex flex-col items-center justify-end h-full">
                <div className="w-full bg-indigo-500 rounded-t" style={{ height: `${(m.ingresos / maxBar) * 100}%`, minHeight: m.ingresos > 0 ? '4px' : '0' }} />
              </div>
              <div className="flex-1 flex flex-col items-center justify-end h-full">
                <div className="w-full bg-amber-500 rounded-t" style={{ height: `${(m.gastos / maxBar) * 100}%`, minHeight: m.gastos > 0 ? '4px' : '0' }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4">
          {last6.map((m, i) => (
            <div key={i} className="flex-1 text-center text-xs text-gray-500">{m.label}</div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-500" /> Ingresos</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" /> Gastos</span>
        </div>
        {/* Values below */}
        <div className="flex gap-4 mt-3 border-t border-gray-100 pt-2">
          {last6.map((m, i) => (
            <div key={i} className="flex-1 text-center">
              <div className="text-xs font-medium text-gray-700">{m.label}</div>
              <div className="text-xs text-indigo-600">{fmtMoney(m.ingresos)}</div>
              <div className="text-xs text-amber-600">{fmtMoney(m.gastos)}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ 04-05 PROYECTOS + SALDOS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Section num="04" title="Proyectos activos" inline>
          <div className="text-3xl font-bold text-gray-900 mb-1">{proyectosActivos.length}</div>
          <p className="text-sm text-gray-500">Valor contratado: {fmtMoney(valorContratado)}</p>
        </Section>

        <Section num="05" title="Saldos por cobrar y por pagar" inline>
          {saldosCombined.length === 0 ? (
            <p className="text-sm text-gray-400 py-3">Todo al día</p>
          ) : (
            <div className="max-h-[260px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 uppercase">
                    <th className="pb-1 font-medium">Tipo</th>
                    <th className="pb-1 font-medium">Detalle</th>
                    <th className="pb-1 font-medium">Estado</th>
                    <th className="pb-1 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {saldosCombined.map((s, i) => (
                    <tr key={i}>
                      <td className="py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          s.tipo === 'PROYECTO' ? 'bg-indigo-100 text-indigo-700' :
                          s.tipo === 'CONTRATISTA' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>{s.tipo}</span>
                      </td>
                      <td className="py-1.5 font-medium text-gray-900">{s.client ? `${s.client}` : s.name}</td>
                      <td className="py-1.5 text-gray-500">{s.estado}</td>
                      <td className="py-1.5 text-right font-medium text-gray-900">{fmtMoney(s.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      {/* ═══ 06 PROYECCIÓN MENSUAL ═══ */}
      <Section num="06" title="Proyección de gastos fijos · Próximos 6 meses">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-xs text-blue-800">
          Incluye nómina (legal + no constitutivo) + aportes patronales ({cargaPct}%). Los meses con <strong>prima</strong> (junio y diciembre) son los más pesados.
        </div>
        <div className="grid grid-cols-6 gap-2 mb-3">
          {proyeccion.map((p, i) => (
            <div key={i} className={`rounded-lg border p-3 text-center ${p.heavy ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
              <div className={`text-xs font-semibold uppercase mb-1 ${p.heavy ? 'text-red-600' : 'text-gray-500'}`}>
                {p.short}
                {p.heavy && <span className="ml-1">⚠</span>}
              </div>
              <div className={`text-lg font-bold ${p.heavy ? 'text-red-700' : 'text-gray-900'}`}>{fmtMoney(p.total)}</div>
              <div className="text-xs text-gray-500 mt-1">Nómina: {fmtMoney(p.nomina)}</div>
              {p.prima > 0 && (
                <div className="text-xs text-red-600 font-medium">Prima: {fmtMoney(p.prima)}</div>
              )}
            </div>
          ))}
        </div>
        <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-gray-600">Total proyectado (6 meses)</span>
          <span className="text-lg font-bold text-gray-900">{fmtMoney(proyeccion.reduce((s, p) => s + p.total, 0))}</span>
        </div>
      </Section>

      {/* ═══ 07 POR FACTURAR ═══ */}
      <Section num="07" title="Por facturar">
        <p className="text-xs text-gray-500 mb-2">Ingresos que entraron al banco asociados a un proyecto y todavía no tienen cuenta de cobro / factura generada.</p>
        {sinFactura.length === 0 ? (
          <p className="text-sm text-green-600">No hay pagos pendientes de facturar.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {sinFactura.map((t) => {
                const pName = proyectos.find((p) => p.id === t.projectId)?.name || '—'
                return (
                  <tr key={t.id}>
                    <td className="py-2 text-gray-600">{fmtDate(t.date)}</td>
                    <td className="py-2 font-medium text-gray-900">{pName}</td>
                    <td className="py-2 text-gray-600">{t.description}</td>
                    <td className="py-2 text-right font-medium">{fmtMoney(t.amount)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Section>

      {/* Modal calendario */}
      <FormCalendario
        open={calModal.open}
        data={calModal.data}
        onClose={() => setCalModal({ open: false, data: null })}
        addCalendarioItem={addCalendarioItem}
        updateCalendarioItem={updateCalendarioItem}
      />
    </div>
  )
}

/* ─── Section wrapper ─── */
function Section({ num, title, children, inline }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 mb-4 ${inline ? '' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold text-indigo-600 uppercase">{num}</span>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  )
}

/* ─── Metric card ─── */
function MetricCard({ label, value, sub, accent, negative, warn }) {
  return (
    <div className={`border rounded-lg p-4 ${warn ? 'bg-red-50 border-red-200' : accent ? 'bg-white border-indigo-200' : 'bg-white border-gray-200'}`}>
      <p className="text-xs text-gray-500 uppercase font-semibold">{label}</p>
      <p className={`text-lg font-bold ${negative ? 'text-red-600' : accent ? 'text-indigo-700' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

/* ─── Modal: Calendario tributario ─── */
function FormCalendario({ open, data, onClose, addCalendarioItem, updateCalendarioItem }) {
  const [form, setForm] = useState({})
  const isEdit = !!data

  const resetForm = () => {
    setForm(data
      ? { name: data.name, frequency: data.frequency, dayOfMonth: data.dayOfMonth, amount: data.amount, notes: data.notes }
      : { name: '', frequency: 'mensual', dayOfMonth: 1, amount: '', notes: '' }
    )
  }

  if (open && !form.name && form.name !== '' && !isEdit) resetForm()
  if (open && isEdit && form._editId !== data?.id) {
    resetForm()
    setForm((f) => ({ ...f, _editId: data.id }))
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name?.trim()) return toast.error('Nombre requerido')
    try {
      if (isEdit) {
        await updateCalendarioItem(data.id, form)
        toast.success('Pago actualizado')
      } else {
        await addCalendarioItem(form)
        toast.success('Pago agregado')
      }
      onClose()
      setForm({})
    } catch (err) {
      toast.error('Error al guardar el pago: ' + err.message)
    }
  }

  return (
    <Modal open={open} onClose={() => { onClose(); setForm({}) }} title={isEdit ? 'Editar pago tributario' : 'Nuevo pago tributario'}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
          <input type="text" value={form.name || ''} onChange={(e) => set('name', e.target.value)}
            placeholder="Ej: Movistar, Planillas, ICA..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia</label>
            <select value={form.frequency || 'mensual'} onChange={(e) => set('frequency', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              <option value="mensual">Mensual</option>
              <option value="bimestral">Bimestral</option>
              <option value="semestral">Semestral</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Día del mes</label>
            <input type="number" min="1" max="31" value={form.dayOfMonth || ''} onChange={(e) => set('dayOfMonth', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monto estimado</label>
          <input type="number" value={form.amount || ''} onChange={(e) => set('amount', e.target.value)}
            placeholder="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <input type="text" value={form.notes || ''} onChange={(e) => set('notes', e.target.value)}
            placeholder="Meses específicos, detalles..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => { onClose(); setForm({}) }}>Cancelar</Button>
          <Button onClick={handleSave}>{isEdit ? 'Guardar' : 'Agregar'}</Button>
        </div>
      </div>
    </Modal>
  )
}
