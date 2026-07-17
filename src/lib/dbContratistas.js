import contractorsData from '../../firebase_export/contractors.json'
import contractorPaymentsData from '../../firebase_export/contractorPayments.json'
import { addTransaction } from './dbTesoreria'
import { load, save } from './storage'

let contractors = load('ada_contractors', contractorsData)
let payments = load('ada_contractor_payments', contractorPaymentsData)

/* ─── Contratistas ─── */

export function getContratistas() {
  return contractors
}

export function getContratistaById(id) {
  return contractors.find((c) => c.id === id) || null
}

export function addContratista(data) {
  const id = 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  const c = {
    id,
    name: data.name || '',
    phone: data.phone || '',
    email: data.email || '',
    active: data.active !== false,
    notes: data.notes || '',
  }
  contractors = [c, ...contractors]
  save('ada_contractors', contractors)
  return c
}

export function updateContratista(id, data) {
  contractors = contractors.map((c) =>
    c.id === id ? { ...c, name: data.name || '', phone: data.phone || '', email: data.email || '', active: data.active !== false, notes: data.notes || '' } : c
  )
  save('ada_contractors', contractors)
  return contractors.find((c) => c.id === id)
}

export function deleteContratista(id) {
  contractors = contractors.filter((c) => c.id !== id)
  save('ada_contractors', contractors)
}

/* ─── Pagos / Cuentas de cobro ─── */

export function getContractorPayments() {
  return payments
}

export function getPaymentsByContractor(contractorId) {
  return payments.filter((p) => p.contractorId === contractorId)
}

export function addContractorPayment(data) {
  const id = 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  const p = {
    id,
    contractorId: data.contractorId,
    date: data.date || '',
    dateAbono: data.dateAbono || '',
    datePagoTotal: data.datePagoTotal || '',
    amount: Number(data.amount) || 0,
    paidAmount: Number(data.paidAmount) || 0,
    description: data.description || '',
  }
  payments = [p, ...payments]
  save('ada_contractor_payments', payments)
  return p
}

export function updateContractorPayment(id, data) {
  payments = payments.map((p) =>
    p.id === id
      ? {
          ...p,
          date: data.date || p.date,
          dateAbono: data.dateAbono || '',
          datePagoTotal: data.datePagoTotal || '',
          amount: Number(data.amount) || 0,
          paidAmount: Number(data.paidAmount) || 0,
          description: data.description || '',
        }
      : p
  )
  save('ada_contractor_payments', payments)
  return payments.find((p) => p.id === id)
}

export function deleteContractorPayment(id) {
  payments = payments.filter((p) => p.id !== id)
  save('ada_contractor_payments', payments)
}

/**
 * Registra un abono a un pago de contratista y sincroniza con Tesorería.
 */
export function registrarAbono(paymentId, abonoData) {
  const payment = payments.find((p) => p.id === paymentId)
  if (!payment) return null

  const abono = Number(abonoData.amount) || 0
  const newPaid = payment.paidAmount + abono
  const today = abonoData.date || new Date().toISOString().slice(0, 10)

  payments = payments.map((p) =>
    p.id === paymentId
      ? {
          ...p,
          paidAmount: newPaid,
          dateAbono: today,
          datePagoTotal: newPaid >= p.amount ? today : p.datePagoTotal,
        }
      : p
  )
  save('ada_contractor_payments', payments)

  // Registrar gasto en Tesorería
  const contractor = getContratistaById(payment.contractorId)
  addTransaction({
    date: today,
    type: 'gasto',
    account: abonoData.method || 'banco',
    amount: abono,
    category: 'CONTRATISTAS',
    description: `Pago a ${contractor?.name || 'Contratista'} — ${payment.description}`,
    projectId: null,
  })

  return payments.find((p) => p.id === paymentId)
}

/**
 * Resumen financiero de un contratista.
 */
export function getContratistaResumen(contractorId) {
  const cPayments = getPaymentsByContractor(contractorId)
  const totalFacturado = cPayments.reduce((s, p) => s + p.amount, 0)
  const totalPagado = cPayments.reduce((s, p) => s + p.paidAmount, 0)
  const pendiente = totalFacturado - totalPagado
  return { totalFacturado, totalPagado, pendiente, totalCuentas: cPayments.length }
}
