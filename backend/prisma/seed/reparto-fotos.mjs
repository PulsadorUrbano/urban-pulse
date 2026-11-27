// Reparto de las copias de fotos entre trabajadores concurrentes, separado del script
// fotos-incidencias.mjs para poder probarlo sin S3 ni BD (test/seed/reparto-fotos.spec.ts).
//
// - copiar(asignacion): copia la foto en S3 y devuelve la fila IncidentImage. Si falla,
//   la copia se cuenta como fallida y se sigue con la siguiente.
// - registrarLote(filas): inserta un lote de filas en la BD. Si falla, se deja de
//   repartir tareas nuevas, se espera a que terminen las copias en curso y se relanza
//   el error, de modo que quien llama no desconecta la BD con trabajadores activos.
export async function copiarYRegistrar({
  asignaciones,
  concurrencia,
  tamanoLote,
  copiar,
  registrarLote,
  alFallarCopia = () => {},
  alRegistrarLote = () => {},
}) {
  let pendientes = [];
  let siguiente = 0;
  let insertadas = 0;
  let fallidas = 0;
  let errorBd = null;

  const volcar = async () => {
    if (pendientes.length === 0) return;
    const lote = pendientes;
    pendientes = [];
    await registrarLote(lote);
    insertadas += lote.length;
    alRegistrarLote(insertadas);
  };

  const trabajador = async () => {
    while (errorBd === null && siguiente < asignaciones.length) {
      const asignacion = asignaciones[siguiente++];
      let fila;
      try {
        fila = await copiar(asignacion);
      } catch (error) {
        fallidas++;
        alFallarCopia(asignacion, error);
        continue;
      }
      pendientes.push(fila);
      // Tras un fallo de la BD, las copias que estaban en curso no lanzan más registros.
      if (errorBd === null && pendientes.length >= tamanoLote) {
        try {
          await volcar();
        } catch (error) {
          errorBd ??= error;
        }
      }
    }
  };

  // allSettled: se espera a todos los trabajadores aunque alguno falle de forma inesperada.
  const resultados = await Promise.allSettled(Array.from({ length: concurrencia }, trabajador));
  const rechazo = resultados.find((resultado) => resultado.status === 'rejected');
  if (errorBd === null && rechazo) errorBd = rechazo.reason;
  if (errorBd !== null) throw errorBd;

  await volcar();
  return { insertadas, fallidas };
}
