/**
 * Simulated service for fetching and submitting incident validations.
 */

const mockIncident = {
  id: 'INC-2026-8942',
  category: 'Infraestructura Vial',
  location: {
    address: 'Av. de Andalucía, 32',
    coordinates: '36.7184° N, 4.4326° W',
    district: 'Cruz de Humilladero'
  },
  description: 'Se reporta un socavón de proporciones considerables en el carril derecho de circulación (dirección centro histórico). El asfalto ha cedido en un diámetro aproximado de 1.5 metros, dejando expuestas canalizaciones subterráneas que parecen ser de suministro de agua o telecomunicaciones. Varios vehículos han reportado daños en la suspensión y neumáticos al no poder esquivarlo, ya que la visibilidad en esta curva es reducida. Además, se observa un leve encharcamiento en el fondo del bache, lo que sugiere una posible fuga activa que podría estar socavando aún más la estructura base de la vía. Vecinos indican que las grietas comenzaron a formarse hace tres días tras las lluvias, pero el colapso principal ocurrió esta madrugada. Se requiere asistencia técnica urgente para acordonar el perímetro, evaluar el riesgo de hundimiento de los carriles adyacentes y coordinar con la empresa de aguas para el corte y reparación de la presunta fuga antes de proceder al asfaltado de emergencia.',
  timestamp: '2026-10-10T14:22:00Z',
  reporterId: 'USR-8821',
  evidenceUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=800',
  aiSuggestion: {
    priority: 'Alta',
    confidence: 94,
    reasoning: 'Detección de riesgo de accidente grave por socavón en vía principal y probable fuga de suministro hídrico que amenaza la estabilidad del terreno.'
  }
};

export const fetchPendingIncident = async (incidentId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockIncident);
    }, 600);
  });
};

export const submitValidationDecision = async (incidentId, payload) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!payload.justification || payload.justification.trim().length < 10) {
        reject(new Error('La justificación técnica es obligatoria (mín. 10 caracteres).'));
        return;
      }
      resolve({ success: true, timestamp: new Date().toISOString() });
    }, 800);
  });
};
