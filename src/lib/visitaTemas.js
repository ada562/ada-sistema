// Opciones estructuradas de 'visitas.tema' (migracion 013) -- compartidas
// entre los formularios de visita (admin/coordinador y el portal de
// empleado 'Mi Bitacora') para no duplicar la lista en cada componente.
// El CHECK constraint en la base de datos exige NULL o uno de estos 4
// valores exactos (minuscula, sin tildes en el value); 'otro' habilita el
// campo de texto libre 'tema_otro'.
export const TEMA_OPTIONS = [
  { value: 'interiorismo', label: 'Interiorismo' },
  { value: 'iluminacion', label: 'Iluminación' },
  { value: 'arquitectura', label: 'Arquitectura' },
  { value: 'otro', label: 'Otro' },
]

export function getTemaLabel(topic, topicOther) {
  if (!topic) return ''
  if (topic === 'otro') return topicOther || 'Otro'
  return TEMA_OPTIONS.find((t) => t.value === topic)?.label || topic
}
