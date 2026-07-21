import { useAuthStore } from '../store/useAuthStore'
import { usePermisosStore } from '../store/usePermisosStore'

// Version sin hooks, para usar dentro de .map()/loops donde no se pueden
// llamar hooks condicionalmente. Los componentes deben obtener perfil/permisos
// via los stores (hooks, llamados una sola vez) y pasarlos aca.
export function checkPermission(perfil, permisos, modulo, accion = 'leer') {
  if (!perfil || !perfil.activo) return false
  if (perfil.rol === 'admin') return true
  if (perfil.rol === 'sin_rol') return false
  if (!modulo) return false

  return permisos.some((p) => p.rol === perfil.rol && p.modulo === modulo && p.accion === accion)
}

export function usePermission(modulo, accion = 'leer') {
  const perfil = useAuthStore((s) => s.perfil)
  const permisos = usePermisosStore((s) => s.permisos)
  return checkPermission(perfil, permisos, modulo, accion)
}
