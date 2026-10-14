import { useEffect, useRef, useState } from 'react'
import useIncidentAssignment from '../hooks/useIncidentAssignment.js'

const statusLabels = { validated: 'Validada', assigned: 'Asignada' }
// Muestra nombres legibles para los identificadores de las asignaciones.
const findName = (items, id) => items.find((item) => item.id === id)?.name ?? 'Sin asignar'

/**
 * Confirma el borrador completo antes de guardarlo.
 * El técnico aparece solo como información; no se puede seleccionar aquí.
 */
function AssignmentConfirmation({ incident, departmentName, teamName, clearsTechnician, saving, error, onCancel, onConfirm }) {
  const dialogRef = useRef(null)
  // La ventana nativa limita el foco y bloquea el resto de la interfaz.
  useEffect(() => { dialogRef.current.showModal() }, [])

  // Escape cancela, excepto mientras se está guardando la operación.
  const handleCancel = (event) => {
    event.preventDefault()
    if (!saving) onCancel()
  }

  return (
    <dialog ref={dialogRef} className="confirmation-dialog"
      aria-labelledby="assignment-confirmation-title"
      aria-describedby="assignment-confirmation-description" onCancel={handleCancel}>
      <span className="eyebrow">CONFIRMAR CAMBIO</span>
      <h2 id="assignment-confirmation-title">Guardar asignación</h2>
      <p id="assignment-confirmation-description">
        Se guardarán los siguientes datos para la incidencia <strong>{incident.id}</strong>.
      </p>
      <dl className="confirmation-summary">
        <div><dt>Departamento</dt><dd>{departmentName}</dd></div>
        <div><dt>Equipo</dt><dd>{teamName}</dd></div>
      </dl>
      {clearsTechnician && <p className="notice warning">
        El técnico actual quedará sin asignar porque cambian sus asignaciones superiores.
      </p>}
      {error && <p role="alert" className="notice error">{error}</p>}
      <div className="dialog-actions">
        <button type="button" className="button secondary" disabled={saving} onClick={onCancel} autoFocus>Cancelar</button>
        <button type="button" className="button primary" disabled={saving} onClick={onConfirm}>
          {saving ? 'Guardando…' : 'Confirmar cambio'}
        </button>
      </div>
    </dialog>
  )
}

/**
 * Reúne departamento y equipo dentro del detalle de la incidencia.
 * El equipo se habilita según el departamento del borrador, sin cambiar de pantalla.
 */
export default function IncidentAssignmentView() {
  const assignment = useIncidentAssignment()
  const { data, departmentId, teamId, availableTeams, loading, saving, error,
    success, hasChanges, clearsTechnician } = assignment
  const [confirming, setConfirming] = useState(false)
  const submitRef = useRef(null)
  const incident = data?.incident
  const canEdit = ['validated', 'assigned'].includes(incident?.status)
  const selectedDepartment = data?.departments.find((item) => item.id === departmentId)
  const selectedTeam = availableTeams.find((item) => item.id === teamId)
  const completeAssignment = Boolean(incident?.departmentId && incident?.teamId && incident?.technicianId)

  // Cierra la confirmación conservando el borrador y devuelve el foco al formulario.
  const closeConfirmation = () => {
    setConfirming(false)
    requestAnimationFrame(() => {
      const submit = submitRef.current
      if (submit && !submit.disabled) submit.focus()
      else document.getElementById('department')?.focus()
    })
  }

  // El envío únicamente abre la confirmación; todavía no modifica los datos.
  const handleSubmit = (event) => {
    event.preventDefault()
    if (hasChanges && canEdit && !saving && !confirming) setConfirming(true)
  }

  // Cierra la ventana solo tras guardar correctamente ambos campos.
  const confirmAssignment = async () => {
    if (await assignment.save()) closeConfirmation()
  }

  return (
    <div className="workspace">
      <a className="skip-link" href="#assignment-form">Saltar a la asignación</a>
      <header className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true">U</span>
          <span>Urban<span className="brand-light">Pulse</span></span></div>
        <span className="workspace-label">Gestión de incidencias</span>
        <span className="header-tag">Personal municipal</span>
      </header>
      <main className="main-content">
        <div className="page-heading">
          <div><p className="eyebrow">GESTIÓN MUNICIPAL / ASIGNACIÓN</p>
            <h1>Asignación de incidencia</h1>
            <p className="page-description">Selecciona el departamento y después uno de sus equipos.</p></div>
          <span className="task-tag">Tareas #31 · #32</span>
        </div>
        <p className="demo-notice"><span className="demo-dot" aria-hidden="true" />
          Entorno de prueba · Los cambios son simulados y se reinician al recargar la página.</p>
        <div className="assignment-layout">
          <aside className="incident-panel" aria-label="Incidencias de prueba">
            <div className="panel-heading"><h2>Incidencias</h2>
              <span className="count-badge">{data?.incidents.length ?? '—'}</span></div>
            <p className="panel-description">Selecciona un caso para probar la asignación.</p>
            {data ? <div className="incident-list">{data.incidents.map((item) => (
              <button key={item.id} type="button"
                className={['incident-option', incident.id === item.id ? 'selected' : ''].join(' ')}
                aria-pressed={incident.id === item.id} onClick={() => assignment.selectIncident(item.id)}
                disabled={loading || saving || confirming}>
                <span className="incident-reference">{item.id}<span className="incident-arrow" aria-hidden="true">↗</span></span>
                <span className="incident-option-title">{item.title}</span>
                <span className="incident-option-detail">{item.district}</span>
                <span className={'status-tag ' + item.status}>{statusLabels[item.status]}</span>
              </button>
            ))}</div> : <p role="status" className="panel-description">
              {loading ? 'Cargando casos…' : 'No se han podido cargar los casos.'}</p>}
            <div className="panel-footnote"><strong>Departamento → Equipo → Técnico</strong>
              <p>Cambiar un departamento vacía el equipo seleccionado. Los hijos se actualizan al confirmar.</p></div>
          </aside>

          <section className="detail-panel" aria-label="Detalle y asignación" aria-busy={loading || saving}>
            {loading ? <div className="loading-state" role="status"><span className="spinner" aria-hidden="true" />
              Cargando incidencia…</div>
              : !incident ? <div className="empty-state">
                <p role="alert">{error || 'No se pudo cargar la incidencia.'}</p>
                <button type="button" className="button secondary" onClick={assignment.retry}>Reintentar</button>
              </div> : <>
                <div className="incident-detail-heading"><div><p className="eyebrow">{incident.id}</p>
                  <h2>{incident.title}</h2></div>
                  <span className={'status-tag ' + incident.status}>{statusLabels[incident.status]}</span></div>
                <div className="incident-metadata"><span>{incident.address}</span>
                  <span>{incident.district}</span><span>Prioridad {incident.priority.toLowerCase()}</span></div>
                <p className="incident-description">{incident.description}</p>

                <div className="current-assignment"><h3>Asignación guardada</h3><dl>
                  <div><dt>Departamento</dt><dd>{findName(data.departments, incident.departmentId)}</dd></div>
                  <div><dt>Equipo</dt><dd>{findName(data.teams, incident.teamId)}</dd></div>
                  <div><dt>Técnico actual</dt><dd>{findName(data.technicians, incident.technicianId)}</dd></div>
                </dl></div>
                <p className={'assignment-completeness ' + (completeAssignment ? 'complete' : '')}>
                  {completeAssignment
                    ? 'La asignación guardada tiene departamento, equipo y técnico.'
                    : 'Para procesar la incidencia se necesitan departamento, equipo y técnico. Puedes guardar asignaciones intermedias.'}
                </p>

                <form id="assignment-form" onSubmit={handleSubmit}>
                  <div className="form-heading"><span className="step-number" aria-hidden="true">01</span>
                    <div><h3>Departamento responsable</h3><p>Selecciona el servicio que gestionará esta incidencia.</p></div></div>
                  <label htmlFor="department">Departamento</label>
                  <select id="department" value={departmentId}
                    onChange={(event) => assignment.selectDepartment(event.target.value)}
                    disabled={!canEdit || saving || confirming} aria-describedby="department-help">
                    <option value="">Sin departamento</option>
                    {data.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <p id="department-help" className="field-help">
                    {selectedDepartment?.description ?? 'Selecciona un departamento para habilitar el equipo.'}
                  </p>

                  <div className="form-heading"><span className="step-number" aria-hidden="true">02</span>
                    <div><h3>Equipo responsable</h3><p>Solo se muestran los equipos del departamento seleccionado.</p></div></div>
                  <label htmlFor="team">Equipo</label>
                  <select id="team" value={teamId} onChange={(event) => assignment.selectTeam(event.target.value)}
                    disabled={!canEdit || !departmentId || saving || confirming} aria-describedby="team-help">
                    <option value="">Sin equipo</option>
                    {availableTeams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <p id="team-help" className="field-help">
                    {!departmentId ? 'Elige primero un departamento en el desplegable de arriba.'
                      : availableTeams.length === 0 ? 'Este departamento no tiene equipos disponibles.'
                        : 'Equipos de ' + selectedDepartment.name + '. No necesitas guardar el departamento primero.'}
                  </p>
                  {clearsTechnician && <p className="notice warning">
                    Al confirmar, el técnico actual quedará sin asignar.
                  </p>}
                  {error && !confirming && <p role="alert" className="notice error">{error}</p>}
                  {success && <p role="status" className="notice success">✓ {success}</p>}
                  <div className="form-actions"><span className="save-hint">
                    {hasChanges ? 'Tienes cambios pendientes de guardar' : 'No hay cambios pendientes'}</span>
                    <button ref={submitRef} type="submit" className="button primary"
                      disabled={!canEdit || !hasChanges || saving || confirming}>
                      Guardar asignación <span aria-hidden="true">→</span></button></div>
                </form>
              </>}
          </section>
        </div>
        <footer className="page-footer">UrbanPulse · Plataforma de incidencias urbanas de Málaga</footer>
      </main>
      {confirming && incident && <AssignmentConfirmation incident={incident}
        departmentName={selectedDepartment?.name ?? 'Sin asignar'}
        teamName={selectedTeam?.name ?? 'Sin asignar'} clearsTechnician={clearsTechnician}
        saving={saving} error={error} onCancel={closeConfirmation} onConfirm={confirmAssignment} />}
    </div>
  )
}
