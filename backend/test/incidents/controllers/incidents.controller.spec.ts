import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { IncidentsController } from '../../../src/incidents/incidents.controller.js';
import { JwtAuthGuard } from '../../../src/auth/jwt-auth.guard.js';
import { AccesoAsignacionesGuard } from '../../../src/incidents/guards/acceso-asignaciones.guard.js';
import type { IncidentsService } from '../../../src/incidents/incidents.service.js';

describe('Rutas de asignación de incidencias', () => {
  const opciones = { departments: [], teams: [], technicians: [] };
  const asignada = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    departmentId: null,
    teamId: null,
    technicianId: null,
  };
  const servicio = {
    opcionesAsignacion: vi.fn().mockResolvedValue(opciones),
    asignar: vi.fn().mockResolvedValue(asignada),
  };
  const controlador = new IncidentsController(
    servicio as unknown as IncidentsService,
  );

  it('delega la consulta y el parche en el servicio', async () => {
    await expect(controlador.opcionesAsignacion()).resolves.toBe(opciones);
    await expect(
      controlador.asignar(asignada.id, { departmentId: null }),
    ).resolves.toBe(asignada);
    expect(servicio.asignar).toHaveBeenCalledWith(asignada.id, {
      departmentId: null,
    });
  });

  it('protege solo las dos rutas nuevas con JWT y rol actual', () => {
    for (const metodo of ['opcionesAsignacion', 'asignar'] as const) {
      const funcion: unknown = Object.getOwnPropertyDescriptor(
        IncidentsController.prototype,
        metodo,
      )?.value;
      expect(Reflect.getMetadata(GUARDS_METADATA, funcion)).toEqual([
        JwtAuthGuard,
        AccesoAsignacionesGuard,
      ]);
    }
    const detalle: unknown = Object.getOwnPropertyDescriptor(
      IncidentsController.prototype,
      'findOne',
    )?.value;
    expect(Reflect.getMetadata(GUARDS_METADATA, detalle)).toBeUndefined();
  });
});
