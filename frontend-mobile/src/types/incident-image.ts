// Contrato de datos para las imágenes asociadas a una incidencia.
// `url` e `incidentId` son obligatorios: una imagen sin incidencia o sin
// referencia visual no puede persistirse en el mock server.

export interface IncidentImage {
  id: string;
  // URI local (`file://...`) o URL pública de la imagen capturada o adjuntada.
  url: string;
  // Identificador de la incidencia a la que pertenece la imagen.
  incidentId: string;
}

// Payload mínimo para crear una nueva imagen de incidencia.
// El `id` lo genera el cliente o json-server al persistir el registro.
export interface CreateIncidentImageInput {
  url: string;
  incidentId: string;
}
