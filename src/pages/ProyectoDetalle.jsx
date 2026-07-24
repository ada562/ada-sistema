import { useState, useEffect } from 'react'
import { ArrowLeft, FolderKanban, Pencil, Trash2, Plus, Layers, FileText, Printer } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../components/UI/Button'
import FormProyecto from '../components/proyectos/FormProyecto'
import FormServicio from '../components/proyectos/FormServicio'
import FormBitacora from '../components/proyectos/FormBitacora'
import FormVisita from '../components/proyectos/FormVisita'
import FormPago from '../components/proyectos/FormPago'
import CuentaCobro from '../components/proyectos/CuentaCobro'
import SeccionPresupuesto from '../components/proyectos/SeccionPresupuesto'
import FormPresupuestoCategoria from '../components/proyectos/FormPresupuestoCategoria'
import FormPresupuestoItem from '../components/proyectos/FormPresupuestoItem'
import { useNavigationStore } from '../store/useNavigationStore'
import { useProyectosStore } from '../store/useProyectosStore'
import { useServiciosStore } from '../store/useServiciosStore'
import { useTimelogsStore } from '../store/useTimelogsStore'
import { useVisitasStore } from '../store/useVisitasStore'
import { useEmpleadosStore } from '../store/useEmpleadosStore'
import { usePresupuestoStore } from '../store/usePresupuestoStore'
import { getTransactions } from '../lib/dbTesoreria'
import { getSettings } from '../lib/dbSettings'
import { fmtMoney, fmtDate } from '../lib/formatters'
import { getTemaLabel } from '../lib/visitaTemas'
import { usePermission } from '../hooks/usePermission'

const statusColors = {
  Activo: 'bg-green-100 text-green-700',
  Pausado: 'bg-yellow-100 text-yellow-700',
  Finalizado: 'bg-gray-100 text-gray-600',
}

export default function ProyectoDetalle() {
  const { viewParam, setActiveView } = useNavigationStore()
  const {
    loading: proyectosLoading,
    getProyectoById,
    fetchAll: fetchProyectos,
    initRealtime: initProyectosRealtime,
    teardownRealtime: teardownProyectosRealtime,
    openModal: openProjectModal,
    deleteProject,
  } = useProyectosStore()
  const {
    getByProject: getServiciosByProject,
    fetchAll: fetchServicios,
    initRealtime: initServiciosRealtime,
    teardownRealtime: teardownServiciosRealtime,
    openModal: openServiceModal,
    deleteServicio,
  } = useServiciosStore()
  const {
    timelogs: allTimelogs,
    getByProject: getTimelogsByProject,
    fetchAll: fetchTimelogs,
    initRealtime: initTimelogsRealtime,
    teardownRealtime: teardownTimelogsRealtime,
  } = useTimelogsStore()
  const {
    getByProject: getVisitasByProject,
    fetchAll: fetchVisitas,
    initRealtime: initVisitasRealtime,
    teardownRealtime: teardownVisitasRealtime,
  } = useVisitasStore()
  const {
    employees,
    getEmpleadoById,
    loading: empleadosLoading,
    fetchAll: fetchEmpleados,
    initRealtime: initEmpleadosRealtime,
    teardownRealtime: teardownEmpleadosRealtime,
  } = useEmpleadosStore()
  const {
    categorias: categoriasPresupuesto,
    fetchByProject: fetchPresupuesto,
    initRealtime: initPresupuestoRealtime,
    teardownRealtime: teardownPresupuestoRealtime,
    addCategoria: addCategoriaPresupuesto,
    updateCategoria: updateCategoriaPresupuesto,
    deleteCategoria: deleteCategoriaPresupuesto,
    addItem: addItemPresupuesto,
    updateItem: updateItemPresupuesto,
    deleteItem: deleteItemPresupuesto,
  } = usePresupuestoStore()
  const puedeVerPresupuesto = usePermission('presupuesto', 'leer')
  const proyecto = getProyectoById(viewParam)

  // Modal states
  const [bitacoraModal, setBitacoraModal] = useState({ open: false, editing: null })
  const [visitaModal, setVisitaModal] = useState({ open: false, editing: null })
  const [gastoModal, setGastoModal] = useState({ open: false, editing: null })
  const [pagoModal, setPagoModal] = useState({ open: false, editing: null })
  const [cuentaCobroOpen, setCuentaCobroOpen] = useState(false)
  const [categoriaModal, setCategoriaModal] = useState({ open: false, editing: null })
  const [itemModal, setItemModal] = useState({ open: false, editing: null, categoriaId: null })
  // Force re-fetch de transacciones (Tesorería no tiene store propio inyectado aquí)
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((t) => t + 1)

  // Costeo de mano de obra: async porque getDailyRate() depende de getSettings() (Supabase)
  const [manoObra, setManoObra] = useState({ byEmployee: {}, total: 0, loading: true })
  const [aiuPct, setAiuPct] = useState({ administracionPct: 0, imprevistosPct: 0, utilidadPct: 0, loading: true })

  // Transacciones del proyecto: async porque dbTesoreria.js ahora consulta Supabase
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    fetchProyectos()
    initProyectosRealtime()
    fetchServicios()
    initServiciosRealtime()
    fetchTimelogs()
    initTimelogsRealtime()
    fetchVisitas()
    initVisitasRealtime()
    fetchEmpleados()
    initEmpleadosRealtime()
    return () => {
      teardownProyectosRealtime()
      teardownServiciosRealtime()
      teardownTimelogsRealtime()
      teardownVisitasRealtime()
      teardownEmpleadosRealtime()
    }
  }, [
    fetchProyectos, initProyectosRealtime, teardownProyectosRealtime,
    fetchServicios, initServiciosRealtime, teardownServiciosRealtime,
    fetchTimelogs, initTimelogsRealtime, teardownTimelogsRealtime,
    fetchVisitas, initVisitasRealtime, teardownVisitasRealtime,
    fetchEmpleados, initEmpleadosRealtime, teardownEmpleadosRealtime,
  ])

  useEffect(() => {
    if (!viewParam || !puedeVerPresupuesto) return
    fetchPresupuesto(viewParam)
    initPresupuestoRealtime(viewParam)
    return () => {
      teardownPresupuestoRealtime()
    }
  }, [viewParam, puedeVerPresupuesto, fetchPresupuesto, initPresupuestoRealtime, teardownPresupuestoRealtime])

  useEffect(() => {
    if (!proyecto) return
    let cancelled = false
    getTransactions().then((txs) => {
      if (!cancelled) setTransactions(txs.filter((tx) => tx.projectId === proyecto.id))
    })
    return () => { cancelled = true }
  }, [proyecto, tick])

  useEffect(() => {
    if (!proyecto || empleadosLoading) return
    let cancelled = false

    async function loadManoObra() {
      setManoObra((prev) => ({ ...prev, loading: true }))
      const logs = getTimelogsByProject(proyecto.id)
      const { workDaysPerMonth } = await getSettings()
      const byEmployee = {}
      let total = 0
      for (const log of logs) {
        const emp = getEmpleadoById(log.employeeId)
        if (emp) {
          const rate = (emp.monthlyRate + (emp.nonConstitutiveSalary || 0)) * (1 + (emp.cargaPct || 0) / 100) / workDaysPerMonth
          const costo = log.days * rate
          total += costo
          if (!byEmployee[emp.id]) byEmployee[emp.id] = { emp, days: 0, costo: 0, rate }
          byEmployee[emp.id].days += log.days
          byEmployee[emp.id].costo += costo
        }
      }
      if (!cancelled) setManoObra({ byEmployee, total, loading: false })
    }

    loadManoObra()
    return () => { cancelled = true }
  }, [proyecto, allTimelogs, empleadosLoading, employees, getEmpleadoById, getTimelogsByProject])

  useEffect(() => {
    let cancelled = false
    getSettings()
      .then((s) => {
        if (!cancelled) {
          setAiuPct({
            administracionPct: s.administracionPct,
            imprevistosPct: s.imprevistosPct,
            utilidadPct: s.utilidadPct,
            loading: false,
          })
        }
      })
      .catch(() => { if (!cancelled) setAiuPct((prev) => ({ ...prev, loading: false })) })
    return () => { cancelled = true }
  }, [])

  if (proyectosLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    )
  }

  if (!proyecto) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Proyecto no encontrado</p>
        <Button variant="ghost" onClick={() => setActiveView('proyectos')} className="mt-4">
          Volver a proyectos
        </Button>
      </div>
    )
  }

  // Data
  const servicios = getServiciosByProject(proyecto.id)
  const servicioPrincipal = servicios.find((s) => s.isPrimary) || null
  const serviciosDerivados = servicios.filter((s) => !s.isPrimary)
  const timelogs = getTimelogsByProject(proyecto.id)
  const visitas = getVisitasByProject(proyecto.id)

  const ingresos = transactions.filter((tx) => tx.type === 'ingreso')
  const gastos = transactions.filter((tx) => tx.type === 'gasto')

  // Financials
  const valorContratoTotal = servicios.length > 0
    ? servicios.reduce((sum, s) => sum + (s.contractValue || 0), 0)
    : proyecto.contractValue || 0

  const ivaProm = servicios.length > 0
    ? servicios.reduce((sum, s) => sum + (s.ivaPct || 0), 0) / servicios.length
    : (proyecto.ivaPct || 0)

  const valorNetoConIva = servicios.length > 0
    ? servicios.reduce((sum, s) => sum + s.contractValue * (1 + (s.ivaPct || 0) / 100), 0)
    : valorContratoTotal * (1 + ivaProm / 100)

  const abonosTotales = ingresos.reduce((sum, tx) => sum + tx.amount, 0)
  const saldoPendiente = valorNetoConIva - abonosTotales
  const pctPagado = valorNetoConIva > 0 ? Math.min((abonosTotales / valorNetoConIva) * 100, 100) : 0

  // Costo interno: mano de obra (async, ver useEffect arriba) + gastos directos
  const costoManoObra = manoObra.total
  const manoObraByEmployee = manoObra.byEmployee
  const gastosDirectos = gastos.reduce((sum, tx) => sum + tx.amount, 0)
  const costoInterno = costoManoObra + gastosDirectos

  // AIU (Administración, Imprevistos, Utilidad) sobre la mano de obra: cuánto cobrarle al cliente
  const aiuTotalPct = aiuPct.administracionPct + aiuPct.imprevistosPct + aiuPct.utilidadPct
  const valorAdministracion = costoManoObra * (aiuPct.administracionPct / 100)
  const valorImprevistos = costoManoObra * (aiuPct.imprevistosPct / 100)
  const valorUtilidad = costoManoObra * (aiuPct.utilidadPct / 100)
  const valorAIU = valorAdministracion + valorImprevistos + valorUtilidad
  const valorACobrarManoObra = costoManoObra + valorAIU

  const margenBruto = abonosTotales - costoInterno
  const pctMargen = valorNetoConIva > 0 ? ((margenBruto / valorNetoConIva) * 100).toFixed(1) : '0.0'
  const cajaDisponible = abonosTotales - costoInterno

  const handleDeleteProject = async () => {
    if (!window.confirm(`¿Eliminar el proyecto "${proyecto.name}"?`)) return
    await deleteProject(proyecto.id)
    toast.success('Proyecto eliminado')
    setActiveView('proyectos')
  }

  const handleDeleteServicio = async (s) => {
    if (!window.confirm(`¿Eliminar el servicio "${s.name}"?`)) return
    await deleteServicio(s.id)
    toast.success('Servicio eliminado')
  }

  const handleDeleteCategoriaPresupuesto = async (cat) => {
    if (!window.confirm(`¿Eliminar la categoría "${cat.name}" y todos sus ítems?`)) return
    await deleteCategoriaPresupuesto(cat.id)
    toast.success('Categoría eliminada')
  }

  const handleDeleteItemPresupuesto = async (item) => {
    if (!window.confirm(`¿Eliminar el ítem "${item.description}"?`)) return
    await deleteItemPresupuesto(item.id)
    toast.success('Ítem eliminado')
  }

  const handleSaveCategoriaPresupuesto = async (form) => {
    if (categoriaModal.editing) {
      await updateCategoriaPresupuesto(categoriaModal.editing.id, form)
    } else {
      await addCategoriaPresupuesto({ ...form, projectId: proyecto.id })
    }
  }

  const handleSaveItemPresupuesto = async (form) => {
    if (itemModal.editing) {
      await updateItemPresupuesto(itemModal.editing.id, form)
    } else {
      await addItemPresupuesto({ ...form, categoriaId: itemModal.categoriaId })
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('proyectos')}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </button>
          <FolderKanban size={24} className="text-indigo-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{proyecto.name}</h2>
            <p className="text-sm text-gray-500">
              {proyecto.client && `Cliente: ${proyecto.client} · `}
              {proyecto.serviceType && `${proyecto.serviceType} · `}
              {proyecto.status}
              {proyecto.startDate && ` · Inicio: ${fmtDate(proyecto.startDate)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCuentaCobroOpen(true)}>
            <Printer size={14} />
            Cuenta de cobro
          </Button>
          <Button variant="outline" size="sm" onClick={() => openProjectModal(proyecto)}>
            <Pencil size={14} />
            Editar
          </Button>
          <Button variant="danger" size="sm" onClick={handleDeleteProject}>
            <Trash2 size={14} />
            Eliminar
          </Button>
        </div>
      </div>

      {/* ═══ RESUMEN FINANCIERO ═══ */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
          $ Resumen financiero del proyecto
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Valor contrato total</p>
            <p className="text-xl font-bold text-gray-900">{fmtMoney(valorContratoTotal)}</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Valor neto total (con IVA)</p>
            <p className="text-xl font-bold text-gray-900">{fmtMoney(valorNetoConIva)}</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Abonos totales</p>
            <p className="text-xl font-bold text-gray-900">{fmtMoney(abonosTotales)}</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Saldo pendiente total</p>
            <p className="text-xl font-bold text-gray-900">{fmtMoney(Math.max(saldoPendiente, 0))}</p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all"
                style={{ width: `${pctPagado}%` }}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Costo interno total</p>
            <p className="text-xl font-bold text-gray-900">{fmtMoney(costoInterno)}</p>
            <p className="text-xs text-gray-400 mt-1">Mano de obra + gastos directos</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Margen bruto del proyecto</p>
            <p className={`text-xl font-bold ${margenBruto >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {fmtMoney(margenBruto)}
            </p>
            <p className="text-xs text-gray-400 mt-1">{pctMargen}% del contrato total</p>
          </div>
          <div className={`border rounded-lg p-4 ${cajaDisponible >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Caja disponible del proyecto</p>
            <p className={`text-xl font-bold ${cajaDisponible >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {fmtMoney(cajaDisponible)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Abonos recibidos menos lo ya gastado</p>
          </div>
        </div>
      </div>

      {/* ═══ SERVICIOS ═══ */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-700">Servicios ({servicios.length})</h3>
          </div>
          <button
            onClick={() => openServiceModal()}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50"
          >
            <Plus size={14} /> Agregar servicio
          </button>
        </div>

        {servicios.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-400">Sin servicios. Agrega el servicio principal y los derivados (fachadas, visitas, seguimiento de obra, etc.)</p>
          </div>
        ) : (
          <>
            {/* Servicio principal */}
            {servicioPrincipal && (
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-5 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-xs font-bold uppercase">Principal</span>
                    <h4 className="text-lg font-bold text-gray-900">{servicioPrincipal.name}</h4>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[servicioPrincipal.status] || 'bg-gray-100 text-gray-600'}`}>{servicioPrincipal.status}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openServiceModal(servicioPrincipal)} className="p-1.5 text-indigo-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-100" title="Editar"><Pencil size={14} /></button>
                    <button onClick={() => handleDeleteServicio(servicioPrincipal)} className="p-1.5 text-indigo-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Eliminar"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-indigo-500 font-medium">Valor</p>
                    <p className="text-lg font-bold text-gray-900">{servicioPrincipal.contractValue ? fmtMoney(servicioPrincipal.contractValue) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-500 font-medium">Valor + IVA ({servicioPrincipal.ivaPct || 0}%)</p>
                    <p className="text-lg font-bold text-gray-900">{servicioPrincipal.contractValue ? fmtMoney(servicioPrincipal.contractValue * (1 + (servicioPrincipal.ivaPct || 0) / 100)) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-500 font-medium">Cuenta de cobro</p>
                    <p className="text-sm font-semibold text-gray-700">{servicioPrincipal.cuentaCobro || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-500 font-medium">Fecha inicio</p>
                    <p className="text-sm font-semibold text-gray-700">{servicioPrincipal.startDate ? fmtDate(servicioPrincipal.startDate) : '—'}</p>
                  </div>
                </div>
                {servicioPrincipal.notes && (
                  <p className="text-xs text-gray-500 mt-2">{servicioPrincipal.notes}</p>
                )}
              </div>
            )}

            {/* Servicios derivados */}
            {serviciosDerivados.length > 0 && (
              <div className="relative ml-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-indigo-200">
                {serviciosDerivados.map((s) => (
                  <div key={s.id} className="relative pl-6 pb-3 last:pb-0">
                    {/* Connector line */}
                    <div className="absolute left-0 top-5 w-6 h-0.5 bg-indigo-200" />
                    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-200 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-gray-900">{s.name}</h4>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status] || 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openServiceModal(s)} className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50" title="Editar"><Pencil size={13} /></button>
                          <button onClick={() => handleDeleteServicio(s)} className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Eliminar"><Trash2 size={13} /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-400">Valor</p>
                          <p className="font-semibold text-gray-900">{s.contractValue ? fmtMoney(s.contractValue) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Valor + IVA</p>
                          <p className="font-semibold text-gray-900">{s.contractValue ? fmtMoney(s.contractValue * (1 + (s.ivaPct || 0) / 100)) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Cuenta de cobro</p>
                          <p className="font-medium text-gray-700">{s.cuentaCobro || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Fecha inicio</p>
                          <p className="font-medium text-gray-700">{s.startDate ? fmtDate(s.startDate) : '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total servicios */}
            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">Total servicios ({servicios.length})</span>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Valor</p>
                  <p className="font-bold text-gray-900">{fmtMoney(valorContratoTotal)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Valor + IVA</p>
                  <p className="font-bold text-gray-900">{fmtMoney(valorNetoConIva)}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══ A · COSTEO DE MANO DE OBRA ═══ */}
      <Section
        letter="A"
        title="Costeo de mano de obra (desde bitácora)"
        action="Registrar horas"
        onAction={() => setBitacoraModal({ open: true, editing: null })}
      >
        {manoObra.loading ? (
          <div className="px-4 py-6 space-y-2 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-full" />
          </div>
        ) : Object.keys(manoObraByEmployee).length === 0 ? (
          <EmptyRow>Sin horas registradas todavía.</EmptyRow>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2 font-medium text-gray-600">Persona</th>
                <th className="px-4 py-2 font-medium text-gray-600">Rol</th>
                <th className="px-4 py-2 font-medium text-gray-600 text-right">Días</th>
                <th className="px-4 py-2 font-medium text-gray-600 text-right">Tarifa día</th>
                <th className="px-4 py-2 font-medium text-gray-600 text-right">Costo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.values(manoObraByEmployee).map(({ emp, days, costo, rate }) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">{emp.name}</td>
                  <td className="px-4 py-2 text-gray-600">{emp.role || '—'}</td>
                  <td className="px-4 py-2 text-right">{days}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{fmtMoney(rate)}</td>
                  <td className="px-4 py-2 text-right font-medium text-orange-700">{fmtMoney(costo)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={2} className="px-4 py-2 text-gray-700">Total</td>
                <td className="px-4 py-2 text-right">{Object.values(manoObraByEmployee).reduce((s, r) => s + r.days, 0)}</td>
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2 text-right text-orange-700">{fmtMoney(costoManoObra)}</td>
              </tr>
            </tbody>
          </table>
        )}
        {!manoObra.loading && Object.keys(manoObraByEmployee).length > 0 && (
          <div className="border-t border-gray-100 px-4 py-3 bg-indigo-50/50">
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-2">
              Cuánto cobrar (AIU sobre mano de obra)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Administración ({aiuPct.administracionPct}%)</p>
                <p className="font-medium text-gray-800">{fmtMoney(valorAdministracion)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Imprevistos ({aiuPct.imprevistosPct}%)</p>
                <p className="font-medium text-gray-800">{fmtMoney(valorImprevistos)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Utilidad ({aiuPct.utilidadPct}%)</p>
                <p className="font-medium text-gray-800">{fmtMoney(valorUtilidad)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">AIU total ({aiuTotalPct}%)</p>
                <p className="font-semibold text-indigo-700">{fmtMoney(valorAIU)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-indigo-100">
              <span className="text-sm font-semibold text-gray-700">Valor a cobrar por mano de obra</span>
              <span className="text-lg font-bold text-indigo-700">{fmtMoney(valorACobrarManoObra)}</span>
            </div>
          </div>
        )}
      </Section>

      {/* ═══ B · OTROS GASTOS DIRECTOS ═══ */}
      <Section
        letter="B"
        title="Otros gastos directos del proyecto"
        subtitle="Gastos y compras del proyecto (proveedores, materiales, transporte, imprevistos, etc.)"
        action="Registrar gasto"
        onAction={() => setGastoModal({ open: true, editing: null })}
      >
        {gastos.length === 0 ? (
          <EmptyRow>Sin otros gastos directos registrados.</EmptyRow>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2 font-medium text-gray-600">Fecha</th>
                <th className="px-4 py-2 font-medium text-gray-600">Categoría</th>
                <th className="px-4 py-2 font-medium text-gray-600">Descripción</th>
                <th className="px-4 py-2 font-medium text-gray-600 text-right">Valor</th>
                <th className="px-4 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gastos.sort((a, b) => b.date.localeCompare(a.date)).map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{fmtDate(tx.date)}</td>
                  <td className="px-4 py-2 text-gray-600">{tx.category}</td>
                  <td className="px-4 py-2 text-gray-600 max-w-[250px] truncate">{tx.description || '—'}</td>
                  <td className="px-4 py-2 text-right font-medium text-red-700">{fmtMoney(tx.amount)}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setGastoModal({ open: true, editing: tx })} className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50" title="Editar"><Pencil size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={3} className="px-4 py-2 text-gray-700">Total gastos directos</td>
                <td className="px-4 py-2 text-right text-red-700">{fmtMoney(gastosDirectos)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        )}
      </Section>

      {/* ═══ C · FACTURACIÓN / PAGOS RECIBIDOS ═══ */}
      <Section
        letter="C"
        title="Facturación / Pagos recibidos"
        action="Registrar pago"
        onAction={() => setPagoModal({ open: true, editing: null })}
      >
        {ingresos.length === 0 ? (
          <EmptyRow>Sin pagos registrados.</EmptyRow>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2 font-medium text-gray-600">Fecha</th>
                <th className="px-4 py-2 font-medium text-gray-600">Categoría</th>
                <th className="px-4 py-2 font-medium text-gray-600">Descripción</th>
                <th className="px-4 py-2 font-medium text-gray-600">Servicio</th>
                <th className="px-4 py-2 font-medium text-gray-600 text-right">Valor</th>
                <th className="px-4 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ingresos.sort((a, b) => b.date.localeCompare(a.date)).map((tx) => {
                const svc = servicios.find((s) => s.id === tx.serviceId)
                return (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{fmtDate(tx.date)}</td>
                    <td className="px-4 py-2 text-gray-600">{tx.category}</td>
                    <td className="px-4 py-2 text-gray-600 max-w-[200px] truncate">{tx.description || '—'}</td>
                    <td className="px-4 py-2">
                      {svc ? <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-medium">{svc.name}</span> : '—'}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-green-700">{fmtMoney(tx.amount)}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setPagoModal({ open: true, editing: tx })} className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50" title="Editar"><Pencil size={13} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={4} className="px-4 py-2 text-gray-700">Total abonos</td>
                <td className="px-4 py-2 text-right text-green-700">{fmtMoney(abonosTotales)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        )}
      </Section>

      {/* ═══ D · VISITAS AL PROYECTO ═══ */}
      <Section
        letter="D"
        title="Visitas al proyecto"
        action="Registrar visita"
        onAction={() => setVisitaModal({ open: true, editing: null })}
      >
        {visitas.length === 0 ? (
          <EmptyRow>Sin visitas registradas.</EmptyRow>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2 font-medium text-gray-600">Fecha</th>
                <th className="px-4 py-2 font-medium text-gray-600">Tema</th>
                <th className="px-4 py-2 font-medium text-gray-600">Asistentes</th>
                <th className="px-4 py-2 font-medium text-gray-600">Notas</th>
                <th className="px-4 py-2 font-medium text-gray-600 text-right">Valor</th>
                <th className="px-4 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visitas.sort((a, b) => b.date.localeCompare(a.date)).map((v) => {
                const asistentes = (v.attendeeIds || []).map((id) => getEmpleadoById(id)?.name).filter(Boolean)
                return (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap">{fmtDate(v.date)}</td>
                    <td className="px-4 py-2 text-gray-600">{getTemaLabel(v.topic, v.topicOther) || '—'}</td>
                    <td className="px-4 py-2 text-gray-600 text-xs max-w-[150px]">{asistentes.join(', ') || '—'}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs max-w-[250px] truncate">{v.notes || '—'}</td>
                    <td className="px-4 py-2 text-right font-medium">{v.amount ? fmtMoney(v.amount) : '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setVisitaModal({ open: true, editing: v })} className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50" title="Editar"><Pencil size={13} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Section>

      {/* ═══ E · BITÁCORA DEL PROYECTO ═══ */}
      <Section
        letter="E"
        title="Bitácora del proyecto"
        action="Registrar horas"
        onAction={() => setBitacoraModal({ open: true, editing: null })}
      >
        {timelogs.length === 0 ? (
          <EmptyRow>Sin registros.</EmptyRow>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2 font-medium text-gray-600">Fecha</th>
                <th className="px-4 py-2 font-medium text-gray-600">Persona</th>
                <th className="px-4 py-2 font-medium text-gray-600 text-right">Días</th>
                <th className="px-4 py-2 font-medium text-gray-600">Nota</th>
                <th className="px-4 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {timelogs.sort((a, b) => b.date.localeCompare(a.date)).map((log) => {
                const emp = getEmpleadoById(log.employeeId)
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{fmtDate(log.date)}</td>
                    <td className="px-4 py-2 text-gray-700">{emp?.name || 'Desconocido'}</td>
                    <td className="px-4 py-2 text-right">{log.days}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs max-w-[300px] truncate">{log.note || '—'}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => setBitacoraModal({ open: true, editing: log })} className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50" title="Editar"><Pencil size={13} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Section>

      {/* ═══ F · PRESUPUESTO (COTIZACIÓN) ═══ */}
      {puedeVerPresupuesto && (
        <SeccionPresupuesto
          categorias={categoriasPresupuesto}
          onAddCategoria={() => setCategoriaModal({ open: true, editing: null })}
          onEditCategoria={(cat) => setCategoriaModal({ open: true, editing: cat })}
          onDeleteCategoria={handleDeleteCategoriaPresupuesto}
          onAddItem={(cat) => setItemModal({ open: true, editing: null, categoriaId: cat.id })}
          onEditItem={(cat, item) => setItemModal({ open: true, editing: item, categoriaId: cat.id })}
          onDeleteItem={handleDeleteItemPresupuesto}
        />
      )}

      {/* Modals */}
      <FormProyecto />
      <FormServicio projectId={proyecto.id} />
      <FormBitacora
        projectId={proyecto.id}
        open={bitacoraModal.open}
        editing={bitacoraModal.editing}
        onClose={() => setBitacoraModal({ open: false, editing: null })}
      />
      <FormVisita
        projectId={proyecto.id}
        open={visitaModal.open}
        editing={visitaModal.editing}
        onClose={() => setVisitaModal({ open: false, editing: null })}
      />
      <FormPago
        projectId={proyecto.id}
        type="gasto"
        open={gastoModal.open}
        editing={gastoModal.editing}
        onClose={() => { setGastoModal({ open: false, editing: null }); refresh() }}
      />
      <FormPago
        projectId={proyecto.id}
        type="ingreso"
        open={pagoModal.open}
        editing={pagoModal.editing}
        onClose={() => { setPagoModal({ open: false, editing: null }); refresh() }}
      />
      <CuentaCobro
        open={cuentaCobroOpen}
        onClose={() => setCuentaCobroOpen(false)}
        proyecto={proyecto}
        servicios={servicios}
      />
      <FormPresupuestoCategoria
        open={categoriaModal.open}
        editing={categoriaModal.editing}
        onClose={() => setCategoriaModal({ open: false, editing: null })}
        onSave={handleSaveCategoriaPresupuesto}
      />
      <FormPresupuestoItem
        open={itemModal.open}
        editing={itemModal.editing}
        onClose={() => setItemModal({ open: false, editing: null, categoriaId: null })}
        onSave={handleSaveItemPresupuesto}
      />
    </div>
  )
}

// ─── Helper components ───

function Section({ letter, title, subtitle, action, onAction, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">
            <span className="text-indigo-600 mr-1">{letter}</span> {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50"
          >
            <Plus size={14} /> {action}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

function EmptyRow({ children }) {
  return <p className="px-4 py-6 text-sm text-gray-400 text-center">{children}</p>
}
