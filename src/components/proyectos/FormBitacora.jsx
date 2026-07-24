import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Modal from '../UI/Modal'
import Button from '../UI/Button'
import { useEmpleadosStore } from '../../store/useEmpleadosStore'
import { useTimelogsStore } from '../../store/useTimelogsStore'
import { useServiciosStore } from '../../store/useServiciosStore'
import { todayIso } from '../../lib/formatters'

const emptyForm = {
  employeeId: '',
  date: todayIso(),
  days: '',
  note: '',
  serviceId: '',
}

export default function FormBitacora({ projectId, open, onClose, editing = null }) {
  const [form, setForm] = useState(emptyForm)
  const getEmpleadosActivos = useEmpleadosStore((s) => s.getEmpleadosActivos)
  const empleados = getEmpleadosActivos()
  const addTimelog = useTimelogsStore((s) => s.addTimelog)
  const updateTimelog = useTimelogsStore((s) => s.updateTimelog)
  const getServiciosByProject = useServiciosStore((s) => s.getByProject)
  const fetchServicios = useServiciosStore((s) => s.fetchAll)
  const serviciosDisponibles = getServiciosByProject(projectId)

  useEffect(() => {
    fetchServicios()
  }, [fetchServicios])

  useEffect(() => {
    if (editing) {
      setForm({
        employeeId: editing.employeeId || '',
        date: editing.date || todayIso(),
        days: editing.days || '',
        note: editing.note || '',
        serviceId: editing.serviceId || '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [editing, open])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.employeeId) {
      toast.error('Selecciona una persona')
      return
    }
    if (!form.days || Number(form.days) <= 0) {
      toast.error('Los días deben ser mayor a 0')
      return
    }

    const data = { ...form, projectId }

    try {
      if (editing) {
        await updateTimelog(editing.id, data)
        toast.success('Registro actualizado')
      } else {
        await addTimelog(data)
        toast.success('Días registrados')
      }
      onClose()
    } catch (err) {
      toast.error('Error al guardar el registro: ' + err.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar registro' : 'Registrar días'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Persona *</label>
          <select
            name="employeeId"
            value={form.employeeId}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Seleccionar...</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        {serviciosDisponibles.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Servicio</label>
            <select
              name="serviceId"
              value={form.serviceId}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Servicio general</option>
              {serviciosDisponibles.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Días *</label>
            <input
              type="number"
              name="days"
              value={form.days}
              onChange={handleChange}
              placeholder="0.5"
              min="0"
              step="0.25"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nota</label>
          <textarea
            name="note"
            value={form.note}
            onChange={handleChange}
            rows={2}
            placeholder="Descripción de la actividad..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">{editing ? 'Guardar cambios' : 'Registrar'}</Button>
        </div>
      </form>
    </Modal>
  )
}
