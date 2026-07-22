import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { ClipboardX, Check, X as XIcon } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { useEmpleadosStore } from '../../store/useEmpleadosStore'
import { usePermisosAusenciaStore } from '../../store/usePermisosAusenciaStore'
import { fmtDate } from '../../lib/formatters'
import Modal from '../../components/UI/Modal'
import Button from '../../components/UI/Button'

const MOTIVOS = ['Salud', 'Personal']
const DIAS_ANTICIPACION = 15

function minFechaInicio() {
  const d = new Date()
  d.setDate(d.getDate() + DIAS_ANTICIPACION)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const ESTADO_BADGE = {
  Pendiente: 'bg-amber-50 text-amber-700',
  Aprobado: 'bg-green-50 text-green-700',
  Rechazado: 'bg-red-50 text-red-600',
}

export default function Permisos() {
  const perfil = useAuthStore((s) => s.perfil)
  const isAdmin = perfil?.rol === 'admin'

  const { employees, fetchAll: fetchEmpleados, initRealtime: initEmpleadosRealtime, teardownRealtime: teardownEmpleadosRealtime } = useEmpleadosStore()
  const {
    solicitudes,
    loading,
    fetchAll,
    crearSolicitud,
    resolver,
    initRealtime,
    teardownRealtime,
  } = usePermisosAusenciaStore()

  useEffect(() => {
    fetchAll()
    initRealtime()
    fetchEmpleados()
    initEmpleadosRealtime()
    return () => {
      teardownRealtime()
      teardownEmpleadosRealtime()
    }
  }, [fetchAll, initRealtime, teardownRealtime, fetchEmpleados, initEmpleadosRealtime, teardownEmpleadosRealtime])

  const miEmpleado = !isAdmin ? employees[0] || null : null

  const getEmpleadoNombre = (empleadoId) => employees.find((e) => e.id === empleadoId)?.name || 'Empleado'

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ClipboardX size={24} className="text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-900">Permisos</h2>
      </div>

      {isAdmin ? (
        <AprobacionPanel
          solicitudes={solicitudes}
          loading={loading}
          resolver={resolver}
          getEmpleadoNombre={getEmpleadoNombre}
        />
      ) : (
        <SolicitudPanel
          miEmpleado={miEmpleado}
          solicitudes={solicitudes}
          loading={loading}
          crearSolicitud={crearSolicitud}
        />
      )}
    </div>
  )
}

/* ─── Vista empleado: formulario + mis solicitudes ─── */

function SolicitudPanel({ miEmpleado, solicitudes, loading, crearSolicitud }) {
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [motivo, setMotivo] = useState('Salud')
  const [descripcion, setDescripcion] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const misSolicitudes = useMemo(
    () => solicitudes.filter((s) => s.employeeId === miEmpleado?.id),
    [solicitudes, miEmpleado]
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!miEmpleado) return
    if (!fechaInicio || !fechaFin) {
      toast.error('Completa las fechas de inicio y fin')
      return
    }
    if (fechaInicio < minFechaInicio()) {
      toast.error(`La fecha de inicio debe tener al menos ${DIAS_ANTICIPACION} días de anticipación`)
      return
    }
    if (fechaFin < fechaInicio) {
      toast.error('La fecha de fin no puede ser anterior a la de inicio')
      return
    }
    setSubmitting(true)
    try {
      await crearSolicitud({ employeeId: miEmpleado.id, fechaInicio, fechaFin, motivo, descripcion })
      toast.success('Solicitud enviada')
      setFechaInicio('')
      setFechaFin('')
      setDescripcion('')
    } catch (err) {
      toast.error('No se pudo enviar la solicitud: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!miEmpleado) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500 text-sm">
        No se encontró tu registro de empleado vinculado a esta cuenta. Contacta a RRHH.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Solicitar permiso</h3>
        <p className="text-xs text-gray-500 mb-4">
          Debes solicitar con mínimo {DIAS_ANTICIPACION} días de anticipación. Al aprobarse, se registra automáticamente en tu bitácora.
        </p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
            <input
              type="date"
              min={minFechaInicio()}
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
            <input
              type="date"
              min={fechaInicio || minFechaInicio()}
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar solicitud'}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Mis solicitudes</h3>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : misSolicitudes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Sin solicitudes registradas</p>
        ) : (
          <div className="space-y-2">
            {misSolicitudes.map((s) => (
              <div key={s.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-gray-900">{fmtDate(s.fechaInicio)} – {fmtDate(s.fechaFin)}</span>
                  <span className="text-gray-500 ml-2">{s.motivo}</span>
                  {s.descripcion && <p className="text-xs text-gray-400 mt-0.5">{s.descripcion}</p>}
                  {s.estado === 'Rechazado' && s.notasAdmin && (
                    <p className="text-xs text-red-500 mt-0.5">Motivo de rechazo: {s.notasAdmin}</p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${ESTADO_BADGE[s.estado]}`}>{s.estado}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Vista admin: aprobar/rechazar solicitudes ─── */

function AprobacionPanel({ solicitudes, loading, resolver, getEmpleadoNombre }) {
  const [rechazarId, setRechazarId] = useState(null)
  const [notasRechazo, setNotasRechazo] = useState('')
  const [busyId, setBusyId] = useState(null)

  const pendientes = useMemo(() => solicitudes.filter((s) => s.estado === 'Pendiente'), [solicitudes])
  const resueltas = useMemo(() => solicitudes.filter((s) => s.estado !== 'Pendiente'), [solicitudes])

  const handleAprobar = async (id) => {
    setBusyId(id)
    try {
      await resolver(id, 'Aprobado', null)
      toast.success('Permiso aprobado y registrado en la bitácora del empleado')
    } catch (err) {
      toast.error('No se pudo aprobar: ' + err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleRechazar = async () => {
    setBusyId(rechazarId)
    try {
      await resolver(rechazarId, 'Rechazado', notasRechazo)
      toast.success('Solicitud rechazada')
      setRechazarId(null)
      setNotasRechazo('')
    } catch (err) {
      toast.error('No se pudo rechazar: ' + err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Pendientes de aprobación</h3>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : pendientes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Sin solicitudes pendientes</p>
        ) : (
          <div className="space-y-2">
            {pendientes.map((s) => (
              <div key={s.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-gray-900">{getEmpleadoNombre(s.employeeId)}</span>
                  <span className="text-gray-500 ml-2">{fmtDate(s.fechaInicio)} – {fmtDate(s.fechaFin)} · {s.motivo}</span>
                  {s.descripcion && <p className="text-xs text-gray-400 mt-0.5">{s.descripcion}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleAprobar(s.id)}
                    disabled={busyId === s.id}
                    className="p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                    title="Aprobar"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => { setRechazarId(s.id); setNotasRechazo('') }}
                    disabled={busyId === s.id}
                    className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                    title="Rechazar"
                  >
                    <XIcon size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Historial</h3>
        {resueltas.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Sin solicitudes resueltas</p>
        ) : (
          <div className="space-y-2">
            {resueltas.map((s) => (
              <div key={s.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-gray-900">{getEmpleadoNombre(s.employeeId)}</span>
                  <span className="text-gray-500 ml-2">{fmtDate(s.fechaInicio)} – {fmtDate(s.fechaFin)} · {s.motivo}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${ESTADO_BADGE[s.estado]}`}>{s.estado}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={rechazarId !== null} onClose={() => setRechazarId(null)} title="Rechazar solicitud">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo del rechazo (opcional)</label>
            <textarea
              value={notasRechazo}
              onChange={(e) => setNotasRechazo(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRechazarId(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleRechazar} disabled={busyId === rechazarId}>
              {busyId === rechazarId ? 'Rechazando...' : 'Rechazar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
