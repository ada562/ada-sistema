import payrollData from '../../firebase_export/payrollPayments.json'
import { addTransaction } from './dbTesoreria'
import { load, save } from './storage'

let payments = load('ada_payroll', payrollData)

export function getPayrollPayments() {
  return payments
}

export function getPayrollByEmployee(employeeId) {
  return payments.filter((p) => p.employeeId === employeeId)
}

export function getPayrollByPeriod(periodStart, periodEnd) {
  return payments.filter((p) => p.periodStart === periodStart && p.periodEnd === periodEnd)
}

const tipoLabels = {
  legal: 'Salario Legal',
  no_constitutivo: 'Salario No Constitutivo',
  prima_legal: 'Prima Legal',
  prima_no_constitutivo: 'Prima No Constitutivo',
}

/**
 * Registra un pago de nómina y crea el gasto en Tesorería automáticamente.
 * tipo: 'legal' | 'no_constitutivo' | 'prima_legal' | 'prima_no_constitutivo'
 */
export function registrarPagoNomina(data) {
  const id = 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

  const payment = {
    id,
    employeeId: data.employeeId,
    employeeName: data.employeeName,
    employeeRole: data.employeeRole,
    date: data.date,
    tipo: data.tipo,
    quincena: Number(data.quincena) || 0,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    semestre: data.semestre || null,
    amount: Number(data.amount) || 0,
    method: data.method || 'banco',
    notes: data.notes || '',
  }

  payments = [payment, ...payments]
  save('ada_payroll', payments)

  // Sincronizar con Tesorería como gasto
  const label = tipoLabels[data.tipo] || data.tipo
  const periodInfo = data.semestre
    ? `Semestre ${data.semestre}`
    : `Q${data.quincena}`
  addTransaction({
    date: data.date,
    type: 'gasto',
    account: data.method || 'banco',
    amount: payment.amount,
    category: 'Nómina',
    description: `${label} — ${data.employeeName} (${data.employeeRole}) — ${periodInfo}`,
    projectId: null,
    nominaPaymentId: id,
  })

  return payment
}

export function deletePayrollPayment(id) {
  payments = payments.filter((p) => p.id !== id)
  save('ada_payroll', payments)
}
