import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Modal from '../UI/Modal'
import Button from '../UI/Button'
import { useTesoreriaStore } from '../../store/useTesoreriaStore'
import { useProyectosStore } from '../../store/useProyectosStore'
import { getCategoriasPorTipo } from '../../lib/dbCategorias'
import { todayIso } from '../../lib/formatters'

const emptyForm = {
  date: todayIso(),
  type: 'gasto',
  account: 'banco',
  amount: '',
  category: '',
  projectId: '',
  description: '',
}

export default function FormMovimiento() {
  const { modalOpen, editingTx, closeModal, addTx, updateTx } = useTesoreriaStore()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const proyectos = useProyectosStore((s) => s.projects)

  useEffect(() => {
    if (editingTx) {
      setForm({
        date: editingTx.date || todayIso(),
        type: editingTx.type || 'gasto',
        account: editingTx.account || 'banco',
        amount: editingTx.amount || '',
        category: editingTx.category || '',
        projectId: editingTx.projectId || '',
        description: editingTx.description || '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [editingTx, modalOpen])

  const [categorias, setCategorias] = useState([])

  useEffect(() => {
    let cancelled = false
    getCategoriasPorTipo(form.type).then((cats) => {
      if (!cancelled) setCategorias(cats)
    })
    return () => { cancelled = true }
  }, [form.type])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'type') next.category = ''
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }
    if (!form.category) {
      toast.error('Selecciona una categoría')
      return
    }

    const data = {
      ...form,
      amount: Number(form.amount),
      projectId: form.projectId || null,
    }

    setSaving(true)
    try {
      if (editingTx) {
        await updateTx(editingTx.id, data)
        toast.success('Movimiento actualizado')
      } else {
        await addTx(data)
        toast.success('Movimiento registrado')
      }
      closeModal()
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar el movimiento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={modalOpen}
      onClose={closeModal}
      title={editingTx ? 'Editar movimiento' : 'Nuevo movimiento'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="gasto">Gasto</option>
              <option value="ingreso">Ingreso</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta</label>
            <select
              name="account"
              value={form.account}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="banco">Banco</option>
              <option value="efectivo">Efectivo</option>
              <option value="nequi">Nequi</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Seleccionar...</option>
            {categorias.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto (opcional)</label>
          <select
            name="projectId"
            value={form.projectId}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Sin proyecto</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <input
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Descripción del movimiento"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={closeModal} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : (editingTx ? 'Guardar cambios' : 'Registrar movimiento')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
