import { supabase } from './supabase'

const CATEGORIA_COLUMNS =
  'id,proyecto_id,servicio_id,grupo,nombre,modo,acompanamiento_pct,orden,created_at,presupuesto_items(id,categoria_id,descripcion,cantidad,costo_unitario,costo_original,costo_ada,proveedor,personal,estado,porcentaje_avance,fecha_probable_fin,anotaciones,orden,created_at)'

function itemFromRow(r) {
  return {
    id: r.id,
    categoriaId: r.categoria_id,
    description: r.descripcion,
    quantity: Number(r.cantidad) || 0,
    unitCost: Number(r.costo_unitario) || 0,
    originalCost: r.costo_original === null ? null : Number(r.costo_original),
    adaCost: r.costo_ada === null ? null : Number(r.costo_ada),
    provider: r.proveedor,
    personal: r.personal,
    status: r.estado,
    progressPct: r.porcentaje_avance === null ? null : Number(r.porcentaje_avance),
    probableEndDate: r.fecha_probable_fin,
    notes: r.anotaciones,
    order: r.orden,
    createdAt: r.created_at,
  }
}

function categoriaFromRow(r) {
  return {
    id: r.id,
    projectId: r.proyecto_id,
    serviceId: r.servicio_id,
    group: r.grupo,
    name: r.nombre,
    mode: r.modo,
    acompanamientoPct: Number(r.acompanamiento_pct) || 0,
    order: r.orden,
    createdAt: r.created_at,
    items: (r.presupuesto_items || [])
      .map(itemFromRow)
      .sort((a, b) => a.order - b.order),
  }
}

export async function getCategoriasByProject(projectId) {
  const { data, error } = await supabase
    .from('presupuesto_categorias')
    .select(CATEGORIA_COLUMNS)
    .eq('tenant_id', 'ada')
    .eq('proyecto_id', projectId)
    .order('orden', { ascending: true })
  if (error) throw error
  return data.map(categoriaFromRow)
}

export async function addCategoria(data) {
  const { data: row, error } = await supabase
    .from('presupuesto_categorias')
    .insert({
      tenant_id: 'ada',
      proyecto_id: data.projectId,
      servicio_id: data.serviceId || null,
      grupo: data.group || null,
      nombre: data.name || '',
      modo: data.mode || 'obra',
      acompanamiento_pct: Number(data.acompanamientoPct) ?? 10,
      orden: data.order || 0,
    })
    .select(CATEGORIA_COLUMNS)
    .single()
  if (error) throw error
  return categoriaFromRow(row)
}

export async function updateCategoria(id, data) {
  const { error } = await supabase
    .from('presupuesto_categorias')
    .update({
      grupo: data.group || null,
      nombre: data.name || '',
      modo: data.mode || 'obra',
      acompanamiento_pct: Number(data.acompanamientoPct) ?? 10,
      orden: data.order || 0,
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteCategoria(id) {
  const { error } = await supabase.from('presupuesto_categorias').delete().eq('id', id)
  if (error) throw error
}

export async function addItem(data) {
  const { error } = await supabase.from('presupuesto_items').insert({
    tenant_id: 'ada',
    categoria_id: data.categoriaId,
    descripcion: data.description || '',
    cantidad: Number(data.quantity) || 1,
    costo_unitario: Number(data.unitCost) || 0,
    costo_original: data.originalCost === '' || data.originalCost == null ? null : Number(data.originalCost),
    costo_ada: data.adaCost === '' || data.adaCost == null ? null : Number(data.adaCost),
    proveedor: data.provider || null,
    personal: data.personal || null,
    estado: data.status || 'Pendiente',
    porcentaje_avance: data.progressPct === '' || data.progressPct == null ? null : Number(data.progressPct),
    fecha_probable_fin: data.probableEndDate || null,
    anotaciones: data.notes || null,
    orden: data.order || 0,
  })
  if (error) throw error
}

export async function updateItem(id, data) {
  const { error } = await supabase
    .from('presupuesto_items')
    .update({
      descripcion: data.description || '',
      cantidad: Number(data.quantity) || 1,
      costo_unitario: Number(data.unitCost) || 0,
      costo_original: data.originalCost === '' || data.originalCost == null ? null : Number(data.originalCost),
      costo_ada: data.adaCost === '' || data.adaCost == null ? null : Number(data.adaCost),
      proveedor: data.provider || null,
      personal: data.personal || null,
      estado: data.status || 'Pendiente',
      porcentaje_avance: data.progressPct === '' || data.progressPct == null ? null : Number(data.progressPct),
      fecha_probable_fin: data.probableEndDate || null,
      anotaciones: data.notes || null,
      orden: data.order || 0,
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteItem(id) {
  const { error } = await supabase.from('presupuesto_items').delete().eq('id', id)
  if (error) throw error
}
