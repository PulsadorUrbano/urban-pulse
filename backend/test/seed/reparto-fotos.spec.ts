import { describe, expect, it } from 'vitest';
import { copiarYRegistrar } from '../../prisma/seed/reparto-fotos.mjs';

// Espera un ciclo del bucle de eventos para que las copias simuladas se solapen como en S3.
const esperarTurno = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('copiarYRegistrar (reparto de fotos del seed)', () => {
  it('registra todas las copias en lotes y cuenta las copias fallidas', async () => {
    const asignaciones = Array.from({ length: 10 }, (_, indice) => indice);
    const lotes: number[][] = [];

    const resultado = await copiarYRegistrar({
      asignaciones,
      concurrencia: 3,
      tamanoLote: 4,
      copiar: async (indice: number) => {
        await esperarTurno();
        if (indice === 7) throw new Error('fallo de S3');
        return indice;
      },
      registrarLote: async (lote: number[]) => {
        lotes.push(lote);
      },
    });

    expect(resultado).toEqual({ insertadas: 9, fallidas: 1 });
    expect(lotes.flat().sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 8, 9]);
  });

  it('si falla el registro en la BD, deja de repartir copias y espera a las que están en curso', async () => {
    const asignaciones = Array.from({ length: 100 }, (_, indice) => indice);
    const errorBd = new Error('fallo de createMany');
    const eventos: string[] = [];
    let copiasEnCurso = 0;

    const ejecucion = copiarYRegistrar({
      asignaciones,
      concurrencia: 4,
      tamanoLote: 2,
      copiar: async (indice: number) => {
        eventos.push('inicio-copia');
        copiasEnCurso++;
        await esperarTurno();
        copiasEnCurso--;
        return indice;
      },
      // El fallo se conoce un turno después de la llamada, como en una consulta real.
      registrarLote: async () => {
        eventos.push('registro');
        await esperarTurno();
        eventos.push('fallo-bd');
        throw errorBd;
      },
    });

    await expect(ejecucion).rejects.toBe(errorBd);
    // Cuando la llamada termina (y el script desconectaría Prisma) no queda ninguna copia activa.
    expect(copiasEnCurso).toBe(0);
    // Desde que se conoce el fallo no empieza ninguna copia nueva ni se intenta otro lote.
    const trasElFallo = eventos.slice(eventos.indexOf('fallo-bd') + 1);
    expect(trasElFallo).not.toContain('inicio-copia');
    expect(trasElFallo).not.toContain('registro');
    expect(eventos.filter((evento) => evento === 'inicio-copia').length).toBeLessThan(asignaciones.length);
  });
});
