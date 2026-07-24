import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { fmtMoney } from '../../lib/formatters'

const statusColors = {
  Pendiente: 'bg-gray-100 text-gray-600',
  Aprobado: 'bg-blue-100 text-blue-700',
  'En producción': 'bg-yellow-100 text-yellow-700',
  Entregado: 'bg-green-100 text-green-700',
}

export default function SeccionPresupuesto({ categorias, onAddCategoria, onEditCategoria, onDeleteCategoria, onAddItem, onEditItem, onDeleteItem }) {
  const [expanded, setExpanded] = useState({})

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: prev[id] === false ? true : false }))

  const totalGeneral = categorias.reduce((sum, cat) => sum + totalCategoria(cat), 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">
            <span className="text-indigo-600 mr-1">F</span> Presupuesto — Cotización
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Categorías de obra con sus ítems, subtotal + acompañamiento de obra</p>
        </div>
        <button
          onClick={onAddCategoria}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50"
        >
          <Plus size={14} /> Agregar categoría
        </button>
      </div>

      {categorias.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-400 text-center">Sin categorías de presupuesto todavía.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {categorias.map((cat) => {
            const subtotal = cat.items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0)
            const acompanamiento = subtotal * (cat.acompanamientoPct / 100)
            const total = subtotal + acompanamiento
            const isOpen = expanded[cat.id] !== false

            return (
              <div key={cat.id}>
                <div
                  className="px-4 py-3 flex items-center justify-between bg-gray-50 cursor-pointer"
                  onClick={() => toggle(cat.id)}
                >
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-800">{cat.name}</h4>
                    {cat.group && (
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-medium">{cat.group}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-gray-900">{fmtMoney(total)}</span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => onEditCategoria(cat)} className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50" title="Editar categoría"><Pencil size={13} /></button>
                      <button onClick={() => onDeleteCategoria(cat)} className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Eliminar categoría"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-gray-100">
                          <th className="px-4 py-2 font-medium text-gray-500 text-xs">Descripción</th>
                          <th className="px-4 py-2 font-medium text-gray-500 text-xs text-right">Cant.</th>
                          <th className="px-4 py-2 font-medium text-gray-500 text-xs text-right">Costo unit.</th>
                          <th className="px-4 py-2 font-medium text-gray-500 text-xs text-right">Valor total</th>
                          <th className="px-4 py-2 font-medium text-gray-500 text-xs">Estado</th>
                          <th className="px-4 py-2 font-medium text-gray-500 text-xs">Responsable</th>
                          <th className="px-4 py-2 font-medium text-gray-500 text-xs">Anotaciones</th>
                          <th className="px-4 py-2 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {cat.items.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-4 text-center text-gray-400 text-xs">Sin ítems en esta categoría.</td>
                          </tr>
                        ) : (
                          cat.items.map((it) => (
                            <tr key={it.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-800">{it.description}</td>
                              <td className="px-4 py-2 text-right text-gray-600">{it.quantity}</td>
                              <td className="px-4 py-2 text-right text-gray-600">{fmtMoney(it.unitCost)}</td>
                              <td className="px-4 py-2 text-right font-medium text-gray-900">{fmtMoney(it.quantity * it.unitCost)}</td>
                              <td className="px-4 py-2">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[it.status] || 'bg-gray-100 text-gray-600'}`}>{it.status}</span>
                              </td>
                              <td className="px-4 py-2 text-gray-600 text-xs">{it.personal || '—'}</td>
                              <td className="px-4 py-2 text-gray-500 text-xs max-w-[200px] truncate">{it.notes || '—'}</td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-1">
                                  <button onClick={() => onEditItem(cat, it)} className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50" title="Editar ítem"><Pencil size={13} /></button>
                                  <button onClick={() => onDeleteItem(it)} className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Eliminar ítem"><Trash2 size={13} /></button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    <div className="px-4 py-2 border-t border-gray-100">
                      <button
                        onClick={() => onAddItem(cat)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50"
                      >
                        <Plus size={14} /> Agregar ítem
                      </button>
                    </div>
                    <div className="px-4 py-2 bg-gray-50/50 border-t border-gray-100 text-xs text-right space-y-1">
                      <div className="flex justify-end gap-4 text-gray-500">
                        <span>Subtotal</span>
                        <span className="w-28 text-gray-700">{fmtMoney(subtotal)}</span>
                      </div>
                      <div className="flex justify-end gap-4 text-gray-500">
                        <span>Acompañamiento de obra ({cat.acompanamientoPct}%)</span>
                        <span className="w-28 text-gray-700">{fmtMoney(acompanamiento)}</span>
                      </div>
                      <div className="flex justify-end gap-4 font-semibold text-gray-900">
                        <span>Total categoría</span>
                        <span className="w-28">{fmtMoney(total)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {categorias.length > 0 && (
        <div className="px-4 py-3 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-indigo-700">Total presupuesto (Cotización)</span>
          <span className="text-lg font-bold text-indigo-700">{fmtMoney(totalGeneral)}</span>
        </div>
      )}
    </div>
  )
}

function totalCategoria(cat) {
  const subtotal = cat.items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0)
  return subtotal + subtotal * (cat.acompanamientoPct / 100)
}
