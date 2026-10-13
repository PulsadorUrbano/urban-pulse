/* Dibuja la pantalla y la confirmacion. */

import { useEffect, useRef, useState } from 'react'
import useDepartmentAssignment from '../hooks/useDepartmentAssignment.js'

const statusLabels = { validated: 'Validada', assigned: 'Asignada' }
// Convierte el identificador almacenado en un nombre legible para la pantalla.
const findName = (items, id) => items.find((item) => item.id === id)?.name ?? 'Sin asignar'

/**
 * Pide confirmación antes de guardar y avisa de las asignaciones dependientes.
 * El diálogo nativo mantiene el foco dentro de la ventana mientras está abierta.
 */
function AssignmentConfirmation({ incident, departmentName, clearingDependencies, saving, error, onCancel, onConfirm }) {
  const dialogRef = useRef(null)
  // Abre la ventana al montarla; durante el guardado no permite cancelarla.
  useEffect(() => { dialogRef.current.showModal() }, [])
  // Escape equivale a cancelar, salvo mientras se está guardando el cambio.
  const handleCancel = (event) => {
    event.preventDefault()
    if (!saving) onCancel()
  }
  return (
    <dialog ref={dialogRef} className="confirmation-dialog" aria-labelledby="confirmation-title" aria-describedby="confirmation-description"
      onCancel={handleCancel}>
      <span className="eyebrow">CONFIRMAR CAMBIO</span>
      <h2 id="confirmation-title">{departmentName ? 'Confirmar departamento' : 'Desasignar departamento'}</h2>
      <p id="confirmation-description">
        {departmentName
          ? <>La incidencia <strong>{incident.id}</strong> se asignará a <strong>{departmentName}</strong>.</>
          : <>La incidencia <strong>{incident.id}</strong> quedará sin departamento.</>}
      </p>
      {clearingDependencies && <div className="notice warning">Se eliminarán también las asignaciones actuales de equipo y técnico. Podrás volver a asignarlos en sus respectivos módulos.</div>}
      {error && <p role="alert" className="notice error">{error}</p>}
      <div className="dialog-actions">
        <button type="button" className="button secondary" onClick={onCancel} disabled={saving} autoFocus>Cancelar</button>
        <button type="button" className="button primary" onClick={onConfirm} disabled={saving}>{saving ? 'Guardando…' : 'Confirmar cambio'}</button>
      </div>
    </dialog>
  )
}

// Compone la lista de casos, el detalle y el formulario de departamento.
export default function DepartmentAssignmentView() {
  const assignment = useDepartmentAssignment()
  const { data, departmentId, loading, saving, error, success, hasChanges } = assignment
  const [confirming, setConfirming] = useState(false)
  const submitRef = useRef(null)
  const incident = data?.incident
  const selectedDepartment = data?.departments.find((item) => item.id === departmentId)
  const clearingDependencies = Boolean(incident && (incident.teamId || incident.technicianId))
  // Cierra la ventana y devuelve el foco al formulario para continuar con teclado.
  const closeConfirmation = () => {
    setConfirming(false)
    requestAnimationFrame(() => {
      const submit = submitRef.current
      if (submit && !submit.disabled) submit.focus()
      else document.getElementById('department')?.focus()
    })
  }
  // Solo cierra la confirmación si se guarda; si falla, mantiene visible el error.
  const confirmAssignment = async () => {
    if (await assignment.save()) closeConfirmation()
  }
  // Evita la recarga del formulario y pide confirmación antes de guardar.
  const handleSubmit = (event) => {
    event.preventDefault()
    if (hasChanges && !saving && !confirming) setConfirming(true)
  }
  return (
    <div className="workspace">
      <a className="skip-link" href="#assignment-form">Saltar a la asignación</a>
      <header className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true">U</span><span>Urban<span className="brand-light">Pulse</span></span></div>
        <span className="workspace-label">Gestión de incidencias</span>
        <span className="header-tag">Personal municipal</span>
      </header>
      <main className="main-content">
        <div className="page-heading">
          <div><p className="eyebrow">GESTIÓN MUNICIPAL / ASIGNACIÓN</p><h1>Asignar departamento</h1><p className="page-description">Dirige cada incidencia al servicio responsable de su resolución.</p></div>
          <span className="task-tag">Tarea #31</span>
        </div>
        <p className="demo-notice"><span className="demo-dot" aria-hidden="true" />Entorno de prueba · Los cambios son simulados y se reinician al recargar la página.</p>
        <div className="assignment-layout">
          <aside className="incident-panel" aria-label="Incidencias de prueba">
            <div className="panel-heading"><h2>Incidencias</h2><span className="count-badge">3</span></div>
            <p className="panel-description">Selecciona un caso para probar la asignación.</p>
            {data ? <div className="incident-list">{data.incidents.map((item) => (
              <button key={item.id} type="button" className={['incident-option', incident.id === item.id ? 'selected' : ''].join(' ')}
                aria-pressed={incident.id === item.id} onClick={() => assignment.selectIncident(item.id)} disabled={loading || saving || confirming}>
                <span className="incident-reference">{item.id}<span className="incident-arrow" aria-hidden="true">↗</span></span>
                <span className="incident-option-title">{item.title}</span>
                <span className="incident-option-detail">{item.district}</span>
                <span className={'status-tag ' + item.status}>{statusLabels[item.status]}</span>
              </button>
            ))}</div> : <p role="status" className="panel-description">{loading ? 'Cargando casos…' : 'No se han podido cargar los casos.'}</p>}
            <div className="panel-footnote"><strong>Departamento → Equipo → Técnico</strong><p>Al cambiar el departamento se vacían las asignaciones que dependen de él.</p></div>
          </aside>
          <section className="detail-panel" aria-label="Detalle y asignación" aria-busy={loading || saving}>
            {loading ? <div className="loading-state" role="status"><span className="spinner" aria-hidden="true" />Cargando incidencia…</div> : !incident ? (
              <div className="empty-state"><p role="alert">{error || 'No se pudo cargar la incidencia.'}</p><button type="button" className="button secondary" onClick={assignment.retry}>Reintentar</button></div>
            ) : <>
              <div className="incident-detail-heading"><div><p className="eyebrow">{incident.id}</p><h2>{incident.title}</h2></div><span className={'status-tag ' + incident.status}>{statusLabels[incident.status]}</span></div>
              <div className="incident-metadata"><span>{incident.address}</span><span>{incident.district}</span><span>Prioridad {incident.priority.toLowerCase()}</span></div>
              <p className="incident-description">{incident.description}</p>
              <div className="current-assignment"><h3>Asignación actual</h3><dl>
                <div><dt>Departamento</dt><dd>{findName(data.departments, incident.departmentId)}</dd></div>
                <div><dt>Equipo</dt><dd>{findName(data.teams, incident.teamId)}</dd></div>
                <div><dt>Técnico</dt><dd>{findName(data.technicians, incident.technicianId)}</dd></div>
              </dl></div>
              {/* Enviar el formulario abre la confirmación; todavía no guarda. */}
              <form id="assignment-form" onSubmit={handleSubmit}>
                <div className="form-heading"><span className="step-number" aria-hidden="true">01</span><div><h3>Departamento responsable</h3><p>Selecciona el servicio que gestionará esta incidencia.</p></div></div>
                <label htmlFor="department">Departamento</label>
                <select id="department" value={departmentId} onChange={(event) => assignment.selectDepartment(event.target.value)} disabled={saving || confirming} aria-describedby="department-help">
                  <option value="">Sin departamento</option>
                  {data.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <p id="department-help" className="field-help">{selectedDepartment?.description ?? 'Selecciona un departamento o deja la incidencia sin asignar.'}</p>
                {hasChanges && clearingDependencies && <p className="notice warning">Este cambio dejará equipo y técnico sin asignar. Se pedirá confirmación antes de guardarlo.</p>}
                {error && !confirming && <p role="alert" className="notice error">{error}</p>}
                {success && <p role="status" className="notice success">✓ {success}</p>}
                <div className="form-actions"><span className="save-hint">{hasChanges ? 'Tienes cambios pendientes de guardar' : 'No hay cambios pendientes'}</span><button ref={submitRef} type="submit" className="button primary" disabled={!hasChanges || saving || confirming}>Guardar asignación <span aria-hidden="true">→</span></button></div>
              </form>
            </>}
          </section>
        </div>
        <footer className="page-footer">UrbanPulse · Plataforma de incidencias urbanas de Málaga</footer>
      </main>
      {confirming && incident && <AssignmentConfirmation incident={incident} departmentName={selectedDepartment?.name} clearingDependencies={clearingDependencies} saving={saving} error={error} onCancel={closeConfirmation} onConfirm={confirmAssignment} />}
    </div>
  )
}
