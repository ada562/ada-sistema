import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Modal from '../UI/Modal'
import Button from '../UI/Button'

const emptyForm = {
  name: '',
  group: '',
  acompanamientoPct: '10',
}

export default function FormPresupuestoCategoria({ open, editing, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name || '',
        group: editing.group || '',
        acompanamientoPct: editing.acompanamientoPct ?? '10',
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
    if (!form.name.trim()) {
      toast.error('El nombre de la categoría es obligatorio')
      return
    }
    try {
      await onSave(form)
      toast.success(editing ? 'Categoría actualizada' : 'Categoría agregada')
      onClose()
    } catch (err) {
      toast.error('Error al guardar la categoría: ' + err.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar categoría' : 'Nueva categoría'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la categoría *</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Ej: Demolición, Carpintería, Enchapada de baños"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
          <input
            type="text"
            name="group"
            value={form.group}
            onChange={handleChange}
            placeholder="Ej: Obra, Carpintería, Mobiliario (opcional)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Acompañamiento de obra (%)</label>
          <input
            type="number"
            name="acompanamientoPct"
            value={form.acompanamientoPct}
            onChange={handleChange}
            placeholder="10"
            min="0"
            max="100"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p className="text-xs text-gray-400 mt-1">Se suma al subtotal de los ítems para calcular el total de la categoría.</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            {editing ? 'Guardar cambios' : 'Agregar categoría'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
