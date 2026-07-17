import serviciosData from '../../firebase_export/services.json'
import { load, save } from './storage'

let servicios = load('ada_services', serviciosData)

export function getServicios() {
  return servicios
}

export function getServiciosByProject(projectId) {
  return servicios.filter((s) => s.projectId === projectId)
}

export function getServicioById(id) {
  return servicios.find((s) => s.id === id) || null
}

export function addServicio(data) {
  const id = 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  const newServicio = {
    id,
    projectId: data.projectId,
    name: data.name || '',
    status: data.status || 'Activo',
    startDate: data.startDate || '',
    contractValue: Number(data.contractValue) || 0,
    ivaPct: Number(data.ivaPct) || 0,
    cuentaCobro: data.cuentaCobro || '',
    notes: data.notes || '',
    isPrimary: data.isPrimary || false,
  }
  servicios = [newServicio, ...servicios]
  save('ada_services', servicios)
  return newServicio
}

export function updateServicio(id, data) {
  servicios = servicios.map((s) =>
    s.id === id
      ? {
          ...s,
          ...data,
          contractValue: Number(data.contractValue) || 0,
          ivaPct: Number(data.ivaPct) || 0,
        }
      : s
  )
  save('ada_services', servicios)
  return servicios.find((s) => s.id === id)
}

export function deleteServicio(id) {
  servicios = servicios.filter((s) => s.id !== id)
  save('ada_services', servicios)
}
