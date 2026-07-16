import timelogsData from '../../firebase_export/timelogs.json'

export function getTimelogs() {
  return timelogsData
}

export function getTimelogsByProject(projectId) {
  return timelogsData.filter((t) => t.projectId === projectId)
}

export function getTimelogsByEmployee(employeeId) {
  return timelogsData.filter((t) => t.employeeId === employeeId)
}
