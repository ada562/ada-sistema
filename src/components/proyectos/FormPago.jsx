import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Modal from '../UI/Modal'
import Button from '../UI/Button'
import { useServiciosStore } from '../../store/useServiciosStore'
import { getCategoriasPorTipo } from '../../lib/dbCategorias'
import { addTransaction, updateTransaction } from '../../lib/dbTesoreria'
import { todayIso } from '../../lib/formatters'

const emptyForm = {
  date: todayIso(),
  category: '',
  description: '',
  serviceId: '',
  account: 'banco',
  amount: '',
}

export default function FormPago({ projectId, type = 'ingreso', open, onClose, editing = null }) {
  const [form, setForm] = useState(emptyForm)
  const getServiciosByProject = useServiciosStore((s) => s.getByProject)
  const servicios = getServiciosByProject(projectId)
  const [categorias, setCategorias] = useState([])
  const isGasto = type === 'gasto'

  useEffect(() => {
    let cancelled = false
    getCategoriasPorTipo(type).then((cats) => {
      if (!cancelled) setCategorias(cats)
    })
    return () => { cancelled = true }
  }, [type])

  useEffect(() => {
    if (editing) {
      setForm({
        date: editing.date || todayIso(),
        category: editing.category || '',
        description: editing.description || '',
        serviceId: editing.serviceId || '',
        account: editing.account || 'banco',
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }

    const data = {
      date: form.date,
      type,
      account: form.account,
      amount: Number(form.amount),
      category: form.category,
      description: form.description,
      projectId,
      serviceId: form.serviceId || null,
    }

    try {
      if (editing) {
        await updateTransaction(editing.id, data)
        toast.success(isGasto ? 'Gasto actualizado' : 'Pago actualizado')
      } else {
        await addTransaction(data)
        toast.success(isGasto ? 'Gasto registrado' : 'Pago registrado')
      }
      onClose()
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar el movimiento')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing
        ? (isGasto ? 'Editar gasto' : 'Editar pago')
        : (isGasto ? 'Registrar gasto directo' : 'Registrar pago')
      }
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

        {!isGasto && servicios.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Servicio</label>
            <select
              name="serviceId"
              value={form.serviceId}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Sin servicio específico</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <input
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder={isGasto ? 'Ej: Materiales, transporte...' : 'Ej: Abono cuenta de cobro #1'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($) *</label>
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

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">
            {editing ? 'Guardar cambios' : (isGasto ? 'Registrar gasto' : 'Registrar pago')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
