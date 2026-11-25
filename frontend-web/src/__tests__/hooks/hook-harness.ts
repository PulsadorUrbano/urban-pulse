import type { DependencyList, EffectCallback, SetStateAction } from 'react';

// Doble del ciclo de hooks para probar orquestación asíncrona sin DOM ni dependencias nuevas.
export function createHookHarness() {
  const values: unknown[] = [];
  const dependencies: (DependencyList | undefined)[] = [];
  const cleanups: (ReturnType<EffectCallback>)[] = [];
  let position = 0;
  let pending: (() => void)[] = [];

  function changed(index: number, next: DependencyList | undefined): boolean {
    const previous = dependencies[index];
    return !next || !previous || next.length !== previous.length
      || next.some((value, offset) => !Object.is(value, previous[offset]));
  }

  return {
    useState<T>(initial: T | (() => T)): [T, (next: SetStateAction<T>) => void] {
      const index = position++;
      if (!(index in values)) values[index] = typeof initial === 'function' ? (initial as () => T)() : initial;
      return [values[index] as T, (next) => {
        values[index] = typeof next === 'function'
          ? (next as (previous: T) => T)(values[index] as T) : next;
      }];
    },
    useMemo<T>(factory: () => T, next: DependencyList | undefined): T {
      const index = position++;
      if (changed(index, next)) {
        values[index] = factory();
        dependencies[index] = next;
      }
      return values[index] as T;
    },
    useEffect(callback: EffectCallback, next: DependencyList | undefined) {
      const index = position++;
      if (changed(index, next)) {
        dependencies[index] = next;
        pending.push(() => {
          const cleanup = cleanups[index];
          if (typeof cleanup === 'function') cleanup();
          cleanups[index] = callback();
        });
      }
    },
    render<T>(hook: () => T): T {
      position = 0;
      pending = [];
      const result = hook();
      pending.forEach((effect) => effect());
      return result;
    },
    unmount() {
      cleanups.forEach((cleanup) => { if (typeof cleanup === 'function') cleanup(); });
    },
  };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

export async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}
