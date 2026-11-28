// Ejecuta `worker` sobre cada elemento con como máximo `concurrencyLimit`
// tareas en vuelo a la vez. Conserva el orden de entrada en el resultado.
// Si un worker lanza, la promesa resultante se rechaza con ese error y no se
// lanzan más tareas nuevas.
export async function runWithConcurrency<Input, Output>(
  items: readonly Input[],
  concurrencyLimit: number,
  worker: (item: Input, index: number) => Promise<Output>,
): Promise<Output[]> {
  const results: Output[] = new Array<Output>(items.length);
  let nextIndex = 0;
  let hasFailed = false;

  async function runNext(): Promise<void> {
    while (!hasFailed && nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      try {
        results[currentIndex] = await worker(items[currentIndex], currentIndex);
      } catch (error) {
        hasFailed = true;
        throw error;
      }
    }
  }

  const runnerCount = Math.max(1, Math.min(concurrencyLimit, items.length));
  const runners = Array.from({ length: runnerCount }, () => runNext());
  await Promise.all(runners);
  return results;
}
