import { applyDepartmentAssignment } from './departmentAssignment.js'
import { applyTeamAssignment } from './teamAssignment.js'
import { applyTechnicianAssignment } from './technicianAssignment.js'

/**
 * Valida departamento, equipo y técnico antes de devolver una actualización.
 * Trabaja con copias: si cualquier selección falla, no se guarda ningún campo.
 */
export function applyIncidentAssignment(incident, assignment, departments, teams, technicians) {
  const withDepartment = applyDepartmentAssignment(incident, assignment.departmentId, departments)
  const withTeam = applyTeamAssignment(withDepartment, assignment.teamId, teams)
  return applyTechnicianAssignment(withTeam, assignment.technicianId, technicians)
}
