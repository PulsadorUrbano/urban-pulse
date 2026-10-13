/* Simula la lectura y el guardado de datos. */

import { applyDepartmentAssignment } from '../utils/departmentAssignment.js'

const departments = [
  { id: 'dep-roads', name: 'Vías Públicas', description: 'Calzadas, aceras y señalización' },
  { id: 'dep-lighting', name: 'Alumbrado Público', description: 'Iluminación y mantenimiento eléctrico' },
  { id: 'dep-parks', name: 'Parques y Jardines', description: 'Arbolado y zonas verdes' },
  { id: 'dep-cleaning', name: 'Limpieza y Residuos', description: 'Limpieza viaria y contenedores' },
]
const teams = [{ id: 'team-roads', name: 'Brigada de mantenimiento vial' }]
const technicians = [{ id: 'tech-roads', name: 'Lucía Martín' }]
let incidents = [
  {
    id: 'INC-0031', title: 'Bache en avenida de Andalucía',
    description: 'Bache en el carril derecho, junto al paso de peatones. El reporte ha sido validado y está pendiente de asignación.',
    address: 'Av. de Andalucía, 32', district: 'Cruz del Humilladero',
    category: 'Vía pública', priority: 'Alta', status: 'validated',
    departmentId: null, teamId: null, technicianId: null,
  },
  {
    id: 'INC-0032', title: 'Acerado deteriorado en Teatinos',
    description: 'Varias losetas están sueltas en la acera. La incidencia tiene departamento, equipo y técnico asignados.',
    address: 'Calle del Mesonero, 8', district: 'Teatinos-Universidad',
    category: 'Vía pública', priority: 'Media', status: 'assigned',
    departmentId: 'dep-roads', teamId: 'team-roads', technicianId: 'tech-roads',
  },
  {
    id: 'INC-0033', title: 'Contenedor con tapa dañada',
    description: 'La tapa del contenedor no cierra correctamente. Está asignada a Limpieza y Residuos y todavía no tiene equipo ni técnico.',
    address: 'Calle Larios, 6', district: 'Centro',
    category: 'Residuos', priority: 'Baja', status: 'assigned',
    departmentId: 'dep-cleaning', teamId: null, technicianId: null,
  },
]
// Simula una respuesta de red para poder visualizar el estado de carga.
const delay = () => new Promise((resolve) => setTimeout(resolve, 300))

/**
 * Carga la incidencia y los catálogos necesarios para mostrar la pantalla.
 * Devuelve copias independientes para que la interfaz no modifique los mocks.
 * La API real sustituirá este servicio; los datos actuales viven en memoria.
 */
export async function loadAssignmentData(incidentId) {
  await delay()
  const incident = incidents.find((item) => item.id === incidentId)
  if (!incident) throw new Error('No se ha encontrado la incidencia.')
  return structuredClone({ incident, incidents, departments, teams, technicians })
}

/**
 * Aplica las reglas y reemplaza la incidencia en la colección simulada.
 * Los cambios se mantienen al alternar casos, pero se pierden al recargar.
 */
export async function saveDepartmentAssignment(incidentId, departmentId) {
  await delay()
  const index = incidents.findIndex((item) => item.id === incidentId)
  if (index === -1) throw new Error('No se ha encontrado la incidencia.')
  const updated = applyDepartmentAssignment(incidents[index], departmentId, departments)
  incidents = incidents.map((item, itemIndex) => itemIndex === index ? updated : item)
  return structuredClone(updated)
}
