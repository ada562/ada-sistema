import empleadosData from '../../firebase_export/employees.json'
import { getSettings } from './dbSettings'

export function getEmpleados() {
  return empleadosData
}

export function getEmpleadoById(id) {
  return empleadosData.find((e) => e.id === id) || null
}

export function getEmpleadosActivos() {
  return empleadosData.filter((e) => e.active)
}

export function getDailyRate(empleado) {
  const { workDaysPerMonth } = getSettings()
  return (empleado.monthlyRate + (empleado.nonConstitutiveSalary || 0)) / workDaysPerMonth
}
