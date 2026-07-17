import visitasData from '../../firebase_export/visits.json'
import { load, save } from './storage'

let visitas = load('ada_visits', visitasData)

export function getVisitas() {
  return visitas
}

export function getVisitasByProject(projectId) {
  return visitas.filter((v) => v.projectId === projectId)
}

export function addVisita(data) {
  const id = 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  const newVisita = {
    id,
    projectId: data.projectId,
    tipo: data.tipo || 'visita_obra',
    date: data.date || '',
    topic: data.topic || '',
    attendeeIds: data.attendeeIds || [],
    notes: data.notes || '',
    amount: Number(data.amount) || 0,
    invoiced: data.invoiced || false,
  }
  visitas = [newVisita, ...visitas]
  save('ada_visits', visitas)
  return newVisita
}

export function updateVisita(id, data) {
  visitas = visitas.map((v) =>
    v.id === id ? { ...v, ...data, amount: Number(data.amount) || 0 } : v
  )
  save('ada_visits', visitas)
  return visitas.find((v) => v.id === id)
}

export function deleteVisita(id) {
  visitas = visitas.filter((v) => v.id !== id)
  save('ada_visits', visitas)
}
