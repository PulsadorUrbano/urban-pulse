import { useCallback, useState } from 'react';

export interface UseLocationPreferenceResult {
  isLocationEnabled: boolean;
  toggleLocation: () => void;
}

// Preferencia local del formulario: recuerda si el usuario quiere adjuntar la
// ubicación a la incidencia. Solo vive en memoria durante la sesión actual.
export function useLocationPreference(initialEnabled = true): UseLocationPreferenceResult {
  const [isLocationEnabled, setIsLocationEnabled] = useState(initialEnabled);

  const toggleLocation = useCallback(() => {
    setIsLocationEnabled((previousValue) => !previousValue);
  }, []);

  return { isLocationEnabled, toggleLocation };
}
