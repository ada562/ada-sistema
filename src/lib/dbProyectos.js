import proyectosData from '../../firebase_export/projects.json'
import { getTransactions } from './dbTesoreria'
import { getTimelogsByProject } from './dbTimelogs'
import { getEmpleadoById, getDailyRate } from './dbEmpleados'

let projects = [...proyectosData]

export function getProyectos() {
  return projects
}

export function getProyectoById(id) {
  return projects.find((p) => p.id === id) || null
}

export function getProyectosActivos() {
  return projects.filter((p) => p.status === 'Activo')
}

export function addProyecto(data) {
  const id = 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  const newProject = {
    id,
    name: data.name || '',
    client: data.client || '',
    serviceType: data.serviceType || '',
    status: data.status || 'Activo',
    startDate: data.startDate || '',
    contractValue: Number(data.contractValue) || 0,
    ivaPct: Number(data.ivaPct) || 0,
    notes: data.notes || '',
    esDeGBA: data.esDeGBA || false,
  }
  projects = [newProject, ...projects]
  return newProject
}

export function updateProyecto(id, data) {
  projects = projects.map((p) =>
    p.id === id ? { ...p, ...data, contractValue: Number(data.contractValue) || 0, ivaPct: Number(data.ivaPct) || 0 } : p
  )
  return projects.find((p) => p.id === id)
}

export function deleteProyecto(id) {
  projects = projects.filter((p) => p.id !== id)
}

export function getProjectMetrics(projectId) {
  const transactions = getTransactions().filter((tx) => tx.projectId === projectId)
  const timelogs = getTimelogsByProject(projectId)

  const ingresos = transactions
    .filter((tx) => tx.type === 'ingreso')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const gastos = transactions
    .filter((tx) => tx.type === 'gasto')
    .reduce((sum, tx) => sum + tx.amount, 0)

  let costoManoObra = 0
  for (const log of timelogs) {
    const emp = getEmpleadoById(log.employeeId)
    if (emp) {
      costoManoObra += log.days * getDailyRate(emp)
    }
  }

  const rentabilidad = ingresos - gastos - costoManoObra

  return {
    ingresos,
    gastos,
    costoManoObra,
    rentabilidad,
    totalTransacciones: transactions.length,
    totalHoras: timelogs.reduce((sum, t) => sum + t.days, 0),
  }
}

export function getAllProjectsWithMetrics() {
  return projects.map((p) => ({
    ...p,
    metrics: getProjectMetrics(p.id),
  }))
}
