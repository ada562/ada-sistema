import { useRef, useState, useEffect } from 'react'
import Modal from '../UI/Modal'
import Button from '../UI/Button'
import { fmtMoney, fmtDate } from '../../lib/formatters'
import { getTransactions } from '../../lib/dbTesoreria'

export default function CuentaCobro({ open, onClose, proyecto, servicios }) {
  const printRef = useRef()
  const [selected, setSelected] = useState([])
  const [allTx, setAllTx] = useState([])

  // Reset selection y traer transacciones del proyecto cuando se abre el modal
  useEffect(() => {
    if (open) {
      setSelected(servicios.map((s) => s.id))
      let cancelled = false
      getTransactions().then((txs) => {
        if (!cancelled) {
          setAllTx(txs.filter((tx) => tx.projectId === proyecto.id && tx.type === 'ingreso'))
        }
      })
      return () => { cancelled = true }
    }
  }, [open, servicios, proyecto.id])

  const toggleService = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selected.length === servicios.length) {
      setSelected([])
    } else {
      setSelected(servicios.map((s) => s.id))
    }
  }

  const selectedServices = servicios.filter((s) => selected.includes(s.id))

  // Financials for selected services
  const valorBase = selectedServices.reduce((sum, s) => sum + (s.contractValue || 0), 0)
  const ivaTotal = selectedServices.reduce((sum, s) => sum + (s.contractValue || 0) * ((s.ivaPct || 0) / 100), 0)
  const valorConIva = valorBase + ivaTotal

  // Pagos recibidos solo para los servicios seleccionados
  const pagosSelected = allTx.filter((tx) => selected.includes(tx.serviceId))
  // Pagos sin servicio asignado se incluyen si se selecciona todo
  const pagosSinServicio = selected.length === servicios.length
    ? allTx.filter((tx) => !tx.serviceId)
    : []
  const todosLosPagos = [...pagosSelected, ...pagosSinServicio]
  const abonosTotal = todosLosPagos.reduce((sum, tx) => sum + tx.amount, 0)
  const saldoPendiente = Math.max(valorConIva - abonosTotal, 0)

  const today = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  const consecutivo = selectedServices.length === 1 && selectedServices[0].cuentaCobro
    ? selectedServices[0].cuentaCobro
    : `CC-${proyecto.id.slice(-6).toUpperCase()}`

  const handlePrint = () => {
    const content = printRef.current
    const win = window.open('', '_blank')
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cuenta de Cobro - ${proyecto.name}</title>
        <style>
          @page { margin: 20mm; size: A4; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 24px; }
          .logo-area { display: flex; align-items: center; gap: 12px; }
          .logo-img { height: 50px; width: auto; }
          .company-name { font-size: 20px; font-weight: 700; color: #1a1a1a; }
          .company-sub { font-size: 11px; color: #666; }
          .doc-info { text-align: right; }
          .doc-title { font-size: 18px; font-weight: 700; color: #4f46e5; text-transform: uppercase; }
          .doc-date { font-size: 12px; color: #666; margin-top: 4px; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 11px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
          .info-label { font-size: 11px; color: #888; }
          .info-value { font-size: 13px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #f3f4f6; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #555; text-transform: uppercase; }
          td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
          .text-right { text-align: right; }
          .total-row { background: #f9fafb; font-weight: 700; }
          .total-row td { border-top: 2px solid #4f46e5; }
          .summary-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 20px; }
          .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
          .summary-row.highlight { font-size: 16px; font-weight: 700; color: #4f46e5; border-top: 2px solid #4f46e5; padding-top: 8px; margin-top: 8px; }
          .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center; font-size: 11px; color: #999; }
          .signature { margin-top: 60px; display: flex; justify-content: space-between; }
          .sig-line { width: 200px; border-top: 1px solid #333; padding-top: 4px; font-size: 11px; text-align: center; }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `)
    win.document.close()
    setTimeout(() => { win.print() }, 300)
  }

  return (
    <Modal open={open} onClose={onClose} title="Generar cuenta de cobro">
      <div className="space-y-4">
        {/* Selector de servicios */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">Selecciona los servicios a cobrar:</p>
            <button
              onClick={toggleAll}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {selected.length === servicios.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
          </div>
          <div className="space-y-2">
            {servicios.map((s) => (
              <label key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selected.includes(s.id)}
                  onChange={() => toggleService(s.id)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{s.name}</span>
                    {s.isPrimary && <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">Principal</span>}
                    {s.cuentaCobro && <span className="text-xs text-gray-400">({s.cuentaCobro})</span>}
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {s.contractValue ? fmtMoney(s.contractValue * (1 + (s.ivaPct || 0) / 100)) : '—'}
                  </span>
                </div>
              </label>
            ))}
          </div>
          {selected.length === 0 && (
            <p className="text-xs text-red-500 mt-2">Selecciona al menos un servicio</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button onClick={handlePrint} disabled={selected.length === 0}>Imprimir / PDF</Button>
        </div>

        {/* Preview */}
        {selected.length > 0 && (
          <div className="border border-gray-200 rounded-lg p-6 bg-white max-h-[50vh] overflow-y-auto" ref={printRef}>
            {/* Header */}
            <div className="header">
              <div className="logo-area">
                <img src={window.location.origin + '/logo-ada.svg'} alt="ADA" class="logo-img" />
                <div>
                  <div className="company-name">ADA Estudio</div>
                  <div className="company-sub">Arquitectura · Diseño · Acabados</div>
                  <div className="company-sub">NIT: ---</div>
                </div>
              </div>
              <div className="doc-info">
                <div className="doc-title">Cuenta de cobro</div>
                <div className="doc-date">No. {consecutivo}</div>
                <div className="doc-date">{today}</div>
              </div>
            </div>

            {/* Project info */}
            <div className="section">
              <div className="section-title">Información del proyecto</div>
              <div className="info-grid">
                <div>
                  <div className="info-label">Proyecto</div>
                  <div className="info-value">{proyecto.name}</div>
                </div>
                <div>
                  <div className="info-label">Cliente</div>
                  <div className="info-value">{proyecto.client || '—'}</div>
                </div>
              </div>
            </div>

            {/* Detalle de servicios cobrados */}
            <div className="section">
              <div className="section-title">Detalle del cobro</div>
              <table>
                <thead>
                  <tr>
                    <th>Servicio</th>
                    <th className="text-right">Valor</th>
                    <th className="text-right">IVA</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedServices.map((s) => {
                    const sIva = (s.contractValue || 0) * ((s.ivaPct || 0) / 100)
                    const sTotal = (s.contractValue || 0) + sIva
                    return (
                      <tr key={s.id}>
                        <td>
                          {s.name}
                          {s.cuentaCobro ? ` (${s.cuentaCobro})` : ''}
                        </td>
                        <td className="text-right">{fmtMoney(s.contractValue || 0)}</td>
                        <td className="text-right">{fmtMoney(sIva)}</td>
                        <td className="text-right" style={{ fontWeight: 600 }}>{fmtMoney(sTotal)}</td>
                      </tr>
                    )
                  })}
                  {selectedServices.length > 1 && (
                    <tr className="total-row">
                      <td>Total</td>
                      <td className="text-right">{fmtMoney(valorBase)}</td>
                      <td className="text-right">{fmtMoney(ivaTotal)}</td>
                      <td className="text-right">{fmtMoney(valorConIva)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Abonos */}
            {todosLosPagos.length > 0 && (
              <div className="section">
                <div className="section-title">Abonos recibidos</div>
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Descripción</th>
                      <th className="text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todosLosPagos.sort((a, b) => a.date.localeCompare(b.date)).map((tx) => (
                      <tr key={tx.id}>
                        <td>{fmtDate(tx.date)}</td>
                        <td>{tx.description || tx.category || '—'}</td>
                        <td className="text-right">{fmtMoney(tx.amount)}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={2}>Total abonos</td>
                      <td className="text-right">{fmtMoney(abonosTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Resumen */}
            <div className="summary-box">
              <div className="summary-row">
                <span>Valor cobrado (con IVA)</span>
                <span style={{ fontWeight: 600 }}>{fmtMoney(valorConIva)}</span>
              </div>
              {abonosTotal > 0 && (
                <div className="summary-row">
                  <span>Abonos recibidos</span>
                  <span style={{ fontWeight: 600, color: '#15803d' }}>- {fmtMoney(abonosTotal)}</span>
                </div>
              )}
              <div className="summary-row highlight">
                <span>Saldo pendiente por cobrar</span>
                <span>{fmtMoney(saldoPendiente)}</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="signature">
              <div className="sig-line">Elaborado por</div>
              <div className="sig-line">Recibido por</div>
            </div>

            {/* Footer */}
            <div className="footer">
              ADA Estudio · Arquitectura, Diseño y Acabados<br />
              Documento generado el {today}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
