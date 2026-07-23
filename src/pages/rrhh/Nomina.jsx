import { useState, useEffect } from 'react'
import { BadgeDollarSign, DollarSign, Printer, Check, Gift, Calculator, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/UI/Button'
import Modal from '../../components/UI/Modal'
import ReciboNomina from '../../components/nomina/ReciboNomina'
import { useEmpleadosStore } from '../../store/useEmpleadosStore'
import { useNominaStore } from '../../store/useNominaStore'
import { getSettings } from '../../lib/dbSettings'
import { fmtMoney, fmtDate, todayIso } from '../../lib/formatters'

/* ─── Helpers ─── */

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function getPeriods(year, month) {
  const mm = String(month + 1).padStart(2, '0')
  const q1Start = `${year}-${mm}-01`
  const q1End = `${year}-${mm}-15`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const q2Start = `${year}-${mm}-16`
  const q2End = `${year}-${mm}-${lastDay}`
  return [
    { label: `Q1 — 1 al 15`, quincena: 1, periodStart: q1Start, periodEnd: q1End },
    { label: `Q2 — 16 al ${lastDay}`, quincena: 2, periodStart: q2Start, periodEnd: q2End },
  ]
}

function getSemestres() {
  const y = new Date().getFullYear()
  return [
    { label: `1er Semestre ${y} (Ene–Jun)`, semestre: 1, periodStart: `${y}-01-01`, periodEnd: `${y}-06-30` },
    { label: `2do Semestre ${y} (Jul–Dic)`, semestre: 2, periodStart: `${y}-07-01`, periodEnd: `${y}-12-31` },
  ]
}

const TABS = [
  { id: 'quincena', label: 'Pagos Quincenales', icon: DollarSign },
  { id: 'primas', label: 'Primas', icon: Gift },
  { id: 'resumen', label: 'Resumen Costos', icon: Calculator },
]

/* ─── Main Component ─── */

export default function Nomina() {
  const { getEmpleadosActivos, fetchAll: fetchEmpleados, initRealtime: initEmpleadosRealtime, teardownRealtime: teardownEmpleadosRealtime } = useEmpleadosStore()
  const { payments: allPayments, fetchAll: fetchPagos, initRealtime: initPagosRealtime, teardownRealtime: teardownPagosRealtime, registrarPago } = useNominaStore()
  const empleados = getEmpleadosActivos().filter((e) => e.monthlyRate > 0)
  const [cargaPct, setCargaPct] = useState(29)

  useEffect(() => {
    getSettings().then((s) => setCargaPct(s.cargaPrestacionalPct || 29))
    fetchEmpleados()
    initEmpleadosRealtime()
    fetchPagos()
    initPagosRealtime()
    return () => {
      teardownEmpleadosRealtime()
      teardownPagosRealtime()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [activeTab, setActiveTab] = useState('quincena')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BadgeDollarSign size={24} className="text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Nómina</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'quincena' && (
        <TabQuincena empleados={empleados} allPayments={allPayments} registrarPago={registrarPago} />
      )}
      {activeTab === 'primas' && (
        <TabPrimas empleados={empleados} allPayments={allPayments} registrarPago={registrarPago} />
      )}
      {activeTab === 'resumen' && (
        <TabResumen empleados={empleados} cargaPct={cargaPct} />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   TAB 1: PAGOS QUINCENALES
   ═══════════════════════════════════════════════ */

function TabQuincena({ empleados, allPayments, registrarPago }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const periods = getPeriods(year, month)
  const [selectedPeriod, setSelectedPeriod] = useState(0)

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1) }
    else setMonth(month - 1)
    setSelectedPeriod(0)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1) }
    else setMonth(month + 1)
    setSelectedPeriod(0)
  }
  const [payModal, setPayModal] = useState({ open: false, emp: null, tipo: '' })
  const [reciboModal, setReciboModal] = useState({ open: false, payment: null, emp: null })

  const period = periods[selectedPeriod]

  const periodPayments = allPayments.filter(
    (p) => p.periodStart === period.periodStart && p.periodEnd === period.periodEnd
  )

  const isPaid = (empId, tipo) =>
    periodPayments.some((p) => p.employeeId === empId && p.tipo === tipo)
  const getPayment = (empId, tipo) =>
    periodPayments.find((p) => p.employeeId === empId && p.tipo === tipo)

  const totalLegal = empleados.reduce((s, e) => s + e.monthlyRate / 2, 0)
  const totalNoConst = empleados.reduce((s, e) => s + (e.nonConstitutiveSalary || 0) / 2, 0)
  const totalPagadoLegal = periodPayments.filter((p) => p.tipo === 'legal').reduce((s, p) => s + p.amount, 0)
  const totalPagadoNoConst = periodPayments.filter((p) => p.tipo === 'no_constitutivo').reduce((s, p) => s + p.amount, 0)

  return (
    <>
      {/* Month navigator */}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-gray-800 min-w-[140px] text-center">
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2 mb-4">
        {periods.map((p, i) => (
          <button
            key={i}
            onClick={() => setSelectedPeriod(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPeriod === i
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
        <span className="text-sm text-gray-400 ml-2">
          {fmtDate(period.periodStart)} — {fmtDate(period.periodEnd)}
        </span>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <SummaryCard label="Total legal quincenal" value={fmtMoney(totalLegal)} sub={`Pagado: ${fmtMoney(totalPagadoLegal)}`} />
        <SummaryCard label="Total no constitutivo quincenal" value={fmtMoney(totalNoConst)} sub={`Pagado: ${fmtMoney(totalPagadoNoConst)}`} />
        <SummaryCard label="Total nómina quincenal" value={fmtMoney(totalLegal + totalNoConst)} accent />
        <SummaryCard
          label="Total pagado"
          value={fmtMoney(totalPagadoLegal + totalPagadoNoConst)}
          sub={`Pendiente: ${fmtMoney(Math.max(totalLegal + totalNoConst - totalPagadoLegal - totalPagadoNoConst, 0))}`}
          green={totalPagadoLegal + totalPagadoNoConst >= totalLegal + totalNoConst}
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Empleado</th>
                <th className="px-4 py-3 font-medium text-gray-600">Cargo</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Legal (quincenal)</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center">Pago legal</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">No constitutivo (quincenal)</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center">Pago no const.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {empleados.map((emp) => {
                const legalQ = emp.monthlyRate / 2
                const noConstQ = (emp.nonConstitutiveSalary || 0) / 2
                const legalPaid = isPaid(emp.id, 'legal')
                const noConstPaid = isPaid(emp.id, 'no_constitutivo')
                const legalPayment = getPayment(emp.id, 'legal')
                const noConstPayment = getPayment(emp.id, 'no_constitutivo')

                return (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{emp.name}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{emp.role}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{fmtMoney(legalQ)}</td>
                    <td className="px-4 py-3 text-center">
                      <PayStatusCell
                        paid={legalPaid}
                        payment={legalPayment}
                        emp={emp}
                        onPay={() => setPayModal({ open: true, emp, tipo: 'legal', amount: legalQ })}
                        onRecibo={(payment) => setReciboModal({ open: true, payment, emp })}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {noConstQ > 0 ? fmtMoney(noConstQ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {noConstQ === 0 ? (
                        <span className="text-gray-300 text-xs">N/A</span>
                      ) : (
                        <PayStatusCell
                          paid={noConstPaid}
                          payment={noConstPayment}
                          emp={emp}
                          onPay={() => setPayModal({ open: true, emp, tipo: 'no_constitutivo', amount: noConstQ })}
                          onRecibo={(payment) => setReciboModal({ open: true, payment, emp })}
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PagarModal
        {...payModal}
        period={period}
        onClose={() => setPayModal({ open: false, emp: null, tipo: '' })}
        registrarPago={registrarPago}
      />
      <ReciboNomina
        open={reciboModal.open}
        onClose={() => setReciboModal({ open: false, payment: null, emp: null })}
        payment={reciboModal.payment}
        emp={reciboModal.emp}
      />
    </>
  )
}

/* ═══════════════════════════════════════════════
   TAB 2: PRIMAS
   ═══════════════════════════════════════════════ */

function TabPrimas({ empleados, allPayments, registrarPago }) {
  const semestres = getSemestres()
  const [selectedSem, setSelectedSem] = useState(() => {
    const m = new Date().getMonth()
    return m < 6 ? 0 : 1
  })
  const [payModal, setPayModal] = useState({ open: false, emp: null, tipo: '' })
  const [reciboModal, setReciboModal] = useState({ open: false, payment: null, emp: null })

  const sem = semestres[selectedSem]

  const semPayments = allPayments.filter(
    (p) => p.semestre === sem.semestre && (p.tipo === 'prima_legal' || p.tipo === 'prima_no_constitutivo')
      && p.periodStart === sem.periodStart
  )

  const isPrimaPaid = (empId, tipo) =>
    semPayments.some((p) => p.employeeId === empId && p.tipo === tipo)
  const getPrimaPayment = (empId, tipo) =>
    semPayments.find((p) => p.employeeId === empId && p.tipo === tipo)

  const totalPrimaLegal = empleados.reduce((s, e) => s + e.monthlyRate / 2, 0)
  const totalPrimaNoConst = empleados.reduce((s, e) => s + (e.nonConstitutiveSalary || 0) / 2, 0)
  const pagadoPrimaLegal = semPayments.filter((p) => p.tipo === 'prima_legal').reduce((s, p) => s + p.amount, 0)
  const pagadoPrimaNoConst = semPayments.filter((p) => p.tipo === 'prima_no_constitutivo').reduce((s, p) => s + p.amount, 0)

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
        <strong>Prima de servicios:</strong> Se paga 15 días de salario por semestre. Se paga en junio (1er semestre) y en diciembre (2do semestre), tanto para salario legal como no constitutivo.
      </div>

      {/* Semester selector */}
      <div className="flex items-center gap-2 mb-4">
        {semestres.map((s, i) => (
          <button
            key={i}
            onClick={() => setSelectedSem(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedSem === i
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <SummaryCard label="Prima legal (15 días)" value={fmtMoney(totalPrimaLegal)} sub={`Pagado: ${fmtMoney(pagadoPrimaLegal)}`} />
        <SummaryCard label="Prima no constitutivo (15 días)" value={fmtMoney(totalPrimaNoConst)} sub={`Pagado: ${fmtMoney(pagadoPrimaNoConst)}`} />
        <SummaryCard label="Total primas semestre" value={fmtMoney(totalPrimaLegal + totalPrimaNoConst)} accent />
        <SummaryCard
          label="Total pagado"
          value={fmtMoney(pagadoPrimaLegal + pagadoPrimaNoConst)}
          sub={`Pendiente: ${fmtMoney(Math.max(totalPrimaLegal + totalPrimaNoConst - pagadoPrimaLegal - pagadoPrimaNoConst, 0))}`}
          green={pagadoPrimaLegal + pagadoPrimaNoConst >= totalPrimaLegal + totalPrimaNoConst}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Empleado</th>
                <th className="px-4 py-3 font-medium text-gray-600">Cargo</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Prima legal (15 días)</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center">Estado</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Prima no const. (15 días)</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {empleados.map((emp) => {
                const primaLegal = emp.monthlyRate / 2
                const primaNoConst = (emp.nonConstitutiveSalary || 0) / 2
                const legalPaid = isPrimaPaid(emp.id, 'prima_legal')
                const noConstPaid = isPrimaPaid(emp.id, 'prima_no_constitutivo')
                const legalPayment = getPrimaPayment(emp.id, 'prima_legal')
                const noConstPayment = getPrimaPayment(emp.id, 'prima_no_constitutivo')

                return (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{emp.name}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{emp.role}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{fmtMoney(primaLegal)}</td>
                    <td className="px-4 py-3 text-center">
                      <PayStatusCell
                        paid={legalPaid}
                        payment={legalPayment}
                        emp={emp}
                        onPay={() => setPayModal({ open: true, emp, tipo: 'prima_legal', amount: primaLegal, sem })}
                        onRecibo={(payment) => setReciboModal({ open: true, payment, emp })}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {primaNoConst > 0 ? fmtMoney(primaNoConst) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {primaNoConst === 0 ? (
                        <span className="text-gray-300 text-xs">N/A</span>
                      ) : (
                        <PayStatusCell
                          paid={noConstPaid}
                          payment={noConstPayment}
                          emp={emp}
                          onPay={() => setPayModal({ open: true, emp, tipo: 'prima_no_constitutivo', amount: primaNoConst, sem })}
                          onRecibo={(payment) => setReciboModal({ open: true, payment, emp })}
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PagarPrimaModal
        {...payModal}
        onClose={() => setPayModal({ open: false, emp: null, tipo: '' })}
        registrarPago={registrarPago}
      />
      <ReciboNomina
        open={reciboModal.open}
        onClose={() => setReciboModal({ open: false, payment: null, emp: null })}
        payment={reciboModal.payment}
        emp={reciboModal.emp}
      />
    </>
  )
}

/* ═══════════════════════════════════════════════
   TAB 3: RESUMEN DE COSTOS
   ═══════════════════════════════════════════════ */

function TabResumen({ empleados, cargaPct }) {
  let grandSalarioLegal = 0
  let grandSalarioNoConst = 0
  let grandAportes = 0
  let grandPrimaLegal = 0
  let grandPrimaNoConst = 0
  let grandTotal = 0
  let grandTotalAnual = 0

  const rows = empleados.map((emp) => {
    const salLegal = emp.monthlyRate
    const salNoConst = emp.nonConstitutiveSalary || 0
    const aportes = Math.round(salLegal * cargaPct / 100)
    const primaLegalMes = Math.round(salLegal / 12)
    const primaNoConstMes = Math.round(salNoConst / 12)
    const totalMes = salLegal + salNoConst + aportes + primaLegalMes + primaNoConstMes
    const totalAnual = totalMes * 12

    grandSalarioLegal += salLegal
    grandSalarioNoConst += salNoConst
    grandAportes += aportes
    grandPrimaLegal += primaLegalMes
    grandPrimaNoConst += primaNoConstMes
    grandTotal += totalMes
    grandTotalAnual += totalAnual

    return { emp, salLegal, salNoConst, aportes, primaLegalMes, primaNoConstMes, totalMes, totalAnual }
  })

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
        <strong>Costo total empresa por empleado (mensual).</strong> Incluye: salario legal + no constitutivo + aportes patronales ({cargaPct}% sobre legal) + provisión prima mensual (1/12 del salario).
      </div>

      {/* Grand totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <SummaryCard label="Salario legal" value={fmtMoney(grandSalarioLegal)} />
        <SummaryCard label="No constitutivo" value={fmtMoney(grandSalarioNoConst)} />
        <SummaryCard label={`Aportes (${cargaPct}%)`} value={fmtMoney(grandAportes)} />
        <SummaryCard label="Provisión prima legal" value={fmtMoney(grandPrimaLegal)} />
        <SummaryCard label="Provisión prima no const." value={fmtMoney(grandPrimaNoConst)} />
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="text-xs text-indigo-600 uppercase font-semibold">Costo total mensual</p>
          <p className="text-xl font-bold text-indigo-700">{fmtMoney(grandTotal)}</p>
        </div>
        <div className="bg-indigo-100 border border-indigo-300 rounded-lg p-4">
          <p className="text-xs text-indigo-700 uppercase font-semibold">Costo total anual</p>
          <p className="text-xl font-bold text-indigo-800">{fmtMoney(grandTotalAnual)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-3 font-medium text-gray-600">Empleado</th>
                <th className="px-3 py-3 font-medium text-gray-600">Cargo</th>
                <th className="px-3 py-3 font-medium text-gray-600 text-right">Sal. Legal</th>
                <th className="px-3 py-3 font-medium text-gray-600 text-right">No Const.</th>
                <th className="px-3 py-3 font-medium text-gray-600 text-right">Aportes ({cargaPct}%)</th>
                <th className="px-3 py-3 font-medium text-gray-600 text-right">Prov. Prima Legal</th>
                <th className="px-3 py-3 font-medium text-gray-600 text-right">Prov. Prima No C.</th>
                <th className="px-3 py-3 font-medium text-gray-600 text-right bg-indigo-50">Total mes</th>
                <th className="px-3 py-3 font-medium text-gray-600 text-right bg-indigo-100">Total año</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(({ emp, salLegal, salNoConst, aportes, primaLegalMes, primaNoConstMes, totalMes, totalAnual }) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 font-medium text-gray-900">{emp.name}</td>
                  <td className="px-3 py-3 text-gray-600 text-xs">{emp.role}</td>
                  <td className="px-3 py-3 text-right text-gray-900">{fmtMoney(salLegal)}</td>
                  <td className="px-3 py-3 text-right text-gray-900">
                    {salNoConst > 0 ? fmtMoney(salNoConst) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-right text-orange-700 font-medium">{fmtMoney(aportes)}</td>
                  <td className="px-3 py-3 text-right text-amber-700">{fmtMoney(primaLegalMes)}</td>
                  <td className="px-3 py-3 text-right text-amber-700">
                    {primaNoConstMes > 0 ? fmtMoney(primaNoConstMes) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-indigo-700 bg-indigo-50">{fmtMoney(totalMes)}</td>
                  <td className="px-3 py-3 text-right font-bold text-indigo-800 bg-indigo-100">{fmtMoney(totalAnual)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td className="px-3 py-3 text-gray-700" colSpan={2}>TOTALES</td>
                <td className="px-3 py-3 text-right text-gray-900">{fmtMoney(grandSalarioLegal)}</td>
                <td className="px-3 py-3 text-right text-gray-900">{fmtMoney(grandSalarioNoConst)}</td>
                <td className="px-3 py-3 text-right text-orange-700">{fmtMoney(grandAportes)}</td>
                <td className="px-3 py-3 text-right text-amber-700">{fmtMoney(grandPrimaLegal)}</td>
                <td className="px-3 py-3 text-right text-amber-700">{fmtMoney(grandPrimaNoConst)}</td>
                <td className="px-3 py-3 text-right text-indigo-700 bg-indigo-50">{fmtMoney(grandTotal)}</td>
                <td className="px-3 py-3 text-right text-indigo-800 bg-indigo-100">{fmtMoney(grandTotalAnual)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════ */

function SummaryCard({ label, value, sub, accent, green }) {
  return (
    <div className={`border rounded-lg p-4 ${green ? 'bg-green-50 border-green-200' : accent ? 'bg-white border-indigo-200' : 'bg-white border-gray-200'}`}>
      <p className="text-xs text-gray-500 uppercase font-semibold">{label}</p>
      <p className={`text-lg font-bold ${green ? 'text-green-700' : accent ? 'text-indigo-700' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-green-600 mt-1">{sub}</p>}
    </div>
  )
}

function PayStatusCell({ paid, payment, emp, onPay, onRecibo }) {
  if (paid) {
    return (
      <div className="flex items-center justify-center gap-1">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <Check size={12} /> Pagado
        </span>
        <button
          onClick={() => onRecibo(payment)}
          className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
          title="Ver recibo"
        >
          <Printer size={13} />
        </button>
      </div>
    )
  }
  return (
    <button
      onClick={onPay}
      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700"
    >
      <DollarSign size={12} /> Pagar
    </button>
  )
}

/* ─── Modal pago quincena ─── */

function PagarModal({ open, emp, tipo, amount, period, onClose, registrarPago }) {
  const [method, setMethod] = useState('banco')
  const [notes, setNotes] = useState('')
  const [montoFinal, setMontoFinal] = useState(amount)

  useEffect(() => {
    setMontoFinal(amount)
  }, [amount, emp, tipo])

  if (!emp || !open) return null

  const tipoLabel = tipo === 'legal' ? 'Salario Legal' : 'Salario No Constitutivo'
  const montoValido = Number(montoFinal) > 0

  const handlePay = async () => {
    try {
      await registrarPago({
        employeeId: emp.id,
        date: todayIso(),
        tipo,
        quincena: period.quincena,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        amount: Number(montoFinal),
        method,
        notes,
      })
      toast.success(`${tipoLabel} pagado a ${emp.name}`)
      onClose()
      setNotes('')
      setMethod('banco')
    } catch (err) {
      toast.error(err.message || 'No se pudo registrar el pago')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Pagar ${tipoLabel}`}>
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <ModalRow label="Empleado" value={emp.name} bold />
          <ModalRow label="Cargo" value={emp.role} />
          <ModalRow label="Concepto" value={tipoLabel} accent />
          <ModalRow label="Período" value={`Q${period.quincena} — ${fmtDate(period.periodStart)} a ${fmtDate(period.periodEnd)}`} />
          <div className="border-t border-gray-200 pt-2 mt-2">
            <label className="text-sm font-semibold text-gray-700 block mb-1">Monto a pagar (editable)</label>
            <p className="text-xs text-gray-400 mb-1">Calculado: {fmtMoney(amount)}. Ajusta si el neto real es distinto (deducciones, ajustes, etc.)</p>
            <input
              type="number"
              value={montoFinal}
              onChange={(e) => setMontoFinal(e.target.value)}
              className="w-full text-lg font-bold text-green-700 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <PaymentFields method={method} setMethod={setMethod} notes={notes} setNotes={setNotes} />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handlePay} disabled={!montoValido}>Confirmar pago</Button>
        </div>
        <p className="text-xs text-gray-400 text-center">Este pago se registrará automáticamente como gasto en Tesorería</p>
      </div>
    </Modal>
  )
}

/* ─── Modal pago prima ─── */

function PagarPrimaModal({ open, emp, tipo, amount, sem, onClose, registrarPago }) {
  const [method, setMethod] = useState('banco')
  const [notes, setNotes] = useState('')

  if (!emp || !open || !sem) return null

  const tipoLabel = tipo === 'prima_legal' ? 'Prima Legal' : 'Prima No Constitutivo'

  const handlePay = async () => {
    try {
      await registrarPago({
        employeeId: emp.id,
        date: todayIso(),
        tipo,
        quincena: 0,
        semestre: sem.semestre,
        periodStart: sem.periodStart,
        periodEnd: sem.periodEnd,
        amount,
        method,
        notes,
      })
      toast.success(`${tipoLabel} pagada a ${emp.name}`)
      onClose()
      setNotes('')
      setMethod('banco')
    } catch (err) {
      toast.error(err.message || 'No se pudo registrar el pago')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Pagar ${tipoLabel}`}>
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <ModalRow label="Empleado" value={emp.name} bold />
          <ModalRow label="Cargo" value={emp.role} />
          <ModalRow label="Concepto" value={tipoLabel} accent />
          <ModalRow label="Semestre" value={sem.label} />
          <div className="flex justify-between text-lg border-t border-gray-200 pt-2 mt-2">
            <span className="font-semibold text-gray-700">Monto a pagar</span>
            <span className="font-bold text-green-700">{fmtMoney(amount)}</span>
          </div>
        </div>

        <PaymentFields method={method} setMethod={setMethod} notes={notes} setNotes={setNotes} />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handlePay}>Confirmar pago</Button>
        </div>
        <p className="text-xs text-gray-400 text-center">Este pago se registrará automáticamente como gasto en Tesorería</p>
      </div>
    </Modal>
  )
}

/* ─── Shared form pieces ─── */

function ModalRow({ label, value, bold, accent }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`${bold ? 'font-semibold text-gray-900' : accent ? 'font-medium text-indigo-700' : 'text-gray-700'}`}>{value}</span>
    </div>
  )
}

function PaymentFields({ method, setMethod, notes, setNotes }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Medio de pago</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="banco">Banco</option>
          <option value="efectivo">Efectivo</option>
          <option value="nequi">Nequi</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observaciones del pago..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
    </>
  )
}
