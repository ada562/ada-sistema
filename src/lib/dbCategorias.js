import { supabase } from './supabase'

export async function getCategorias() {
  const { data, error } = await supabase
    .from('categorias')
    .select('tipo,nombre')
    .eq('activa', true)
    .order('nombre')
  if (error) throw error

  return {
    ingreso: data.filter((c) => c.tipo === 'ingreso').map((c) => c.nombre),
    gasto: data.filter((c) => c.tipo === 'gasto').map((c) => c.nombre),
  }
}

export async function getCategoriasPorTipo(tipo) {
  const { data, error } = await supabase
    .from('categorias')
    .select('nombre')
    .eq('tipo', tipo)
    .eq('activa', true)
    .order('nombre')
  if (error) throw error
  return data.map((c) => c.nombre)
}
