import timelogsData from '../../firebase_export/timelogs.json'
import { load, save } from './storage'

let timelogs = load('ada_timelogs', timelogsData)

export function getTimelogs() {
  return timelogs
}

export function getTimelogsByProject(projectId) {
  return timelogs.filter((t) => t.projectId === projectId)
}

export function getTimelogsByEmployee(employeeId) {
  return timelogs.filter((t) => t.employeeId === employeeId)
}

export function addTimelog(data) {
  const id = 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  const newTimelog = {
    id,
    employeeId: data.employeeId,
    projectId: data.projectId,
    date: data.date || '',
    days: Number(data.days) || 0,
    note: data.note || '',
  }
  timelogs = [newTimelog, ...timelogs]
  save('ada_timelogs', timelogs)
  return newTimelog
}

export function updateTimelog(id, data) {
  timelogs = timelogs.map((t) =>
    t.id === id ? { ...t, ...data, days: Number(data.days) || 0 } : t
  )
  save('ada_timelogs', timelogs)
  return timelogs.find((t) => t.id === id)
}

export function deleteTimelog(id) {
  timelogs = timelogs.filter((t) => t.id !== id)
  save('ada_timelogs', timelogs)
}
