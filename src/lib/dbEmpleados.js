import empleadosData from '../../firebase_export/employees.json'
import { getSettings } from './dbSettings'
import { load, save } from './storage'

const defaultEmpleados = empleadosData.map((e) => ({
  // Personal
  id: e.id,
  name: e.name || '',
  cedula: e.cedula || '',
  birthDate: e.birthDate || '',
  gender: e.gender || '',
  civilStatus: e.civilStatus || '',
  photo: e.photo || '',

  // Contact
  phone: e.phone || '',
  email: e.email || '',
  address: e.address || '',
  city: e.city || '',

  // Emergency contact
  emergencyName: e.emergencyName || '',
  emergencyRelation: e.emergencyRelation || '',
  emergencyPhone: e.emergencyPhone || '',
  emergencyAddress: e.emergencyAddress || '',

  // Work
  role: e.role || '',
  department: e.department || '',
  supervisor: e.supervisor || '',
  startDate: e.startDate || '',
  contractType: e.contractType || '',
  contractUntil: e.contractUntil || '',
  monthlyRate: e.monthlyRate || 0,
  nonConstitutiveSalary: e.nonConstitutiveSalary || 0,
  cargaPct: e.cargaPct || 0,
  status: e.active === false ? 'Retirado' : (e.status || 'Activo'),
  pin: e.pin || '',

  // Social security (Colombia)
  eps: e.eps || '',
  pension: e.pension || '',
  arl: e.arl || '',
  cajaCompensacion: e.cajaCompensacion || '',

  // Documents (names/flags)
  docCedula: e.docCedula || false,
  docHojaVida: e.docHojaVida || false,
  docContrato: e.docContrato || false,
  docCertificados: e.docCertificados || false,
}))

let empleados = load('ada_employees', defaultEmpleados)

export function getEmpleados() {
  return empleados
}

export function getEmpleadoById(id) {
  return empleados.find((e) => e.id === id) || null
}

export function getEmpleadosActivos() {
  return empleados.filter((e) => e.status === 'Activo' || e.status === 'Vacaciones' || e.status === 'Incapacidad')
}

export function getDailyRate(empleado) {
  const { workDaysPerMonth } = getSettings()
  return (empleado.monthlyRate + (empleado.nonConstitutiveSalary || 0)) / workDaysPerMonth
}

export function addEmpleado(data) {
  const id = 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  const newEmp = { ...buildEmpleado(data), id }
  empleados = [newEmp, ...empleados]
  save('ada_employees', empleados)
  return newEmp
}

export function updateEmpleado(id, data) {
  empleados = empleados.map((e) =>
    e.id === id ? { ...e, ...buildEmpleado(data) } : e
  )
  save('ada_employees', empleados)
  return empleados.find((e) => e.id === id)
}

export function deleteEmpleado(id) {
  empleados = empleados.filter((e) => e.id !== id)
  save('ada_employees', empleados)
}

function buildEmpleado(data) {
  return {
    name: data.name || '',
    cedula: data.cedula || '',
    birthDate: data.birthDate || '',
    gender: data.gender || '',
    civilStatus: data.civilStatus || '',
    photo: data.photo || '',
    phone: data.phone || '',
    email: data.email || '',
    address: data.address || '',
    city: data.city || '',
    emergencyName: data.emergencyName || '',
    emergencyRelation: data.emergencyRelation || '',
    emergencyPhone: data.emergencyPhone || '',
    emergencyAddress: data.emergencyAddress || '',
    role: data.role || '',
    department: data.department || '',
    supervisor: data.supervisor || '',
    startDate: data.startDate || '',
    contractType: data.contractType || '',
    contractUntil: data.contractUntil || '',
    monthlyRate: Number(data.monthlyRate) || 0,
    nonConstitutiveSalary: Number(data.nonConstitutiveSalary) || 0,
    cargaPct: Number(data.cargaPct) || 0,
    status: data.status || 'Activo',
    pin: data.pin || '',
    eps: data.eps || '',
    pension: data.pension || '',
    arl: data.arl || '',
    cajaCompensacion: data.cajaCompensacion || '',
    docCedula: data.docCedula || false,
    docHojaVida: data.docHojaVida || false,
    docContrato: data.docContrato || false,
    docCertificados: data.docCertificados || false,
  }
}

export function getAge(birthDate) {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function getUpcomingBirthdays() {
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentDay = today.getDate()

  return getEmpleadosActivos()
    .filter((e) => e.birthDate)
    .map((e) => {
      const birth = new Date(e.birthDate)
      const bMonth = birth.getMonth()
      const bDay = birth.getDate()
      let daysUntil = 0
      const thisYearBday = new Date(today.getFullYear(), bMonth, bDay)
      if (thisYearBday < today) {
        thisYearBday.setFullYear(today.getFullYear() + 1)
      }
      daysUntil = Math.ceil((thisYearBday - today) / (1000 * 60 * 60 * 24))
      return { ...e, daysUntil }
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5)
}

export function getExpiringContracts() {
  const today = new Date().toISOString().slice(0, 10)
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return getEmpleadosActivos()
    .filter((e) => e.contractUntil && e.contractUntil <= in30Days && e.contractUntil >= today)
    .sort((a, b) => a.contractUntil.localeCompare(b.contractUntil))
}
