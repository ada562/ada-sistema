import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Modal from '../UI/Modal'
import Button from '../UI/Button'
import { useServiciosStore } from '../../store/useServiciosStore'
import { todayIso } from '../../lib/formatters'

const emptyForm = {
  name: '',
  isPrimary: false,
  status: 'Activo',
  startDate: todayIso(),
  contractValue: '',
  ivaPct: '19',
  cuentaCobro: '',
  notes: '',
}

export default function FormServicio({ projectId }) {
  const { modalOpen, editingServicio, closeModal, addServicio, updateServicio } = useServiciosStore()
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (editingServicio) {
      setForm({
        name: editingServicio.name || '',
        isPrimary: editingServicio.isPrimary || false,
        status: editingServicio.status || 'Activo',
        startDate: editingServicio.startDate || '',
        contractValue: editingServicio.contractValue || '',
        ivaPct: editingServicio.ivaPct ?? '19',
        cuentaCobro: editingServicio.cuentaCobro || '',
        notes: editingServicio.notes || '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [editingServicio, modalOpen])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('El nombre del servicio es obligatorio')
      return
    }

    const data = { ...form, projectId }

    try {
      if (editingServicio) {
        await updateServicio(editingServicio.id, data)
        toast.success('Servicio actualizado')
      } else {
        await addServicio(data)
        toast.success('Servicio agregado')
      }
      closeModal()
    } catch (err) {
      toast.error('Error al guardar el servicio: ' + err.message)
    }
  }

  return (
    <Modal
      open={modalOpen}
      onClose={closeModal}
      title={editingServicio ? 'Editar servicio' : 'Nuevo servicio'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del servicio *</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Ej: Fachadas, Visitas, Seguimiento de obra"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="isPrimary"
            checked={form.isPrimary}
            onChange={handleChange}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700">Servicio principal</span>
          <span className="text-xs text-gray-400">(los demás servicios derivan de este)</span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor ($)</label>
            <input
              type="number"
              name="contractValue"
              value={form.contractValue}
              onChange={handleChange}
              placeholder="0"
              min="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IVA (%)</label>
            <input
              type="number"
              name="ivaPct"
              value={form.ivaPct}
              onChange={handleChange}
              placeholder="19"
              min="0"
              max="100"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta de cobro</label>
          <input
            type="text"
            name="cuentaCobro"
            value={form.cuentaCobro}
            onChange={handleChange}
            placeholder="Número o referencia de cuenta de cobro"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="Activo">Activo</option>
              <option value="Pausado">Pausado</option>
              <option value="Finalizado">Finalizado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
            <input
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={2}
            placeholder="Notas adicionales..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={closeModal}>
            Cancelar
          </Button>
          <Button type="submit">
            {editingServicio ? 'Guardar cambios' : 'Agregar servicio'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
