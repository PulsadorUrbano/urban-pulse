/**
 * Asigna o desasigna un equipo sin modificar el departamento ni el estado.
 * Solo permite equipos del departamento actual. Cambiar o quitar el equipo
 * vacía el técnico; mantener el mismo equipo conserva su técnico.
 */
export function applyTeamAssignment(incident, teamId, teams) {
  if (!['validated', 'assigned'].includes(incident.status)) {
    throw new Error('Solo se pueden asignar incidencias validadas o asignadas.')
  }

  if (teamId !== null) {
    if (!incident.departmentId) {
      throw new Error('Asigna primero un departamento a la incidencia.')
    }
    const team = teams.find((item) => item.id === teamId)
    if (!team || team.departmentId !== incident.departmentId) {
      throw new Error('El equipo debe pertenecer al departamento de la incidencia.')
    }
  }

  // Guardar el mismo equipo no invalida la asignación del técnico.
  if (incident.teamId === teamId) return { ...incident }

  return { ...incident, teamId, technicianId: null }
}
