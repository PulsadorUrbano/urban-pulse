/**
 * Asigna, sustituye o quita el técnico sin modificar los campos superiores
 * ni el estado. El técnico debe pertenecer al equipo de la incidencia.
 */
export function applyTechnicianAssignment(incident, technicianId, technicians) {
  if (!['validated', 'assigned'].includes(incident.status)) {
    throw new Error('Solo se pueden asignar incidencias validadas o asignadas.')
  }

  if (technicianId !== null) {
    if (!incident.departmentId || !incident.teamId) {
      throw new Error('Asigna primero un departamento y un equipo a la incidencia.')
    }
    const technician = technicians.find((item) => item.id === technicianId)
    if (!technician || technician.teamId !== incident.teamId) {
      throw new Error('El técnico debe pertenecer al equipo de la incidencia.')
    }
  }

  return { ...incident, technicianId }
}
