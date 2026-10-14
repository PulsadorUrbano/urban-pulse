/* Aplica las reglas: cambiar o quitar departamento elimina equipo y técnico. */

/**
 * Devuelve una copia de la incidencia con el departamento seleccionado.
 * Un identificador null significa desasignar. Si el departamento cambia,
 * se vacían equipo y técnico; el resto de datos y el estado se conservan.
 */
export function applyDepartmentAssignment(incident, departmentId, departments) {
  if (!['validated', 'assigned'].includes(incident.status)) {
    throw new Error('Solo se pueden asignar incidencias validadas o asignadas.')
  }
  if (departmentId !== null && !departments.some((item) => item.id === departmentId)) {
    throw new Error('Selecciona un departamento válido.')
  }
  // Seleccionar el mismo departamento no debe borrar equipo ni técnico.
  if (incident.departmentId === departmentId) return { ...incident }

  // Cambiar o quitar el departamento invalida las asignaciones dependientes.
  return {
    ...incident,
    departmentId,
    teamId: null,
    technicianId: null,
  }
}
