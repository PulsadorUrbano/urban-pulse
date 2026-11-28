import { runWithConcurrency } from '@/utils/run-with-concurrency';

// Promesa que se resuelve/rechaza desde fuera, para controlar cuándo termina cada tarea.
interface ControlledTask<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

function createControlledTask<T>(): ControlledTask<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

// Deja que las continuaciones pendientes (microtareas y la siguiente tarea) se ejecuten.
async function flushPendingWork(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe('runWithConcurrency', () => {
  it('con lista vacía devuelve [] sin llamar al worker', async () => {
    const worker = jest.fn(async (item: number) => item * 2);

    const results = await runWithConcurrency([], 4, worker);

    expect(results).toEqual([]);
    expect(worker).not.toHaveBeenCalled();
  });

  it('con más límite que elementos ejecuta todos y devuelve los resultados en orden', async () => {
    const results = await runWithConcurrency([1, 2, 3], 10, async (item) => item * 10);

    expect(results).toEqual([10, 20, 30]);
  });

  it('pasa el elemento y su índice al worker', async () => {
    const worker = jest.fn(async (item: string, index: number) => `${index}:${item}`);

    const results = await runWithConcurrency(['a', 'b'], 2, worker);

    expect(worker).toHaveBeenNthCalledWith(1, 'a', 0);
    expect(worker).toHaveBeenNthCalledWith(2, 'b', 1);
    expect(results).toEqual(['0:a', '1:b']);
  });

  it('conserva el orden de entrada aunque las tareas terminen en orden inverso', async () => {
    const itemCount = 4;
    const tasksByIndex = Array.from({ length: itemCount }, () => createControlledTask<string>());

    const resultPromise = runWithConcurrency([0, 1, 2, 3], itemCount, (_item, index) => tasksByIndex[index].promise);

    for (let index = itemCount - 1; index >= 0; index -= 1) {
      tasksByIndex[index].resolve(`resultado-${index}`);
      await flushPendingWork();
    }

    expect(await resultPromise).toEqual(['resultado-0', 'resultado-1', 'resultado-2', 'resultado-3']);
  });

  it('nunca tiene más de N tareas en vuelo a la vez y mantiene N en vuelo mientras queden elementos', async () => {
    const concurrencyLimit = 2;
    const itemCount = 6;
    const tasksByIndex = Array.from({ length: itemCount }, () => createControlledTask<number>());
    let inFlightCount = 0;
    let maxInFlightCount = 0;

    const resultPromise = runWithConcurrency(
      Array.from({ length: itemCount }, (_unused, index) => index),
      concurrencyLimit,
      async (_item, index) => {
        inFlightCount += 1;
        maxInFlightCount = Math.max(maxInFlightCount, inFlightCount);
        try {
          return await tasksByIndex[index].promise;
        } finally {
          inFlightCount -= 1;
        }
      },
    );

    await flushPendingWork();
    expect(inFlightCount).toBe(concurrencyLimit);

    for (let index = 0; index < itemCount; index += 1) {
      tasksByIndex[index].resolve(index);
      await flushPendingWork();
      expect(inFlightCount).toBeLessThanOrEqual(concurrencyLimit);
    }

    expect(await resultPromise).toEqual([0, 1, 2, 3, 4, 5]);
    expect(maxInFlightCount).toBe(concurrencyLimit);
  });

  it('con límite 1 ejecuta las tareas de una en una', async () => {
    const tasksByIndex = Array.from({ length: 3 }, () => createControlledTask<number>());
    const startedIndexes: number[] = [];

    const resultPromise = runWithConcurrency([0, 1, 2], 1, (_item, index) => {
      startedIndexes.push(index);
      return tasksByIndex[index].promise;
    });

    await flushPendingWork();
    expect(startedIndexes).toEqual([0]);

    tasksByIndex[0].resolve(0);
    await flushPendingWork();
    expect(startedIndexes).toEqual([0, 1]);

    tasksByIndex[1].resolve(1);
    await flushPendingWork();
    tasksByIndex[2].resolve(2);

    expect(await resultPromise).toEqual([0, 1, 2]);
  });

  it('propaga el primer error y la promesa se rechaza con ese mismo error', async () => {
    const workerError = new Error('fallo del detalle');

    await expect(
      runWithConcurrency([1, 2, 3], 3, async (item) => {
        if (item === 2) {
          throw workerError;
        }
        return item;
      }),
    ).rejects.toBe(workerError);
  });

  it('tras un error no lanza nuevas tareas aunque queden elementos pendientes', async () => {
    const itemCount = 6;
    const tasksByIndex = Array.from({ length: itemCount }, () => createControlledTask<number>());
    const startedIndexes: number[] = [];
    const workerError = new Error('boom');

    const resultPromise = runWithConcurrency(
      Array.from({ length: itemCount }, (_unused, index) => index),
      2,
      (_item, index) => {
        startedIndexes.push(index);
        return tasksByIndex[index].promise;
      },
    );
    // Evita rechazos sin manejar si la promesa se rechaza antes de la aserción.
    const settledResult = resultPromise.then(
      () => 'resuelta',
      (error: unknown) => error,
    );

    await flushPendingWork();
    expect(startedIndexes).toEqual([0, 1]);

    // Termina la 0 con éxito: la 2 arranca. Luego falla la 1.
    tasksByIndex[0].resolve(0);
    await flushPendingWork();
    expect(startedIndexes).toEqual([0, 1, 2]);

    tasksByIndex[1].reject(workerError);
    await flushPendingWork();

    // Las que siguen en vuelo terminan, pero no deben arrancar nuevas tareas.
    tasksByIndex[2].resolve(2);
    await flushPendingWork();
    tasksByIndex[3].resolve(3);
    await flushPendingWork();

    expect(await settledResult).toBe(workerError);
    expect(startedIndexes).toEqual([0, 1, 2]);
  });
});
