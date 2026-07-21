import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Modal from '../UI/Modal'
import Button from '../UI/Button'
import { useEmpleadosStore } from '../../store/useEmpleadosStore'
import { useVisitasStore } from '../../store/useVisitasStore'
import { todayIso } from '../../lib/formatters'
import { TEMA_OPTIONS } from '../../lib/visitaTemas'

const VISIT_TYPES = [
  { value: 'visita_obra', label: 'Visita a Obra' },
  { value: 'reunion_diseno', label: 'Reunión de Diseño' },
  { value: 'obsequio', label: 'Obsequio' },
]

const emptyForm = {
  tipo: 'visita_obra',
  date: todayIso(),
  topic: '',
  topicOther: '',
  attendeeIds: [],
  notes: '',
  amount: '',
}

export default function FormVisita({ projectId, open, onClose, editing = null }) {
  const [form, setForm] = useState(emptyForm)
  const getEmpleadosActivos = useEmpleadosStore((s) => s.getEmpleadosActivos)
  const empleados = getEmpleadosActivos()
  const addVisita = useVisitasStore((s) => s.addVisita)
  const updateVisita = useVisitasStore((s) => s.updateVisita)

  useEffect(() => {
    if (editing) {
      setForm({
        tipo: editing.tipo || 'visita_obra',
        date: editing.date || todayIso(),
        topic: editing.topic || '',
        topicOther: editing.topicOther || '',
        attendeeIds: editing.attendeeIds || [],
        notes: editing.notes || '',
        amount: editing.amount || '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [editing, open])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const toggleAttendee = (id) => {
    setForm((prev) => ({
      ...prev,
      attendeeIds: prev.attendeeIds.includes(id)
        ? prev.attendeeIds.filter((a) => a !== id)
        : [...prev.attendeeIds, id],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.date) {
      toast.error('La fecha es obligatoria')
      return
    }

    const data = { ...form, projectId }

    try {
      if (editing) {
        await updateVisita(editing.id, data)
        toast.success('Visita actualizada')
      } else {
        await addVisita(data)
        toast.success('Visita registrada')
      }
      onClose()
    } catch (err) {
      toast.error('Error al guardar la visita: ' + err.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar visita' : 'Registrar visita'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo de visita */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de visita *</label>
          <div className="flex gap-2">
            {VISIT_TYPES.map((vt) => (
              <button
                key={vt.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, tipo: vt.value }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1 ${
                  form.tipo === vt.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {vt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor ($)</label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="0"
              min="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
          <select
            name="topic"
            value={form.topic}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Sin especificar</option>
            {TEMA_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {form.topic === 'otro' && (
            <input
              type="text"
              name="topicOther"
              value={form.topicOther}
              onChange={handleChange}
              placeholder="Especifica el tema..."
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Asistentes</label>
          <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg min-h-[40px]">
            {empleados.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => toggleAttendee(e.id)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  form.attendeeIds.includes(e.id)
                    ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {e.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Descripción de la visita..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">{editing ? 'Guardar cambios' : 'Registrar visita'}</Button>
        </div>
      </form>
    </Modal>
  )
}
