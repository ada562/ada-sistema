import { useRef } from 'react'
import Modal from '../UI/Modal'
import Button from '../UI/Button'
import { fmtMoney, fmtDate } from '../../lib/formatters'

export default function ReciboNomina({ open, onClose, payment, emp }) {
  const printRef = useRef()

  if (!payment || !emp) return null

  const tipoLabels = {
    legal: 'Salario Legal',
    no_constitutivo: 'Salario No Constitutivo',
    prima_legal: 'Prima Legal',
    prima_no_constitutivo: 'Prima No Constitutivo',
  }
  const tipoLabel = tipoLabels[payment.tipo] || payment.tipo
  const today = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  const methodLabel = { banco: 'Transferencia bancaria', efectivo: 'Efectivo', nequi: 'Nequi' }

  const handlePrint = () => {
    const content = printRef.current
    const win = window.open('', '_blank')
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recibo de Nómina - ${emp.name}</title>
        <style>
          @page { margin: 20mm; size: A4; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 20px; }
          .logo-img { height: 45px; width: auto; }
          .company-name { font-size: 18px; font-weight: 700; }
          .company-sub { font-size: 11px; color: #666; }
          .doc-info { text-align: right; }
          .doc-title { font-size: 16px; font-weight: 700; color: #4f46e5; text-transform: uppercase; }
          .doc-date { font-size: 11px; color: #666; margin-top: 2px; }
          .section { margin-bottom: 16px; }
          .section-title { font-size: 10px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; }
          .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f3f4f6; }
          .row-label { color: #666; }
          .row-value { font-weight: 600; }
          .total { font-size: 18px; font-weight: 700; color: #4f46e5; border-top: 2px solid #4f46e5; padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between; }
          .footer { margin-top: 50px; }
          .sig-area { display: flex; justify-content: space-between; margin-top: 60px; }
          .sig-line { width: 180px; border-top: 1px solid #333; padding-top: 4px; font-size: 10px; text-align: center; }
          .note { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 10px; }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `)
    win.document.close()
    setTimeout(() => { win.print() }, 300)
  }

  return (
    <Modal open={open} onClose={onClose} title="Recibo de nómina">
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button onClick={handlePrint}>Imprimir / PDF</Button>
        </div>

        <div className="border border-gray-200 rounded-lg p-6 bg-white max-h-[60vh] overflow-y-auto" ref={printRef}>
          {/* Header */}
          <div className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={window.location.origin + '/logo-ada.svg'} alt="ADA" class="logo-img" />
              <div>
                <div className="company-name">ADA Estudio</div>
                <div className="company-sub">Arquitectura · Diseño · Acabados</div>
                <div className="company-sub">NIT: ---</div>
              </div>
            </div>
            <div className="doc-info">
              <div className="doc-title">Recibo de nómina</div>
              <div className="doc-date">{fmtDate(payment.date)}</div>
            </div>
          </div>

          {/* Empleado */}
          <div className="section">
            <div className="section-title">Datos del empleado</div>
            <div className="row">
              <span className="row-label">Nombre</span>
              <span className="row-value">{emp.name}</span>
            </div>
            <div className="row">
              <span className="row-label">Cargo</span>
              <span className="row-value">{emp.role}</span>
            </div>
            {emp.cedula && (
              <div className="row">
                <span className="row-label">Cédula</span>
                <span className="row-value">{emp.cedula}</span>
              </div>
            )}
          </div>

          {/* Detalle del pago */}
          <div className="section">
            <div className="section-title">Detalle del pago</div>
            <div className="row">
              <span className="row-label">Concepto</span>
              <span className="row-value">{tipoLabel}</span>
            </div>
            <div className="row">
              <span className="row-label">Período</span>
              <span className="row-value">
                {payment.semestre
                  ? `Semestre ${payment.semestre} — ${fmtDate(payment.periodStart)} a ${fmtDate(payment.periodEnd)}`
                  : `Quincena ${payment.quincena} — ${fmtDate(payment.periodStart)} a ${fmtDate(payment.periodEnd)}`
                }
              </span>
            </div>
            <div className="row">
              <span className="row-label">Medio de pago</span>
              <span className="row-value">{methodLabel[payment.method] || payment.method}</span>
            </div>
            {payment.notes && (
              <div className="row">
                <span className="row-label">Notas</span>
                <span className="row-value">{payment.notes}</span>
              </div>
            )}
            <div className="total">
              <span>Total pagado</span>
              <span>{fmtMoney(payment.amount)}</span>
            </div>
          </div>

          {/* Salario referencia */}
          <div className="section">
            <div className="section-title">Referencia salarial mensual</div>
            <div className="row">
              <span className="row-label">Salario mensual legal</span>
              <span className="row-value">{fmtMoney(emp.monthlyRate)}</span>
            </div>
            {emp.nonConstitutiveSalary > 0 && (
              <div className="row">
                <span className="row-label">No constitutivo mensual</span>
                <span className="row-value">{fmtMoney(emp.nonConstitutiveSalary)}</span>
              </div>
            )}
            <div className="row">
              <span className="row-label">Total mensual</span>
              <span className="row-value">{fmtMoney(emp.monthlyRate + (emp.nonConstitutiveSalary || 0))}</span>
            </div>
          </div>

          {/* Firmas */}
          <div className="sig-area">
            <div className="sig-line">Elaborado por</div>
            <div className="sig-line">Recibido por — {emp.name}</div>
          </div>

          <div className="note">
            ADA Estudio · Arquitectura, Diseño y Acabados<br />
            Documento generado el {today}
          </div>
        </div>
      </div>
    </Modal>
  )
}
