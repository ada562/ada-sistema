import { useRef } from 'react'
import { FileDown, Printer } from 'lucide-react'
import Modal from '../UI/Modal'
import Button from '../UI/Button'
import { useTesoreriaStore } from '../../store/useTesoreriaStore'
import { useProyectosStore } from '../../store/useProyectosStore'
import { fmtMoney, fmtDate, todayIso } from '../../lib/formatters'
import { downloadCsv } from '../../lib/exportCsv'

const cuentaLabel = { banco: 'Banco', efectivo: 'Efectivo', nequi: 'Nequi' }

export default function ExtractoTesoreria({ open, onClose }) {
  const printRef = useRef()
  const { getFilteredTransactions, filters } = useTesoreriaStore()
  const getProyectoById = useProyectosStore((s) => s.getProyectoById)

  if (!open) return null

  const transactions = getFilteredTransactions()
  const totalIngresos = transactions.filter((t) => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0)
  const totalGastos = transactions.filter((t) => t.type === 'gasto').reduce((s, t) => s + t.amount, 0)
  const saldoNeto = totalIngresos - totalGastos

  const periodo = filters.fechaDesde || filters.fechaHasta
    ? `${filters.fechaDesde ? fmtDate(filters.fechaDesde) : 'Inicio'} — ${filters.fechaHasta ? fmtDate(filters.fechaHasta) : 'Hoy'}`
    : 'Histórico completo'
  const cuentaTxt = filters.cuenta !== 'todas' ? cuentaLabel[filters.cuenta] || filters.cuenta : 'Todas las cuentas'
  const today = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })

  const rowsData = transactions.map((tx) => {
    const proyecto = tx.projectId ? getProyectoById(tx.projectId) : null
    return {
      fecha: fmtDate(tx.date),
      tipo: tx.type === 'ingreso' ? 'Ingreso' : 'Gasto',
      cuenta: cuentaLabel[tx.account] || tx.account,
      categoria: tx.category || '',
      proyecto: proyecto?.name || '',
      descripcion: tx.description || '',
      monto: tx.type === 'ingreso' ? tx.amount : -tx.amount,
    }
  })

  const handleExportCsv = () => {
    downloadCsv(
      `extracto-tesoreria-${todayIso()}.csv`,
      ['Fecha', 'Tipo', 'Cuenta', 'Categoría', 'Proyecto', 'Descripción', 'Monto'],
      rowsData.map((r) => [r.fecha, r.tipo, r.cuenta, r.categoria, r.proyecto, r.descripcion, r.monto])
    )
  }

  const handlePrint = () => {
    const content = printRef.current
    const win = window.open('', '_blank')
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Extracto de Tesorería - ${today}</title>
        <style>
          @page { margin: 15mm; size: A4; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 11px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 16px; }
          .logo-img { height: 40px; width: auto; }
          .company-name { font-size: 16px; font-weight: 700; }
          .company-sub { font-size: 10px; color: #666; }
          .doc-info { text-align: right; }
          .doc-title { font-size: 15px; font-weight: 700; color: #4f46e5; text-transform: uppercase; }
          .doc-date { font-size: 10px; color: #666; margin-top: 2px; }
          .meta { display: flex; gap: 24px; margin-bottom: 16px; font-size: 11px; }
          .meta-label { color: #666; }
          .meta-value { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #f3f4f6; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #4b5563; padding: 6px 8px; border-bottom: 2px solid #e5e7eb; }
          td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; font-size: 10.5px; }
          .amount { text-align: right; font-weight: 600; white-space: nowrap; }
          .amount.ingreso { color: #15803d; }
          .amount.gasto { color: #b91c1c; }
          .totales { margin-left: auto; width: 260px; }
          .totales .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f3f4f6; }
          .totales .row-label { color: #666; }
          .totales .row-value { font-weight: 600; }
          .totales .neto { font-size: 15px; font-weight: 700; color: #4f46e5; border-top: 2px solid #4f46e5; padding-top: 8px; margin-top: 4px; display: flex; justify-content: space-between; }
          .note { margin-top: 30px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 10px; }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `)
    win.document.close()
    setTimeout(() => { win.print() }, 300)
  }

  return (
    <Modal open={open} onClose={onClose} title="Extracto de Tesorería">
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button variant="outline" onClick={handleExportCsv}>
            <FileDown size={16} /> Excel (CSV)
          </Button>
          <Button onClick={handlePrint}>
            <Printer size={16} /> Imprimir / PDF
          </Button>
        </div>

        <div className="border border-gray-200 rounded-lg p-6 bg-white max-h-[60vh] overflow-y-auto" ref={printRef}>
          <div className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={window.location.origin + '/logo-ada.svg'} alt="ADA" className="logo-img" />
              <div>
                <div className="company-name">ADA Estudio</div>
                <div className="company-sub">Arquitectura · Diseño · Acabados</div>
                <div className="company-sub">NIT: ---</div>
              </div>
            </div>
            <div className="doc-info">
              <div className="doc-title">Extracto de Tesorería</div>
              <div className="doc-date">{today}</div>
            </div>
          </div>

          <div className="meta">
            <div><span className="meta-label">Período: </span><span className="meta-value">{periodo}</span></div>
            <div><span className="meta-label">Cuenta: </span><span className="meta-value">{cuentaTxt}</span></div>
            <div><span className="meta-label">Movimientos: </span><span className="meta-value">{transactions.length}</span></div>
          </div>

          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Cuenta</th>
                  <th>Categoría</th>
                  <th>Proyecto</th>
                  <th>Descripción</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {rowsData.map((r, i) => (
                  <tr key={i}>
                    <td>{r.fecha}</td>
                    <td>{r.tipo}</td>
                    <td>{r.cuenta}</td>
                    <td>{r.categoria}</td>
                    <td>{r.proyecto || '—'}</td>
                    <td>{r.descripcion || '—'}</td>
                    <td className={`amount ${r.monto >= 0 ? 'ingreso' : 'gasto'}`}>
                      {r.monto >= 0 ? '+' : '-'}{fmtMoney(Math.abs(r.monto))}
                    </td>
                  </tr>
                ))}
                {rowsData.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: '16px' }}>Sin movimientos en el período seleccionado</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="totales">
            <div className="row"><span className="row-label">Total ingresos</span><span className="row-value">{fmtMoney(totalIngresos)}</span></div>
            <div className="row"><span className="row-label">Total gastos</span><span className="row-value">{fmtMoney(totalGastos)}</span></div>
            <div className="neto"><span>Saldo neto</span><span>{fmtMoney(saldoNeto)}</span></div>
          </div>

          <div className="note">
            ADA Estudio · Extracto generado según los filtros activos en Tesorería<br />
            Documento generado el {today}
          </div>
        </div>
      </div>
    </Modal>
  )
}
