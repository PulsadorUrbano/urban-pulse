// Tipos de reparto-fotos.mjs para importarlo desde las pruebas en TypeScript.
export interface OpcionesReparto<Asignacion, Fila> {
  asignaciones: readonly Asignacion[];
  concurrencia: number;
  tamanoLote: number;
  copiar: (asignacion: Asignacion) => Promise<Fila>;
  registrarLote: (filas: Fila[]) => Promise<unknown>;
  alFallarCopia?: (asignacion: Asignacion, error: unknown) => void;
  alRegistrarLote?: (totalRegistradas: number) => void;
}

export function copiarYRegistrar<Asignacion, Fila>(
  opciones: OpcionesReparto<Asignacion, Fila>,
): Promise<{ insertadas: number; fallidas: number }>;
