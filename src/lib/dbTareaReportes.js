import { supabase } from './supabase'

const BUCKET = 'tarea-reportes'
const COLUMNS = 'id,tarea_id,empleado_id,descripcion,tipo_adjunto,storage_path,nombre_archivo,tamano_bytes,created_at'

function fromRow(r) {
  return {
    id: r.id,
    tareaId: r.tarea_id,
    empleadoId: r.empleado_id,
    descripcion: r.descripcion || '',
    tipoAdjunto: r.tipo_adjunto,
    storagePath: r.storage_path,
    fileName: r.nombre_archivo,
    sizeBytes: r.tamano_bytes || 0,
    createdAt: r.created_at,
  }
}

function sanitizeFileName(name) {
  return name.replace(/\s+/g, '_').replace(/[^\w.\-]/g, '')
}

export async function getTareaReportes() {
  const { data, error } = await supabase
    .from('tarea_reportes')
    .select(COLUMNS)
    .eq('tenant_id', 'ada')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(fromRow)
}

export async function crearTareaReporte({ tareaId, empleadoId, descripcion, tipoAdjunto, file }) {
  let storagePath = null
  if (file) {
    storagePath = `${tareaId}/${Date.now()}_${sanitizeFileName(file.name)}`
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file)
    if (uploadError) throw uploadError
  }

  const { data, error } = await supabase
    .from('tarea_reportes')
    .insert({
      tenant_id: 'ada',
      tarea_id: tareaId,
      empleado_id: empleadoId,
      descripcion: descripcion || null,
      tipo_adjunto: file ? tipoAdjunto : null,
      storage_path: storagePath,
      nombre_archivo: file ? file.name : null,
      tamano_bytes: file ? file.size : null,
    })
    .select(COLUMNS)
    .single()

  if (error) {
    if (storagePath) await supabase.storage.from(BUCKET).remove([storagePath])
    throw error
  }
  return fromRow(data)
}

export async function eliminarTareaReporte(id, storagePath) {
  const { error } = await supabase.from('tarea_reportes').delete().eq('id', id)
  if (error) throw error
  if (storagePath) await supabase.storage.from(BUCKET).remove([storagePath])
}

export async function getTareaReporteUrl(storagePath) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60)
  if (error) throw error
  return data.signedUrl
}
