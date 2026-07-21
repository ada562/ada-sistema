import { useEffect, useRef, useState } from 'react'
import { Download, Trash2, Upload, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useDocumentosStore } from '../../store/useDocumentosStore'
import { TIPOS_DOCUMENTO } from '../../lib/dbDocumentos'

const MAX_SIZE_BYTES = 15 * 1024 * 1024 // 15MB
const ACCEPTED = '.pdf,.jpg,.jpeg,.png'

function fmtSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentosEmpleado({ empleadoId }) {
  const { documentos, fetchAll, initRealtime, teardownRealtime, getByEmpleado, upload, remove, getUrl } = useDocumentosStore()
  const [uploadingTipo, setUploadingTipo] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const fileInputs = useRef({})

  useEffect(() => {
    fetchAll()
    initRealtime()
    return () => teardownRealtime()
  }, [fetchAll, initRealtime, teardownRealtime])

  const docs = getByEmpleado(empleadoId)

  const handlePick = (tipo) => fileInputs.current[tipo]?.click()

  const handleFile = async (tipo, e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('El archivo supera el límite de 15MB')
      return
    }
    setUploadingTipo(tipo)
    try {
      await upload(empleadoId, tipo, file)
      toast.success('Documento subido')
    } catch (err) {
      toast.error(err.message || 'No se pudo subir el documento')
    } finally {
      setUploadingTipo(null)
    }
  }

  const handleDownload = async (doc) => {
    try {
      const url = await getUrl(doc.storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(err.message || 'No se pudo abrir el documento')
    }
  }

  const handleDelete = async (doc) => {
    if (!window.confirm(`¿Eliminar "${doc.fileName}"? Esta acción no se puede deshacer.`)) return
    setDeletingId(doc.id)
    try {
      await remove(doc.id, doc.storagePath)
      toast.success('Documento eliminado')
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el documento')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {TIPOS_DOCUMENTO.map(({ value: tipo, label }) => {
        const files = docs.filter((d) => d.tipo === tipo)
        return (
          <div key={tipo}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
              <button
                onClick={() => handlePick(tipo)}
                disabled={uploadingTipo === tipo}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
              >
                <Upload size={12} /> {uploadingTipo === tipo ? 'Subiendo...' : 'Subir'}
              </button>
              <input
                ref={(el) => (fileInputs.current[tipo] = el)}
                type="file"
                accept={ACCEPTED}
                className="hidden"
                onChange={(e) => handleFile(tipo, e)}
              />
            </div>
            {files.length === 0 ? (
              <p className="text-sm text-gray-400 py-1">Sin archivos</p>
            ) : (
              <ul className="space-y-1">
                {files.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={14} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{doc.fileName}</span>
                      <span className="text-xs text-gray-400 shrink-0">{fmtSize(doc.sizeBytes)}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleDownload(doc)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50" title="Descargar">
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={deletingId === doc.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
