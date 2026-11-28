import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { IncidentsService } from '../../../src/incidents/incidents.service.js';
import { GeocodificacionInversaService } from '../../../src/incidents/services/geocodificacion-inversa.service.js';
import { PrismaService } from '../../../src/prisma/prisma.service.js';
import { crearGeocodificadorInversoFalso } from './geocodificador-inverso.fake.js';
import { crearPrismaIncidenciasFake } from './prisma-incidencias.fake.js';

describe('IncidentsService', () => {
  const input = {
    title: 'Farola apagada',
    description: 'La farola no ilumina la calle.',
    civicId: randomUUID(),
    categoryId: randomUUID(),
    category: 'Iluminación',
    latitude: 36.7213,
    longitude: -4.4214,
    accuracy: 8.5,
  };
  const operador = {
    id: randomUUID(),
    role: 'admin',
    ciudadanoId: null,
  } as const;
  const propietario = {
    id: input.civicId,
    role: 'civic',
    ciudadanoId: input.civicId,
  } as const;

  let service: IncidentsService;
  let prisma: ReturnType<typeof crearPrismaIncidenciasFake>;
  let geocodificador: ReturnType<typeof crearGeocodificadorInversoFalso>;

  async function crearServicio(
    fake = crearPrismaIncidenciasFake(),
    resolverFalso = crearGeocodificadorInversoFalso(),
  ) {
    prisma = fake;
    geocodificador = resolverFalso;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: PrismaService, useValue: prisma.prisma },
        {
          provide: GeocodificacionInversaService,
          useValue: geocodificador,
        },
      ],
    }).compile();
    service = module.get(IncidentsService);
    return module;
  }

  it('crea y consulta una incidencia Prisma con images vacío por compatibilidad', async () => {
    const module = await crearServicio();
    const created = await service.create(input);

    expect(created).toMatchObject({
      title: input.title,
      description: input.description,
      civicId: input.civicId.toLowerCase(),
      categoryId: input.categoryId.toLowerCase(),
      category: input.category,
      urbanAssetId: null,
      location: {
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
      },
      images: [],
      status: 'reported',
      priority: 'low',
    });
    expect(await service.findOne(created.id, propietario)).toEqual(created);
    await module.close();
  });

  it('no concede una incidencia sin asignar a un departamento sin pertenencia', async () => {
    const module = await crearServicio();
    const created = await service.create(input);
    await expect(
      service.findOne(created.id, {
        id: randomUUID(),
        role: 'department',
        ciudadanoId: null,
        departamentoId: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await module.close();
  });

  it('limita el acceso por equipo a sus roles y conserva el acceso ciudadano propio', async () => {
    const module = await crearServicio();
    const created = await service.create(input);
    const teamId = randomUUID();
    prisma.incidencias[0].teamId = teamId;

    await expect(
      service.findOne(created.id, {
        id: randomUUID(),
        role: 'civic',
        ciudadanoId: randomUUID(),
        equipoId: teamId,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.findOne(created.id, {
        id: randomUUID(),
        role: 'technician',
        ciudadanoId: null,
        equipoId: teamId,
      }),
    ).resolves.toMatchObject({ id: created.id });
    await module.close();
  });

  it('rechaza una incidencia sin ubicación y no escribe filas', async () => {
    const module = await crearServicio();
    await expect(
      service.create({
        title: 'Farola apagada',
        civicId: input.civicId,
        category: 'Iluminación',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.ubicaciones).toHaveLength(0);
    expect(prisma.incidencias).toHaveLength(0);
    await module.close();
  });

  it('guarda y consulta una incidencia sin categoría y con descripción corta', async () => {
    const module = await crearServicio();
    const {
      categoryId: _categoryId,
      category: _category,
      ...sinCategoria
    } = input;
    const creada = await service.create({
      ...sinCategoria,
      description: 'Rota',
    });

    expect(prisma.incidencias[0]).toMatchObject({
      categoryId: null,
      description: 'Rota',
    });
    expect(creada).toMatchObject({
      categoryId: null,
      category: null,
      description: 'Rota',
    });
    expect(await service.findOne(creada.id, propietario)).toEqual(creada);
    await module.close();
  });

  it('rechaza una categoría inexistente sin guardar la incidencia', async () => {
    const module = await crearServicio(
      crearPrismaIncidenciasFake({ categoriaInexistente: true }),
    );
    await expect(service.create(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.incidencias).toHaveLength(0);
    await module.close();
  });

  it('rechaza un activo urbano inexistente sin guardar la incidencia', async () => {
    const module = await crearServicio(
      crearPrismaIncidenciasFake({ activoInexistente: true }),
    );
    await expect(
      service.create({ ...input, urbanAssetId: randomUUID() }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.incidencias).toHaveLength(0);
    await module.close();
  });

  it('enlaza una categoría indicada solo por nombre', async () => {
    const module = await crearServicio();
    const created = await service.create({
      latitude: 36.72,
      longitude: -4.42,
      title: 'Farola apagada',
      civicId: input.civicId,
      category: 'Iluminación',
    });
    expect(created.categoryId).toBe('10000000-0000-4000-8000-000000000001');
    expect(created.category).toBe('Iluminación');
    await module.close();
  });

  it('guarda una dirección normalizada con la ubicación', async () => {
    const resolver = vi.fn(async () => null);
    const module = await crearServicio(
      crearPrismaIncidenciasFake(),
      crearGeocodificadorInversoFalso(resolver),
    );
    const created = await service.create({
      category: 'Iluminación',
      title: 'Farola apagada',
      civicId: input.civicId,
      latitude: 36.7213,
      longitude: -4.4214,
      address: {
        street: 'Calle Larios',
        zipCode: '29005',
        district: 'centro',
      },
    });

    expect(created.location.address).toEqual({
      street: 'Calle Larios',
      zipCode: '29005',
      district: 'centro',
    });
    expect(resolver).not.toHaveBeenCalled();
    await module.close();
  });

  it('resuelve y persiste la dirección si no se proporciona una manual', async () => {
    const resolver = vi.fn(async () => ({
      street: 'Calle Larios, 12',
      zipCode: '29005',
      district: 'centro' as const,
    }));
    const module = await crearServicio(
      crearPrismaIncidenciasFake(),
      crearGeocodificadorInversoFalso(resolver),
    );
    const created = await service.create(input);

    expect(resolver).toHaveBeenCalledWith(input.latitude, input.longitude);
    expect(created.location.address).toEqual({
      street: 'Calle Larios, 12',
      zipCode: '29005',
      district: 'centro',
    });
    expect(prisma.ubicaciones[0]).toMatchObject({
      addressId: '10000000-0000-4000-8000-000000000099',
    });
    await module.close();
  });

  it('crea la incidencia sin dirección si falla la geocodificación', async () => {
    const resolver = vi.fn(async () => {
      throw new Error('geocodificador no disponible');
    });
    const module = await crearServicio(
      crearPrismaIncidenciasFake(),
      crearGeocodificadorInversoFalso(resolver),
    );
    const created = await service.create(input);

    expect(created.location.address).toBeNull();
    expect(prisma.incidencias).toHaveLength(1);
    expect(prisma.ubicaciones[0]).not.toHaveProperty('addressId');
    await module.close();
  });

  it('conserva registros confirmados entre instancias con el mismo Prisma', async () => {
    const module = await crearServicio();
    const created = await service.create(input);
    const secondService = new IncidentsService(prisma.prisma, geocodificador);

    await expect(secondService.findOne(created.id, operador)).resolves.toEqual(
      created,
    );
    await module.close();
  });

  it('devuelve 404 cuando la incidencia no existe', async () => {
    const module = await crearServicio();
    await expect(
      service.findOne(randomUUID(), operador),
    ).rejects.toBeInstanceOf(NotFoundException);
    await module.close();
  });

  it('no persiste una incidencia si la transacción falla', async () => {
    const module = await crearServicio(
      crearPrismaIncidenciasFake({
        falloCrearIncidencia: new Error('db failure'),
      }),
    );
    await expect(service.create(input)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(prisma.incidencias).toHaveLength(0);
    await module.close();
  });

  it('recupera un commit confirmado cuya respuesta se perdió', async () => {
    const module = await crearServicio(
      crearPrismaIncidenciasFake({
        falloCommitDespuesDeGuardar: new Error('lost acknowledgement'),
      }),
    );
    const created = await service.create(input);
    expect(await service.findOne(created.id, operador)).toEqual(created);
    await module.close();
  });

  it('devuelve 503 si no puede conciliar el resultado de la transacción', async () => {
    const module = await crearServicio(
      crearPrismaIncidenciasFake({
        falloCommitDespuesDeGuardar: new Error('lost acknowledgement'),
        falloLecturaConciliacion: new Error('database unavailable'),
      }),
    );
    await expect(service.create(input)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await module.close();
  });

  it('oculta con 404 una incidencia ajena al ciudadano autenticado', async () => {
    const module = await crearServicio();
    const created = await service.create(input);
    await expect(
      service.findOne(created.id, {
        id: randomUUID(),
        role: 'civic',
        ciudadanoId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await module.close();
  });

  it('rechaza un ciudadano autenticado sin vínculo ciudadano', async () => {
    const module = await crearServicio();
    await expect(
      service.findOne(randomUUID(), {
        id: randomUUID(),
        role: 'civic',
        ciudadanoId: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await module.close();
  });
});
