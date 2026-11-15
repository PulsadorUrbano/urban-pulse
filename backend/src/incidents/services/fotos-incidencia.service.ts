import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { IncidentImageModel } from '../../generated/prisma/models.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ImagenIncidencia, Incident } from '../incident.js';
import type { FotoValidada } from '../validar-fotos-incidencia.js';
import { AlmacenamientoFotosS3Service } from './almacenamiento-fotos-s3.service.js';

const LIMITE_FOTOS = 8;

@Injectable()
export class FotosIncidenciaService {
  private readonly logger = new Logger(FotosIncidenciaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly almacenamiento: AlmacenamientoFotosS3Service,
  ) {}

  async subir(
    idIncidencia: string,
    idCiudadano: string,
    fotos: FotoValidada[],
  ): Promise<ImagenIncidencia[]> {
    const id = idIncidencia.toLowerCase();
    const ciudadano = idCiudadano.toLowerCase();
    let existente: { civicId: string } | null;
    let cantidad: number;
    try {
      [existente, cantidad] = await Promise.all([
        this.prisma.incident.findUnique({
          where: { id },
          select: { civicId: true },
        }),
        this.prisma.incidentImage.count({ where: { incidentId: id } }),
      ]);
    } catch {
      throw new ServiceUnavailableException(
        'El almacenamiento de incidencias no está disponible.',
      );
    }
    if (!existente || existente.civicId !== ciudadano)
      throw new NotFoundException('La incidencia no existe');
    if (cantidad + fotos.length > LIMITE_FOTOS)
      throw new ConflictException('La incidencia ya tiene el máximo de fotos.');

    const fecha = new Date();
    const filas = fotos.map((foto) => {
      const idFoto = randomUUID();
      return {
        id: idFoto,
        incidentId: id,
        objectKey: `incidents/${id}/${idFoto}.${foto.extension}`,
        mimeType: foto.mimeType,
        createdAt: fecha,
      };
    });
    const intentadas: string[] = [];
    try {
      for (const [indice, fila] of filas.entries()) {
        intentadas.push(fila.objectKey);
        await this.almacenamiento.subir(
          fila.objectKey,
          fotos[indice].contenido,
          fila.mimeType,
        );
      }
    } catch (error) {
      await this.limpiar(intentadas);
      throw error;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const bloqueada = await tx.$queryRaw<
          { id: string }[]
        >`SELECT "id" FROM "Incident" WHERE "id" = ${id}::uuid FOR UPDATE`;
        if (bloqueada.length === 0)
          throw new NotFoundException('La incidencia no existe');
        const actual = await tx.incident.findUnique({
          where: { id },
          select: { civicId: true },
        });
        if (!actual || actual.civicId !== ciudadano)
          throw new NotFoundException('La incidencia no existe');
        const total = await tx.incidentImage.count({
          where: { incidentId: id },
        });
        if (total + filas.length > LIMITE_FOTOS)
          throw new ConflictException(
            'La incidencia ya tiene el máximo de fotos.',
          );
        await tx.incidentImage.createMany({ data: filas });
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        await this.limpiar(intentadas);
        throw error;
      }
      let confirmadas: { id: string }[];
      try {
        confirmadas = await this.prisma.incidentImage.findMany({
          where: { id: { in: filas.map((fila) => fila.id) } },
          select: { id: true },
        });
      } catch {
        this.logger.error(
          `Resultado SQL incierto para fotos de incidencia ${id}; conciliación pendiente.`,
        );
        throw new ServiceUnavailableException(
          'No se pudo confirmar el registro de fotos.',
        );
      }
      if (confirmadas.length !== filas.length) {
        if (confirmadas.length === 0) await this.limpiar(intentadas);
        else
          this.logger.error(
            `Registro parcial inesperado de fotos de incidencia ${id}; conciliación pendiente.`,
          );
        throw new ServiceUnavailableException(
          'No se pudo registrar las fotos.',
        );
      }
    }
    return this.listar(id);
  }

  async listar(idIncidencia: string): Promise<ImagenIncidencia[]> {
    let filas: IncidentImageModel[];
    try {
      filas = await this.prisma.incidentImage.findMany({
        where: { incidentId: idIncidencia.toLowerCase() },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
    } catch {
      throw new ServiceUnavailableException(
        'No se pudieron consultar las fotos.',
      );
    }
    return Promise.all(
      filas.map(async (fila) => ({
        id: fila.id,
        url: await this.almacenamiento.firmarLectura(fila.objectKey),
        mimeType: fila.mimeType,
        createdAt: fila.createdAt.toISOString(),
      })),
    );
  }

  async agregarA(incidencia: Incident): Promise<Incident> {
    return { ...incidencia, images: await this.listar(incidencia.id) };
  }

  private async limpiar(claves: string[]): Promise<void> {
    for (const clave of claves) {
      try {
        await this.almacenamiento.borrar(clave);
      } catch {
        this.logger.error(
          `No se pudo limpiar el objeto ${clave}; conciliación pendiente.`,
        );
      }
    }
  }
}
