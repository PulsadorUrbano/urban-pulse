import { BadRequestException } from '@nestjs/common';
import { ListarIncidenciasPipe } from '../../../src/incidents/listar-incidencias.pipe.js';

const idCiudadano = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('Validación de la consulta de incidencias', () => {
  const pipe = new ListarIncidenciasPipe();

  it('acepta un único UUID y normaliza sus mayúsculas', async () => {
    await expect(
      pipe.transform({ civicId: idCiudadano.toUpperCase() }),
    ).resolves.toMatchObject({ civicId: idCiudadano, limit: 10 });
  });

  it('aplica el límite predeterminado de 10 en la primera página', async () => {
    await expect(pipe.transform({})).resolves.toEqual({
      civicId: undefined,
      limit: 10,
      cursor: undefined,
      order: 'newest',
    });
  });

  it('acepta y normaliza los filtros combinados', async () => {
    await expect(
      pipe.transform({
        status: 'validated',
        from: '2026-11-01',
        to: '2026-11-25',
        order: 'oldest',
        priority: 'high',
        categoryId: idCiudadano.toUpperCase(),
      }),
    ).resolves.toMatchObject({
      status: 'validated',
      from: '2026-11-01',
      to: '2026-11-25',
      order: 'oldest',
      priority: 'high',
      categoryId: idCiudadano,
    });
  });

  it.each([
    { status: 'unknown' },
    { status: ['reported', 'validated'] },
    { from: '2026-02-30' },
    { from: '2026-1-01' },
    { to: 'ayer' },
    { from: '2026-11-26', to: '2026-11-25' },
    { order: 'recent' },
    { priority: 'urgent' },
    { categoryId: 'incorrecto' },
    { categoryId: null },
  ])('rechaza un filtro inválido: %j', async (consulta) => {
    await expect(pipe.transform(consulta)).rejects.toThrow(BadRequestException);
  });

  it('rechaza reutilizar un cursor si cambia cualquier filtro', async () => {
    const filtros = {
      order: 'oldest',
      status: 'reported',
      from: '2026-11-01',
      to: '2026-11-25',
      priority: 'low',
      categoryId: idCiudadano,
    };
    const cursor = Buffer.from(
      JSON.stringify({
        id: idCiudadano,
        createdAt: '2026-11-10T10:00:00.000Z',
        pagina: 1,
        civicId: null,
        filtros,
      }),
    ).toString('base64url');
    await expect(pipe.transform({ cursor, ...filtros })).resolves.toMatchObject(
      {
        cursor: { filtros },
      },
    );
    for (const campo of Object.keys(filtros)) {
      const cambiados = { ...filtros };
      delete (cambiados as Record<string, unknown>)[campo];
      await expect(pipe.transform({ cursor, ...cambiados })).rejects.toThrow(
        BadRequestException,
      );
    }
  });

  it.each([
    ['límite mínimo', '1', 1],
    ['límite máximo', '100', 100],
  ])('acepta el %s', async (_caso, limit, esperado) => {
    await expect(pipe.transform({ limit })).resolves.toMatchObject({
      limit: esperado,
    });
  });

  it('rechaza límites inválidos y cursores mal formados', async () => {
    await expect(pipe.transform({ limit: '0' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(pipe.transform({ limit: '101' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(pipe.transform({ limit: '1.5' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(pipe.transform({ cursor: 'invalido' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it.each([
    ['sin consulta', undefined],
    ['consulta nula', null],
    ['consulta primitiva', 'ciudadano'],
    ['consulta como array', []],
    ['filtro vacío', { civicId: '' }],
    ['filtro nulo', { civicId: null }],
    ['filtro numérico', { civicId: 27 }],
    ['UUID incorrecto', { civicId: 'ciudadano' }],
    ['UUID con espacios', { civicId: ' aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }],
    ['filtro repetido', { civicId: ['a', 'a'] }],
    ['filtro anidado', { civicId: { id: 'a' } }],
    ['parámetro desconocido', { inesperado: 'reported' }],
  ])('rechaza %s', async (_caso, consulta) => {
    await expect(pipe.transform(consulta)).rejects.toThrow(BadRequestException);
  });
});
