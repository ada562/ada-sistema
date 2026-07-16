import settingsData from '../../firebase_export/settings.json'

export function getSettings() {
  return settingsData
}

export function getSaldosIniciales() {
  return settingsData.saldoInicial
}
