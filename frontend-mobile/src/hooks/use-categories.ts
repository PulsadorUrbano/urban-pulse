import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchCategories } from '@/services/category.service';
import type { Category } from '@/types/category';

export interface UseCategoriesResult {
  categories: Category[];
  isLoading: boolean;
  errorMessage: string | null;
  reload: () => void;
}

// Carga el catálogo de categorías al montar y expone el estado de carga y error
// para que la UI pueda pintar los chips sin bloquear el formulario.
export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([]);
  // La primera carga arranca al montar, por eso el estado inicial es cargando.
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Evita actualizar el estado si el componente se desmontó durante la carga.
  const isMountedRef = useRef(true);

  // La carga se resuelve en los callbacks de la promesa (asíncronos), de modo
  // que el efecto no ejecuta setState de forma síncrona.
  useEffect(() => {
    isMountedRef.current = true;

    fetchCategories()
      .then((loadedCategories) => {
        if (!isMountedRef.current) return;
        setCategories(loadedCategories);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (!isMountedRef.current) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar las categorías. Inténtalo de nuevo.',
        );
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      });

    return () => {
      isMountedRef.current = false;
    };
  }, [reloadToken]);

  // El reseteo de carga y error vive aquí porque se invoca desde eventos de la UI,
  // no desde un efecto, y fuerza una nueva carga incrementando el token.
  const reload = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setReloadToken((value) => value + 1);
  }, []);

  return { categories, isLoading, errorMessage, reload };
}
