import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller()
export class HealthController {

  @Get('health')
  @ApiOperation({ 
    summary: 'Comprobación del estado del servicio', 
    description: 'Este endpoint devuelve un estado simple que indica que el servicio está en ejecución y funciona correctamente.', 
  })
  @ApiResponse({
    status: 200,
    description: 'Comprobación de salud del servicio',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
      },
    },
  })
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
