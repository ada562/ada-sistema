import { supabase } from './supabase'

const BUCKET = 'empleados-documentos'
const COLUMNS = 'id,empleado_id,tipo,nombre_archivo,storage_path,tamano_bytes,created_at'

export const TIPOS_DOCUMENTO = [
  { value: 'cedula', label: 'Cédula' },
  { value: 'hoja_vida', label: 'Hoja de vida' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'certificados', label: 'Certificados' },
  { value: 'otro', label: 'Otro' },
]

function fromRow(r) {
  return {
    id: r.id,
    empleadoId: r.empleado_id,
    tipo: r.tipo,
    fileName: r.nombre_archivo,
    storagePath: r.storage_path,
    sizeBytes: r.tamano_bytes || 0,
    createdAt: r.created_at,
  }
}

function sanitizeFileName(name) {
  return name.replace(/\s+/g, '_').replace(/[^\w.\-]/g, '')
}

export async function getDocumentos() {
  const { data, error } = await supabase
    .from('empleado_documentos')
    .select(COLUMNS)
    .eq('tenant_id', 'ada')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(fromRow)
}

export async function uploadDocumento(empleadoId, tipo, file) {
  const path = `${empleadoId}/${tipo}/${Date.now()}_${sanitizeFileName(file.name)}`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file)
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('empleado_documentos')
    .insert({
      tenant_id: 'ada',
      empleado_id: empleadoId,
      tipo,
      nombre_archivo: file.name,
      storage_path: path,
      tamano_bytes: file.size,
    })
    .select(COLUMNS)
    .single()

  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }
  return fromRow(data)
}

export async function deleteDocumento(id, storagePath) {
  const { error } = await supabase.from('empleado_documentos').delete().eq('id', id)
  if (error) throw error
  await supabase.storage.from(BUCKET).remove([storagePath])
}

export async function getDocumentoUrl(storagePath) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60)
  if (error) throw error
  return data.signedUrl
}
