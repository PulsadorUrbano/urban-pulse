import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateIncidentPipe } from './create-incident.pipe.js';

describe('CreateIncidentPipe', () => {
  const pipe = new CreateIncidentPipe();
  const input = () => ({
    title: '  Farola apagada  ',
    description: '  La farola no ilumina la calle.  ',
    categoryId: randomUUID(),
    latitude: 0,
    longitude: -180,
  });

  it('normalizes a valid payload without coercing numbers', () => {
    expect(pipe.transform(input())).toEqual({
      title: 'Farola apagada',
      description: 'La farola no ilumina la calle.',
      categoryId: expect.any(String),
      latitude: 0,
      longitude: -180,
    });
  });

  it('accepts code-point title boundaries and coordinate extremes', () => {
    const value = input();
    value.title = '😀😀😀😀';
    value.latitude = -90;
    value.longitude = 180;

    expect(pipe.transform(value)).toMatchObject({
      title: '😀😀😀😀',
      latitude: -90,
      longitude: 180,
    });
  });

  it.each([
    null,
    [],
    'incident',
    { ...input(), title: 'abc' },
    { ...input(), title: 'a'.repeat(26) },
    { ...input(), description: 'short' },
    { ...input(), categoryId: 'not-a-uuid' },
    { ...input(), urbanAssetId: null },
    { ...input(), urbanAssetId: 'not-a-uuid' },
    { ...input(), latitude: '0' },
    { ...input(), latitude: 90.1 },
    { ...input(), longitude: -180.1 },
    { ...input(), latitude: Number.NaN },
    { ...input(), longitude: Number.POSITIVE_INFINITY },
    { ...input(), civicId: randomUUID() },
    { ...input(), status: 'reported' },
  ])('rejects invalid input: %j', (value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
