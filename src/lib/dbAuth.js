import { load, save } from './storage'

const KEY = 'ada_auth'
const USERS_KEY = 'ada_users'

const defaultUsers = [
  { username: 'admin', password: 'ada', name: 'Administrador', role: 'admin' },
]

let users = load(USERS_KEY, defaultUsers)

export function login(username, password) {
  const user = users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  )
  if (!user) return null
  const session = { username: user.username, name: user.name, role: user.role, loggedAt: new Date().toISOString() }
  save(KEY, session)
  return session
}

export function logout() {
  localStorage.removeItem(KEY)
}

export function getSession() {
  return load(KEY, null)
}

export function isAuthenticated() {
  return !!getSession()
}
