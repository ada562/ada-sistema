// Plantillas de jornada laboral oficiales (memo interno, comunicado a los
// equipos). Dos jornadas fijas -- no son editables desde la UI, si la
// empresa cambia el horario se actualiza este archivo. Cada empleado activo
// se asigna a una de las dos (empleados.tipo_horario, migracion 017).

export const TIPOS_HORARIO = ['Equipo de Diseño', 'Equipo Administrativo']

export const PLANTILLAS_HORARIO = {
  'Equipo de Diseño': [
    { dia: 'Lunes', entrada: '08:00', almuerzo: '13:00–14:00', salida: '17:25' },
    { dia: 'Martes', entrada: '08:00', almuerzo: '13:00–14:00', salida: '17:25' },
    { dia: 'Miércoles', entrada: '08:00', almuerzo: '13:00–14:00', salida: '17:25' },
    { dia: 'Jueves', entrada: '08:00', almuerzo: '13:00–14:00', salida: '17:25' },
    { dia: 'Viernes', entrada: '08:00', almuerzo: '13:00–14:00', salida: '17:25' },
  ],
  'Equipo Administrativo': [
    { dia: 'Lunes', entrada: '08:00', almuerzo: '13:00–14:00', salida: '17:30' },
    { dia: 'Martes', entrada: '08:00', almuerzo: '13:00–14:00', salida: '17:00' },
    { dia: 'Miércoles', entrada: '08:00', almuerzo: '13:00–14:00', salida: '17:30' },
    { dia: 'Jueves', entrada: '08:00', almuerzo: '13:00–14:00', salida: '17:00' },
    { dia: 'Viernes', entrada: '08:00', almuerzo: null, salida: '13:00' },
    { dia: 'Sábado', entrada: '09:00', almuerzo: null, salida: '13:00' },
  ],
}
