import { Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';
import { registrarPeticion } from '../../src/configuracion/registro-conexion-web.js';

describe('registro HTTP', () => {
  it('registra una petición atendida sin URL concreta ni cabeceras', () => {
    const log = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const request = {
      method: 'GET',
      route: { path: '/incidents/:id' },
      originalUrl:
        '/incidents/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa?token=secreto',
      headers: { authorization: 'Bearer secreto' },
    } as unknown as Request;
    const response = Object.assign(new EventEmitter(), {
      statusCode: 200,
    }) as Response & EventEmitter;
    const next = vi.fn() as NextFunction;

    registrarPeticion(request, response, next);
    response.emit('finish');

    expect(next).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0][0]).toMatch(/^GET \/incidents\/:id 200 \d+ms$/);
    expect(log.mock.calls[0][0]).not.toMatch(/aaaaaaaa|secreto|Bearer/);
    log.mockRestore();
  });

  it('omite salud y rutas no reconocidas', () => {
    const log = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    for (const ruta of ['/health', '/api-json', '/swagger-ui.css', undefined]) {
      const request = {
        method: 'GET',
        route: ruta ? { path: ruta } : undefined,
      } as Request;
      const response = Object.assign(new EventEmitter(), {
        statusCode: 200,
      }) as Response & EventEmitter;
      registrarPeticion(request, response, vi.fn());
      response.emit('finish');
    }
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
