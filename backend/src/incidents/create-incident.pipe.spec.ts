import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateIncidentPipe } from './create-incident.pipe.js';

describe('CreateIncidentPipe', () => {
  const pipe = new CreateIncidentPipe();
  const input = () => ({
    title: '  Farola apagada  ',
    description: '  La farola no ilumina la calle.  ',
    civicId: randomUUID(),
    categoryName: '  Iluminación  ',
    latitude: '0',
    longitude: '-180',
    accuracy: '8.5',
  });

  it('normalizes multipart text fields and converts finite numbers', () => {
    expect(pipe.transform(input())).toEqual({
      title: 'Farola apagada',
      description: 'La farola no ilumina la calle.',
      civicId: expect.any(String),
      categoryName: 'Iluminación',
      latitude: 0,
      longitude: -180,
      accuracy: 8.5,
    });
  });

  it.each(['a'.repeat(4), 'a'.repeat(26), 'a'.repeat(50), '😀'.repeat(50)])(
    'accepts trimmed titles up to 50 code points: %s',
    (title) => {
      expect(pipe.transform({ ...input(), title: `  ${title}  ` }).title).toBe(
        title,
      );
    },
  );
  it('accepts code-point title boundaries and coordinate extremes', () => {
    const value = input();
    value.title = '😀😀😀😀';
    value.latitude = '-90';
    value.longitude = '180';

    expect(pipe.transform(value)).toMatchObject({
      title: '😀😀😀😀',
      latitude: -90,
      longitude: 180,
    });
  });

  it('accepts an omitted description and accuracy', () => {
    const {
      description: _description,
      accuracy: _accuracy,
      ...value
    } = input();

    const result = pipe.transform(value);
    expect(result.title).toBe('Farola apagada');
    expect(result).not.toHaveProperty('description');
    expect(result).not.toHaveProperty('accuracy');
  });

  it.each([
    null,
    [],
    'incident',
    { ...input(), title: 'abc' },
    { ...input(), title: 'a'.repeat(51) },
    { ...input(), description: 'short' },
    { ...input(), civicId: 'not-a-uuid' },
    { ...input(), categoryName: '   ' },
    { ...input(), urbanAssetId: null },
    { ...input(), urbanAssetId: 'not-a-uuid' },
    { ...input(), latitude: 'NaN' },
    { ...input(), latitude: '90.1' },
    { ...input(), longitude: '-180.1' },
    { ...input(), longitude: 'Infinity' },
    { ...input(), accuracy: '' },
    { ...input(), accuracy: '-1' },
    { ...input(), civicId: undefined },
    { ...input(), status: 'reported' },
  ])('rejects invalid input: %j', (value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
