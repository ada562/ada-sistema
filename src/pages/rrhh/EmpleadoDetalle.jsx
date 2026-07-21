import { useState, useEffect } from 'react'
import { ArrowLeft, User, Pencil, Trash2, Phone, Mail, MapPin, Shield, FileText, CheckCircle, XCircle, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../../components/UI/Button'
import Modal from '../../components/UI/Modal'
import FormEmpleado from '../../components/equipo/FormEmpleado'
import { useNavigationStore } from '../../store/useNavigationStore'
import { useEmpleadosStore } from '../../store/useEmpleadosStore'
import { useAuthStore } from '../../store/useAuthStore'
import { getAge, getDailyRate, setEmpleadoPassword } from '../../lib/dbEmpleados'
import { fmtMoney, fmtDate } from '../../lib/formatters'

const statusColors = {
  Activo: 'bg-green-100 text-green-700',
  Vacaciones: 'bg-blue-100 text-blue-700',
  Incapacidad: 'bg-yellow-100 text-yellow-700',
  Retirado: 'bg-gray-100 text-gray-500',
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex justify-between py-2 border-b border-gray-50">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

function SectionCard({ title, icon: Icon, color, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Icon size={16} className={color} />
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

function DocStatus({ label, ok }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {ok
        ? <CheckCircle size={14} className="text-green-500" />
        : <XCircle size={14} className="text-red-400" />
      }
      <span className={`text-sm ${ok ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
    </div>
  )
}

export default function EmpleadoDetalle() {
  const { viewParam, setActiveView } = useNavigationStore()
  const { openModal, deleteEmployee, employees, getEmpleadoById } = useEmpleadosStore()
  const emp = getEmpleadoById(viewParam)
  const supervisorName = emp?.supervisor ? employees.find((e) => e.id === emp.supervisor)?.name || '—' : null

  // Cambio de contrasena de portal: capacidad exclusiva de admin (no es un
  // permiso de modulo normal via usePermission -- es la misma restriccion
  // que ya aplica el server en api/admin/set-empleado-password.js).
  const { session, perfil } = useAuthStore()
  const isAdmin = perfil?.rol === 'admin'
  const [passwordModal, setPasswordModal] = useState(false)

  const [dailyRate, setDailyRate] = useState(0)

  useEffect(() => {
    if (!emp) return
    let cancelled = false
    getDailyRate(emp).then((rate) => {
      if (!cancelled) setDailyRate(rate)
    })
    return () => { cancelled = true }
  }, [emp])

  if (!emp) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Empleado no encontrado</p>
        <Button variant="ghost" onClick={() => setActiveView('equipo')} className="mt-4">Volver al equipo</Button>
      </div>
    )
  }

  const age = getAge(emp.birthDate)

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar a "${emp.name}"?`)) return
    try {
      await deleteEmployee(emp.id)
      toast.success('Empleado eliminado')
      setActiveView('equipo')
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el empleado')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveView('equipo')} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
            {emp.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{emp.name}</h2>
            <p className="text-sm text-gray-500">
              {emp.role || 'Sin cargo'}
              {emp.department && ` · ${emp.department}`}
            </p>
          </div>
          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[emp.status] || 'bg-gray-100 text-gray-600'}`}>
            {emp.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && emp.userId && (
            <Button variant="outline" size="sm" onClick={() => setPasswordModal(true)}>
              <KeyRound size={14} /> Cambiar contraseña
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => openModal(emp)}>
            <Pencil size={14} /> Editar
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 size={14} /> Eliminar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Información personal */}
        <SectionCard title="Información personal" icon={User} color="text-indigo-500">
          <InfoRow label="Cédula" value={emp.cedula} />
          <InfoRow label="Fecha de nacimiento" value={emp.birthDate ? `${fmtDate(emp.birthDate)}${age !== null ? ` (${age} años)` : ''}` : null} />
          <InfoRow label="Género" value={emp.gender} />
          <InfoRow label="Estado civil" value={emp.civilStatus} />
          {!emp.cedula && !emp.birthDate && !emp.gender && !emp.civilStatus && (
            <p className="text-sm text-gray-400 py-2">Sin información personal registrada</p>
          )}
        </SectionCard>

        {/* Contacto */}
        <SectionCard title="Información de contacto" icon={Phone} color="text-blue-500">
          <InfoRow label="Celular" value={emp.phone} />
          <InfoRow label="Correo" value={emp.email} />
          <InfoRow label="Dirección" value={emp.address} />
          <InfoRow label="Ciudad" value={emp.city} />
          {!emp.phone && !emp.email && (
            <p className="text-sm text-gray-400 py-2">Sin información de contacto</p>
          )}
        </SectionCard>

        {/* Contacto de emergencia */}
        <SectionCard title="Contacto de emergencia" icon={Shield} color="text-red-500">
          {emp.emergencyName ? (
            <>
              <InfoRow label="Nombre" value={emp.emergencyName} />
              <InfoRow label="Parentesco" value={emp.emergencyRelation} />
              <InfoRow label="Teléfono" value={emp.emergencyPhone} />
              <InfoRow label="Dirección" value={emp.emergencyAddress} />
            </>
          ) : (
            <p className="text-sm text-gray-400 py-2">Sin contacto de emergencia registrado</p>
          )}
        </SectionCard>

        {/* Información laboral */}
        <SectionCard title="Información laboral" icon={FileText} color="text-green-500">
          <InfoRow label="Cargo" value={emp.role} />
          <InfoRow label="Área" value={emp.department} />
          <InfoRow label="Jefe inmediato" value={supervisorName} />
          <InfoRow label="Fecha de ingreso" value={emp.startDate ? fmtDate(emp.startDate) : null} />
          <InfoRow label="Tipo de contrato" value={emp.contractType} />
          <InfoRow label="Vencimiento contrato" value={emp.contractUntil ? fmtDate(emp.contractUntil) : null} />
          <InfoRow label="Salario mensual" value={emp.monthlyRate ? fmtMoney(emp.monthlyRate) : null} />
          <InfoRow label="Salario no constitutivo" value={emp.nonConstitutiveSalary ? fmtMoney(emp.nonConstitutiveSalary) : null} />
          <InfoRow label="Tarifa día" value={dailyRate > 0 ? fmtMoney(dailyRate) : null} />
        </SectionCard>

        {/* Seguridad social */}
        <SectionCard title="Seguridad social" icon={Shield} color="text-purple-500">
          <InfoRow label="EPS" value={emp.eps} />
          <InfoRow label="Fondo de pensión" value={emp.pension} />
          <InfoRow label="ARL" value={emp.arl} />
          <InfoRow label="Caja de compensación" value={emp.cajaCompensacion} />
          {!emp.eps && !emp.pension && !emp.arl && !emp.cajaCompensacion && (
            <p className="text-sm text-gray-400 py-2">Sin información de seguridad social</p>
          )}
        </SectionCard>

        {/* Documentos */}
        <SectionCard title="Documentos" icon={FileText} color="text-orange-500">
          <DocStatus label="Copia de cédula" ok={emp.docCedula} />
          <DocStatus label="Hoja de vida" ok={emp.docHojaVida} />
          <DocStatus label="Contrato" ok={emp.docContrato} />
          <DocStatus label="Certificados" ok={emp.docCertificados} />
        </SectionCard>
      </div>

      <FormEmpleado />

      {isAdmin && emp.userId && (
        <CambiarPasswordModal
          open={passwordModal}
          onClose={() => setPasswordModal(false)}
          empleadoId={emp.id}
          empleadoNombre={emp.name}
          accessToken={session?.access_token}
        />
      )}
    </div>
  )
}

/* ─── Modal: Cambiar contraseña de portal (solo admin) ─── */

function CambiarPasswordModal({ open, onClose, empleadoId, empleadoNombre, accessToken }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleClose = () => {
    setPassword('')
    setConfirmPassword('')
    onClose()
  }

  const handleSave = async () => {
    if (password.length < 8) return toast.error('La contraseña debe tener al menos 8 caracteres')
    if (password !== confirmPassword) return toast.error('Las contraseñas no coinciden')

    setSaving(true)
    try {
      await setEmpleadoPassword(empleadoId, password, accessToken)
      toast.success(`Contraseña actualizada para ${empleadoNombre}`)
      handleClose()
    } catch (err) {
      toast.error(err.message || 'No se pudo cambiar la contraseña')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Cambiar contraseña — ${empleadoNombre}`}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <p className="text-xs text-gray-400">
          El empleado deberá usar esta nueva contraseña en su próximo inicio de sesión del portal.
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Cambiar contraseña'}</Button>
        </div>
      </div>
    </Modal>
  )
}
