import { useCallback, useEffect, useState } from 'react';

// Tema claro u oscuro de toda la app. Añade la clase 'dark' a <html> para Tailwind.
export function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const toggleTheme = useCallback(() => setIsDarkMode((current) => !current), []);

  return { isDarkMode, toggleTheme };
}
