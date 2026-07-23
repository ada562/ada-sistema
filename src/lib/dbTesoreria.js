import { supabase } from './supabase'

const COLUMNS =
  'id,fecha,tipo,cuenta,monto,categoria_id,categorias(nombre),descripcion,gba_movimiento,facturado,proyecto_id,servicio_id,conciliado,created_at'

function fromRow(r, categoryNameOverride) {
  return {
    id: r.id,
    date: r.fecha,
    type: r.tipo,
    account: r.cuenta,
    amount: Number(r.monto),
    category: categoryNameOverride ?? r.categorias?.nombre ?? null,
    categoriaId: r.categoria_id,
    description: r.descripcion,
    gbaMovement: r.gba_movimiento,
    facturado: r.facturado,
    projectId: r.proyecto_id,
    serviceId: r.servicio_id,
    conciliado: r.conciliado,
    createdAt: r.created_at,
  }
}

async function getCategoriaId(tipo, nombre) {
  const { data, error } = await supabase
    .from('categorias')
    .select('id')
    .eq('tenant_id', 'ada')
    .eq('tipo', tipo)
    .eq('nombre', nombre)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

export async function getTransactions() {
  const { data, error } = await supabase
    .from('transacciones')
    .select(COLUMNS)
    .eq('tenant_id', 'ada')
    .order('fecha', { ascending: false })
  if (error) throw error
  return data.map((r) => fromRow(r))
}

export async function addTransaction(data) {
  const categoriaId = data.category ? await getCategoriaId(data.type, data.category) : null

  const { data: row, error } = await supabase.rpc('fn_registrar_transaccion', {
    p_fecha: data.date,
    p_tipo: data.type,
    p_cuenta: data.account || null,
    p_monto: data.amount,
    p_categoria_id: categoriaId,
    p_descripcion: data.description || null,
    p_proyecto_id: data.projectId || null,
    p_servicio_id: data.serviceId || null,
    p_gba_movimiento: data.gbaMovement || null,
    p_facturado: data.facturado ?? false,
  })
  if (error) throw error
  return fromRow(row, data.category)
}

export async function updateTransaction(id, data) {
  const patch = {}
  if (data.date !== undefined) patch.fecha = data.date
  if (data.type !== undefined) patch.tipo = data.type
  if (data.account !== undefined) patch.cuenta = data.account
  if (data.amount !== undefined) patch.monto = data.amount
  if (data.description !== undefined) patch.descripcion = data.description
  if (data.gbaMovement !== undefined) patch.gba_movimiento = data.gbaMovement
  if (data.facturado !== undefined) patch.facturado = data.facturado
  if (data.projectId !== undefined) patch.proyecto_id = data.projectId
  if (data.serviceId !== undefined) patch.servicio_id = data.serviceId

  if (data.category !== undefined) {
    // Algunas categorias (ej. 'GBA') existen tanto en ingreso como en gasto con
    // id distinto -- si el llamador no manda `type` (ej. GBA.jsx), se resuelve
    // primero el tipo actual de la fila para no guardar un categoria_id ambiguo.
    let tipo = data.type
    if (!tipo) {
      const { data: current, error: curError } = await supabase
        .from('transacciones')
        .select('tipo')
        .eq('id', id)
        .single()
      if (curError) throw curError
      tipo = current.tipo
    }
    patch.categoria_id = await getCategoriaId(tipo, data.category)
  }

  const { error } = await supabase.from('transacciones').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from('transacciones').delete().eq('id', id)
  if (error) throw error
}

export async function setConciliado(id, conciliado) {
  const { error } = await supabase.from('transacciones').update({ conciliado }).eq('id', id)
  if (error) throw error
}

export async function getAccountBalances() {
  const { data, error } = await supabase
    .from('vw_saldos_cuentas')
    .select('codigo,saldo')
    .eq('tenant_id', 'ada')
  if (error) throw error

  const balances = { banco: 0, efectivo: 0, nequi: 0 }
  for (const row of data) {
    if (row.codigo in balances) balances[row.codigo] = Number(row.saldo)
  }
  return balances
}
