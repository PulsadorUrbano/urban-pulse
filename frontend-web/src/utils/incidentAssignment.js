import { applyDepartmentAssignment } from './departmentAssignment.js'
import { applyTeamAssignment } from './teamAssignment.js'

/**
 * Valida departamento y equipo antes de devolver una única actualización.
 * Trabaja con copias: si el equipo no es válido, no se guarda parcialmente
 * el departamento. El técnico solo se conserva si sus padres no cambian.
 */
export function applyIncidentAssignment(incident, assignment, departments, teams) {
  const withDepartment = applyDepartmentAssignment(incident, assignment.departmentId, departments)
  return applyTeamAssignment(withDepartment, assignment.teamId, teams)
}
