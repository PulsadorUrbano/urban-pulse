/* Simula la lectura y el guardado de datos. */

import { applyIncidentAssignment } from '../utils/incidentAssignment.js'

const departments = [
  { id: 'dep-roads', name: 'Vías Públicas', description: 'Calzadas, aceras y señalización' },
  { id: 'dep-lighting', name: 'Alumbrado Público', description: 'Iluminación y mantenimiento eléctrico' },
  { id: 'dep-parks', name: 'Parques y Jardines', description: 'Arbolado y zonas verdes' },
  { id: 'dep-cleaning', name: 'Limpieza y Residuos', description: 'Limpieza viaria y contenedores' },
]
// Cada equipo pertenece a un único departamento; el técnico pertenece a su equipo.
const teams = [
  { id: 'team-roads', name: 'Brigada de mantenimiento vial', departmentId: 'dep-roads' },
  { id: 'team-sidewalks', name: 'Equipo de aceras y accesibilidad', departmentId: 'dep-roads' },
  { id: 'team-lighting', name: 'Equipo de alumbrado', departmentId: 'dep-lighting' },
  { id: 'team-lighting-maintenance', name: 'Mantenimiento eléctrico', departmentId: 'dep-lighting' },
  { id: 'team-parks', name: 'Mantenimiento de zonas verdes', departmentId: 'dep-parks' },
  { id: 'team-trees', name: 'Equipo de arbolado', departmentId: 'dep-parks' },
  { id: 'team-cleaning', name: 'Limpieza viaria', departmentId: 'dep-cleaning' },
  { id: 'team-waste', name: 'Mantenimiento de contenedores', departmentId: 'dep-cleaning' },
]
const technicians = [
  { id: 'tech-roads', name: 'Lucía Martín', teamId: 'team-roads' },
  { id: 'tech-roads-support', name: 'Diego Ruiz', teamId: 'team-roads' },
  { id: 'tech-sidewalks', name: 'Ana López', teamId: 'team-sidewalks' },
  { id: 'tech-lighting', name: 'Pablo García', teamId: 'team-lighting' },
  { id: 'tech-lighting-maintenance', name: 'Marta Sánchez', teamId: 'team-lighting-maintenance' },
  { id: 'tech-parks', name: 'Elena Romero', teamId: 'team-parks' },
  { id: 'tech-trees', name: 'Javier Torres', teamId: 'team-trees' },
  { id: 'tech-cleaning', name: 'Sara Molina', teamId: 'team-cleaning' },
]
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
 * Guarda departamento, equipo y técnico juntos, validando antes de escribir.
 * Si alguna selección falla, conserva toda la asignación guardada.
 * El estado de la incidencia se mantiene en cualquier asignación.
 */
export async function saveIncidentAssignment(incidentId, assignment) {
  await delay()
  const index = incidents.findIndex((item) => item.id === incidentId)
  if (index === -1) throw new Error('No se ha encontrado la incidencia.')
  const updated = applyIncidentAssignment(incidents[index], assignment, departments, teams, technicians)
  incidents = incidents.map((item, itemIndex) => itemIndex === index ? updated : item)
  return structuredClone(updated)
}
