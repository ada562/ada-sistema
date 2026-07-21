import { supabase } from './supabase'

const CONTRATISTA_COLUMNS = 'id,nombre,telefono,email,activo,notas,created_at'
const PAGO_COLUMNS = 'id,contratista_id,fecha,fecha_abono,fecha_pago_total,monto,monto_pagado,descripcion,created_at'

function contratistaFromRow(r) {
  return {
    id: r.id,
    name: r.nombre,
    phone: r.telefono,
    email: r.email,
    active: r.activo,
    notes: r.notas,
    createdAt: r.created_at,
  }
}

function pagoFromRow(r) {
  return {
    id: r.id,
    contractorId: r.contratista_id,
    date: r.fecha,
    dateAbono: r.fecha_abono,
    datePagoTotal: r.fecha_pago_total,
    amount: Number(r.monto),
    paidAmount: Number(r.monto_pagado),
    description: r.descripcion,
    createdAt: r.created_at,
  }
}

/* ─── Contratistas ─── */

export async function getContratistas() {
  const { data, error } = await supabase
    .from('contratistas')
    .select(CONTRATISTA_COLUMNS)
    .eq('tenant_id', 'ada')
    .order('nombre', { ascending: true })
  if (error) throw error
  return data.map(contratistaFromRow)
}

export async function addContratista(data) {
  const { data: row, error } = await supabase
    .from('contratistas')
    .insert({
      tenant_id: 'ada',
      nombre: data.name || '',
      telefono: data.phone || '',
      email: data.email || '',
      activo: data.active !== false,
      notas: data.notes || '',
    })
    .select(CONTRATISTA_COLUMNS)
    .single()
  if (error) throw error
  return contratistaFromRow(row)
}

export async function updateContratista(id, data) {
  const { error } = await supabase
    .from('contratistas')
    .update({
      nombre: data.name || '',
      telefono: data.phone || '',
      email: data.email || '',
      activo: data.active !== false,
      notas: data.notes || '',
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteContratista(id) {
  const { error } = await supabase.from('contratistas').delete().eq('id', id)
  if (error) throw error
}

/* ─── Pagos / Cuentas de cobro ─── */

export async function getContractorPayments() {
  const { data, error } = await supabase
    .from('pagos_contratistas')
    .select(PAGO_COLUMNS)
    .eq('tenant_id', 'ada')
    .order('fecha', { ascending: false })
  if (error) throw error
  return data.map(pagoFromRow)
}

export async function addContractorPayment(data) {
  const { data: row, error } = await supabase
    .from('pagos_contratistas')
    .insert({
      tenant_id: 'ada',
      contratista_id: data.contractorId,
      fecha: data.date || null,
      fecha_abono: data.dateAbono || null,
      fecha_pago_total: data.datePagoTotal || null,
      monto: Number(data.amount) || 0,
      monto_pagado: Number(data.paidAmount) || 0,
      descripcion: data.description || '',
    })
    .select(PAGO_COLUMNS)
    .single()
  if (error) throw error
  return pagoFromRow(row)
}

export async function updateContractorPayment(id, data) {
  const { error } = await supabase
    .from('pagos_contratistas')
    .update({
      fecha: data.date || null,
      fecha_abono: data.dateAbono || null,
      fecha_pago_total: data.datePagoTotal || null,
      monto: Number(data.amount) || 0,
      descripcion: data.description || '',
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteContractorPayment(id) {
  const { error } = await supabase.from('pagos_contratistas').delete().eq('id', id)
  if (error) throw error
}

/**
 * Registra un abono a un pago de contratista y sincroniza con Tesorería,
 * de forma atómica (RPC fn_registrar_abono_contratista, migración 006).
 */
export async function registrarAbono(paymentId, abonoData) {
  const { data, error } = await supabase.rpc('fn_registrar_abono_contratista', {
    p_pago_id: paymentId,
    p_monto: Number(abonoData.amount) || 0,
    p_fecha: abonoData.date || new Date().toISOString().slice(0, 10),
    p_metodo: abonoData.method || 'banco',
  })
  if (error) throw error
  return pagoFromRow(data)
}
