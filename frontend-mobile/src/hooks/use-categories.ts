import { useCallback, useEffect, useState } from 'react';

import { fetchCategories } from '@/services/category.service';
import type { Category, FetchCategoriesResult } from '@/types/category';

export interface UseCategoriesResult {
  categories: Category[];
  isLoading: boolean;
  errorMessage: string | null;
  backendFallbackNotice: string | null;
  reload: () => void;
}

// Carga el catálogo de categorías al montar y expone el estado de carga y error
// para que la UI pueda pintar los chips sin bloquear el formulario.
export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([]);
  // La primera carga arranca al montar, por eso el estado inicial es cargando.
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backendFallbackNotice, setBackendFallbackNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // La carga se resuelve en los callbacks de la promesa (asíncronos), de modo
  // que el efecto no ejecuta setState de forma síncrona.
  useEffect(() => {
    // Bandera propia de esta ejecución: si se recarga o se desmonta, el cleanup
    // la apaga y la respuesta antigua no pisa a la nueva.
    let isActive = true;

    fetchCategories()
      .then((result: FetchCategoriesResult) => {
        if (!isActive) return;
        setCategories(result.categories);
        setErrorMessage(null);
        // Si el catálogo vino del mock, se informa del motivo del fallback
        // junto con el aviso genérico para que la UI lo muestre de forma visible.
        setBackendFallbackNotice(
          result.source === 'mock'
            ? `${result.backendErrorMessage ?? 'No se pudo conectar con el backend.'} Mostrando el catálogo de categorías guardado en el mock.`
            : null,
        );
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar las categorías. Inténtalo de nuevo.',
        );
        setBackendFallbackNotice(null);
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [reloadToken]);

  // El reseteo de carga y error vive aquí porque se invoca desde eventos de la UI,
  // no desde un efecto, y fuerza una nueva carga incrementando el token.
  const reload = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setBackendFallbackNotice(null);
    setReloadToken((value) => value + 1);
  }, []);

  return { categories, isLoading, errorMessage, backendFallbackNotice, reload };
}
