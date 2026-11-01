import type { PrismaService } from '../../../src/prisma/prisma.service.js';

type Registro = Record<string, unknown>;

interface OpcionesFalsoPrisma {
  falloCrearIncidencia?: Error;
  falloCrearCambioEstado?: Error;
  falloCrearCambioPrioridad?: Error;
  falloCommitDespuesDeGuardar?: Error;
  falloLecturaConciliacion?: Error;
}

function objeto(valor: unknown): Registro {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new Error('Argumento inesperado para el doble Prisma');
  }
  return valor as Registro;
}

function lista(valor: unknown): Registro[] {
  return Array.isArray(valor) ? valor.map(objeto) : [];
}

function clonar<T>(valor: T): T {
  return structuredClone(valor);
}

export function crearPrismaIncidenciasFake(opciones: OpcionesFalsoPrisma = {}) {
  const incidencias: Registro[] = [];
  const ubicaciones: Registro[] = [];
  const imagenes: Registro[] = [];
  const cambiosEstado: Registro[] = [];
  const cambiosPrioridad: Registro[] = [];
  let leyendoConciliacion = false;
  let colaTransacciones = Promise.resolve();

  const incidente = {
    create: async (argumentos: unknown) => {
      if (opciones.falloCrearIncidencia) throw opciones.falloCrearIncidencia;
      const data = objeto(objeto(argumentos).data);
      const relation = (data.location ?? {}) as Registro;
      const location = relation.create ? objeto(relation.create) : null;
      const imageRelation = (data.images ?? {}) as Registro;
      const rows = lista(imageRelation.create);
      const created: Registro = {
        ...data,
        status: 'reported',
        priority: 'low',
        location: null,
        images: [],
      };
      delete created.images;
      delete created.location;
      incidencias.push(created);
      if (location) {
        const row = { ...location, incidentId: data.id };
        ubicaciones.push(row);
      }
      for (const image of rows) {
        imagenes.push({ ...image, incidentId: data.id });
      }
      return obtenerAgregado(String(data.id));
    },
    findUnique: async (argumentos: unknown) => {
      if (leyendoConciliacion && opciones.falloLecturaConciliacion) {
        throw opciones.falloLecturaConciliacion;
      }
      const args = objeto(argumentos);
      const id = String(objeto(args.where).id).toLowerCase();
      const incident = incidencias.find((row) => String(row.id) === id);
      if (!incident) return null;
      if (args.include) return obtenerAgregado(id);
      return clonar(incident);
    },
    findMany: async (argumentos: unknown = {}) => {
      const args = objeto(argumentos);
      const where = args.where ? objeto(args.where) : {};
      let rows = incidencias.filter(
        (row) => where.civicId === undefined || row.civicId === where.civicId,
      );
      if (Array.isArray(args.orderBy)) {
        rows = [...rows].sort((left, right) => {
          const fecha =
            new Date(String(right.createdAt)).getTime() -
            new Date(String(left.createdAt)).getTime();
          return fecha || String(left.id).localeCompare(String(right.id));
        });
      }
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        createdAt: row.createdAt,
      }));
    },
    updateMany: async (argumentos: unknown) => {
      const args = objeto(argumentos);
      const where = objeto(args.where);
      const incident = incidencias.find(
        (row) =>
          String(row.id) === String(where.id).toLowerCase() &&
          row.status === where.status,
      );
      if (!incident) return { count: 0 };
      Object.assign(incident, objeto(args.data));
      return { count: 1 };
    },
  };

  const cambioEstado = {
    create: async (argumentos: unknown) => {
      if (opciones.falloCrearCambioEstado)
        throw opciones.falloCrearCambioEstado;
      const row = clonar(objeto(objeto(argumentos).data));
      cambiosEstado.push(row);
      return clonar(row);
    },
    findMany: async (argumentos: unknown) => {
      const args = objeto(argumentos);
      const id = String(objeto(args.where).incidenciaId).toLowerCase();
      return clonar(
        cambiosEstado.filter((row) => String(row.incidenciaId) === id),
      );
    },
  };
  const cambioPrioridad = {
    create: async (argumentos: unknown) => {
      if (opciones.falloCrearCambioPrioridad) {
        throw opciones.falloCrearCambioPrioridad;
      }
      const row = clonar(objeto(objeto(argumentos).data));
      cambiosPrioridad.push(row);
      return clonar(row);
    },
    findMany: async (argumentos: unknown) => {
      const args = objeto(argumentos);
      const id = String(objeto(args.where).incidenciaId).toLowerCase();
      return clonar(
        cambiosPrioridad.filter((row) => String(row.incidenciaId) === id),
      );
    },
  };

  function obtenerAgregado(id: string): Registro | null {
    const incident = incidencias.find((row) => String(row.id) === id);
    if (!incident) return null;
    return {
      ...clonar(incident),
      location: clonar(
        ubicaciones.find((row) => String(row.incidentId) === id) ?? null,
      ),
      images: clonar(imagenes.filter((row) => String(row.incidentId) === id)),
    };
  }

  const fake = {
    incident: incidente,
    cambioEstado,
    cambioPrioridad,
    $transaction: async <T>(callback: (tx: PrismaService) => Promise<T>) => {
      const anterior = colaTransacciones;
      let liberar = () => {};
      colaTransacciones = new Promise<void>((resolve) => {
        liberar = resolve;
      });
      await anterior;
      const snapshot = clonar({
        incidencias,
        ubicaciones,
        imagenes,
        cambiosEstado,
        cambiosPrioridad,
      });
      try {
        const result = await callback(fake as unknown as PrismaService);
        if (opciones.falloCommitDespuesDeGuardar) {
          throw opciones.falloCommitDespuesDeGuardar;
        }
        return result;
      } catch (error) {
        if (opciones.falloCommitDespuesDeGuardar !== error) {
          reemplazar(incidencias, snapshot.incidencias);
          reemplazar(ubicaciones, snapshot.ubicaciones);
          reemplazar(imagenes, snapshot.imagenes);
          reemplazar(cambiosEstado, snapshot.cambiosEstado);
          reemplazar(cambiosPrioridad, snapshot.cambiosPrioridad);
        } else {
          leyendoConciliacion = true;
        }
        throw error;
      } finally {
        liberar();
      }
    },
  };

  function reemplazar(destino: Registro[], origen: Registro[]): void {
    destino.splice(0, destino.length, ...clonar(origen));
  }

  return {
    prisma: fake as unknown as PrismaService,
    incidencias,
    ubicaciones,
    imagenes,
    cambiosEstado,
    cambiosPrioridad,
  };
}
