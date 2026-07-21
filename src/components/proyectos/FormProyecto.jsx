import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Modal from '../UI/Modal'
import Button from '../UI/Button'
import { useProyectosStore } from '../../store/useProyectosStore'
import { todayIso } from '../../lib/formatters'

const emptyForm = {
  name: '',
  client: '',
  serviceType: '',
  status: 'Activo',
  startDate: todayIso(),
  contractValue: '',
  ivaPct: '',
  notes: '',
  esDeGBA: false,
  visitPackage: { visita_obra: 0, reunion_diseno: 0, obsequio: 0 },
}

export default function FormProyecto() {
  const { modalOpen, editingProject, closeModal, addProject, updateProject } = useProyectosStore()
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (editingProject) {
      setForm({
        name: editingProject.name || '',
        client: editingProject.client || '',
        serviceType: editingProject.serviceType || '',
        status: editingProject.status || 'Activo',
        startDate: editingProject.startDate || '',
        contractValue: editingProject.contractValue || '',
        ivaPct: editingProject.ivaPct || '',
        notes: editingProject.notes || '',
        esDeGBA: editingProject.esDeGBA || false,
        visitPackage: editingProject.visitPackage || { visita_obra: 0, reunion_diseno: 0, obsequio: 0 },
      })
    } else {
      setForm(emptyForm)
    }
  }, [editingProject, modalOpen])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('El nombre del proyecto es obligatorio')
      return
    }

    try {
      if (editingProject) {
        await updateProject(editingProject.id, form)
        toast.success('Proyecto actualizado')
      } else {
        await addProject(form)
        toast.success('Proyecto creado')
      }
      closeModal()
    } catch (err) {
      toast.error('Error al guardar el proyecto: ' + err.message)
    }
  }

  return (
    <Modal
      open={modalOpen}
      onClose={closeModal}
      title={editingProject ? 'Editar proyecto' : 'Nuevo proyecto'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Nombre del proyecto"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <input
              type="text"
              name="client"
              value={form.client}
              onChange={handleChange}
              placeholder="Nombre del cliente"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de servicio</label>
            <input
              type="text"
              name="serviceType"
              value={form.serviceType}
              onChange={handleChange}
              placeholder="Ej: Diseño, Construcción"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor contrato ($)</label>
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
              placeholder="0"
              min="0"
              max="100"
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
            rows={3}
            placeholder="Notas adicionales..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          />
        </div>

        {/* Paquete de visitas incluidas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Visitas incluidas en el contrato</label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Visitas a Obra</label>
              <input
                type="number"
                min="0"
                value={form.visitPackage?.visita_obra || 0}
                onChange={(e) => setForm((f) => ({ ...f, visitPackage: { ...f.visitPackage, visita_obra: Number(e.target.value) || 0 } }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Reuniones de Diseño</label>
              <input
                type="number"
                min="0"
                value={form.visitPackage?.reunion_diseno || 0}
                onChange={(e) => setForm((f) => ({ ...f, visitPackage: { ...f.visitPackage, reunion_diseno: Number(e.target.value) || 0 } }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Obsequios</label>
              <input
                type="number"
                min="0"
                value={form.visitPackage?.obsequio || 0}
                onChange={(e) => setForm((f) => ({ ...f, visitPackage: { ...f.visitPackage, obsequio: Number(e.target.value) || 0 } }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="esDeGBA"
            checked={form.esDeGBA}
            onChange={handleChange}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700">Proyecto de GBA</span>
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={closeModal}>
            Cancelar
          </Button>
          <Button type="submit">
            {editingProject ? 'Guardar cambios' : 'Crear proyecto'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
