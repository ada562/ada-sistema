import categoriasData from '../../firebase_export/categories.json'

export function getCategorias() {
  return categoriasData
}

export function getCategoriasPorTipo(tipo) {
  return categoriasData[tipo] || []
}
