/* Gestiona la selección, la carga, el guardado y los mensajes. */

import { useEffect, useState } from 'react'
import { loadAssignmentData, saveDepartmentAssignment } from '../services/departmentAssignmentService.js'

/**
 * Gestiona los datos, la selección pendiente y los mensajes de la pantalla.
 * La selección del formulario se guarda aparte de la asignación confirmada.
 */
export default function useDepartmentAssignment() {
  const [incidentId, setIncidentId] = useState('INC-0031')
  const [data, setData] = useState(null)
  const [departmentId, setDepartmentId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // Carga al cambiar de incidencia o reintentar. Ignora respuestas antiguas
  // si el componente se desmonta o empieza una nueva carga.
  useEffect(() => {
    let active = true
    loadAssignmentData(incidentId)
      .then((result) => {
        if (!active) return
        setData(result)
        setDepartmentId(result.incident.departmentId ?? '')
      })
      .catch((err) => {
        if (!active) return
        setData(null)
        setError(err.message)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [incidentId, reloadKey])

  // Cambia de caso y limpia los mensajes del caso anterior.
  const selectIncident = (id) => {
    if (loading || saving || id === incidentId) return
    setLoading(true)
    setError('')
    setSuccess('')
    setIncidentId(id)
  }
  // Incrementar la clave vuelve a ejecutar la carga de la misma incidencia.
  const retry = () => {
    setLoading(true)
    setError('')
    setReloadKey((value) => value + 1)
  }
  // Actualiza solo el borrador; todavía no modifica la incidencia guardada.
  const selectDepartment = (id) => {
    setDepartmentId(id)
    setError('')
    setSuccess('')
  }
  /**
   * Guarda el cambio confirmado y actualiza tanto el detalle como la lista.
   * Convierte la opción vacía en null y devuelve si la operación tuvo éxito.
   */
  const save = async () => {
    if (saving || loading || !data) return false
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const updated = await saveDepartmentAssignment(incidentId, departmentId || null)
      setData((current) => ({
        ...current,
        incident: updated,
        incidents: current.incidents.map((item) => item.id === updated.id ? updated : item),
      }))
      setSuccess(departmentId ? 'Departamento asignado correctamente.' : 'Departamento desasignado correctamente.')
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setSaving(false)
    }
  }
  return {
    data, departmentId, loading, saving, error, success,
    selectIncident, selectDepartment, retry, save,
    // Impide guardar si la selección coincide con el departamento actual.
    hasChanges: Boolean(data && departmentId !== (data.incident.departmentId ?? '')),
  }
}
