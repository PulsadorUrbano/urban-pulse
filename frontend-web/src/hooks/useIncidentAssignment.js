import { useEffect, useState } from 'react'
import { loadAssignmentData, saveIncidentAssignment } from '../services/assignmentService.js'

/**
 * Mantiene un borrador conjunto de departamento, equipo y técnico.
 * Los selectores dependen del borrador, pero la incidencia solo se actualiza
 * cuando el usuario confirma el guardado.
 */
export default function useIncidentAssignment() {
  const [incidentId, setIncidentId] = useState('INC-0032')
  const [data, setData] = useState(null)
  const [departmentId, setDepartmentId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [technicianId, setTechnicianId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // Ignora respuestas antiguas si se cambia de caso o se desmonta la pantalla.
  useEffect(() => {
    let active = true
    loadAssignmentData(incidentId)
      .then((result) => {
        if (!active) return
        setData(result)
        setDepartmentId(result.incident.departmentId ?? '')
        setTeamId(result.incident.teamId ?? '')
        setTechnicianId(result.incident.technicianId ?? '')
      })
      .catch((err) => {
        if (!active) return
        setData(null)
        setError(err.message)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [incidentId, reloadKey])

  // Cambia de incidencia y carga su asignación guardada como nuevo borrador.
  const selectIncident = (id) => {
    if (loading || saving || id === incidentId) return
    setLoading(true)
    setError('')
    setSuccess('')
    setIncidentId(id)
  }

  // Solicita nuevamente los datos de la misma incidencia después de un error.
  const retry = () => {
    setLoading(true)
    setError('')
    setReloadKey((value) => value + 1)
  }

  // Cambiar el departamento vacía sus asignaciones dependientes del borrador.
  const selectDepartment = (id) => {
    if (id === departmentId) return
    setDepartmentId(id)
    setTeamId('')
    setTechnicianId('')
    setError('')
    setSuccess('')
  }

  // Cambiar el equipo vacía el técnico del borrador, sin guardar todavía.
  const selectTeam = (id) => {
    if (id === teamId) return
    setTeamId(id)
    setTechnicianId('')
    setError('')
    setSuccess('')
  }

  // Seleccionar o quitar el técnico solo modifica el borrador.
  const selectTechnician = (id) => {
    setTechnicianId(id)
    setError('')
    setSuccess('')
  }

  /**
   * Guarda los tres campos en una sola operación tras la confirmación.
   * Las opciones vacías se convierten en null. Un fallo mantiene intacta
   * la asignación guardada y deja disponible el borrador para reintentar.
   */
  const save = async () => {
    if (saving || loading || !data) return false
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const updated = await saveIncidentAssignment(incidentId, {
        departmentId: departmentId || null,
        teamId: teamId || null,
        technicianId: technicianId || null,
      })
      setData((current) => ({
        ...current,
        incident: updated,
        incidents: current.incidents.map((item) => item.id === updated.id ? updated : item),
      }))
      setSuccess('Asignación guardada correctamente.')
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setSaving(false)
    }
  }

  // Los equipos dependen del departamento seleccionado, incluso sin guardar.
  const availableTeams = data
    ? data.teams.filter((item) => item.departmentId === departmentId)
    : []

  const availableTechnicians = data && departmentId && teamId
    ? data.technicians.filter((item) => item.teamId === teamId)
    : []

  const hasChanges = Boolean(data && (
    departmentId !== (data.incident.departmentId ?? '')
    || teamId !== (data.incident.teamId ?? '')
    || technicianId !== (data.incident.technicianId ?? '')
  ))

  return {
    data, departmentId, teamId, technicianId, availableTeams, availableTechnicians,
    loading, saving, error, success,
    selectIncident, selectDepartment, selectTeam, selectTechnician, retry, save, hasChanges,
    // Permite avisar del borrado del técnico antes de confirmar el cambio.
    clearsTechnician: Boolean(data?.incident.technicianId && !technicianId),
    replacesTechnician: Boolean(data?.incident.technicianId && technicianId
      && technicianId !== data.incident.technicianId),
  }
}
