import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller()
export class HealthController {

  @Get('health')
  @ApiOperation({ 
    summary: 'Endpoint to check the health of the service', 
    description: 'This endpoint returns a simple status indicating that the service is running and healthy.', 
  })
  @ApiResponse({
    status: 200,
    description: 'Health check endpoint',
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
