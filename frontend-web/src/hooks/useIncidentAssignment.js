import { useEffect, useState } from 'react'
import { loadAssignmentData, saveIncidentAssignment } from '../services/assignmentService.js'

/**
 * Mantiene un borrador conjunto de departamento y equipo.
 * Los selectores dependen del borrador, pero la incidencia solo se actualiza
 * cuando el usuario confirma el guardado.
 */
export default function useIncidentAssignment() {
  const [incidentId, setIncidentId] = useState('INC-0032')
  const [data, setData] = useState(null)
  const [departmentId, setDepartmentId] = useState('')
  const [teamId, setTeamId] = useState('')
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

  // Cambiar el padre vacía el equipo del borrador y actualiza sus opciones.
  const selectDepartment = (id) => {
    if (id === departmentId) return
    setDepartmentId(id)
    setTeamId('')
    setError('')
    setSuccess('')
  }

  // Cambia solo el equipo del borrador, sin llamar todavía al servicio.
  const selectTeam = (id) => {
    setTeamId(id)
    setError('')
    setSuccess('')
  }

  /**
   * Guarda ambos campos en una sola operación tras la confirmación.
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

  const hasChanges = Boolean(data && (
    departmentId !== (data.incident.departmentId ?? '')
    || teamId !== (data.incident.teamId ?? '')
  ))

  return {
    data, departmentId, teamId, availableTeams, loading, saving, error, success,
    selectIncident, selectDepartment, selectTeam, retry, save, hasChanges,
    // Permite avisar del borrado del técnico antes de confirmar el cambio.
    clearsTechnician: Boolean(hasChanges && data?.incident.technicianId),
  }
}
