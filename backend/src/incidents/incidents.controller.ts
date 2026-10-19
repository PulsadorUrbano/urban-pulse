import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CreateIncidentPipe } from './create-incident.pipe.js';
import { CreateIncidentDto } from './create-incident.dto.js';
import type { Incident } from './incident.js';
import { IncidentsService } from './incidents.service.js';

const incidentSchema = {
  type: 'object',
  required: [
    'id',
    'title',
    'description',
    'categoryId',
    'urbanAssetId',
    'location',
    'status',
    'priority',
    'createdAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    description: { type: 'string' },
    categoryId: { type: 'string', format: 'uuid' },
    urbanAssetId: { type: 'string', format: 'uuid', nullable: true },
    location: {
      type: 'object',
      properties: {
        latitude: { type: 'number' },
        longitude: { type: 'number' },
      },
    },
    status: { type: 'string', enum: ['reported'] },
    priority: { type: 'string', enum: ['low'] },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

@ApiTags('incidents')
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @ApiBody({ type: CreateIncidentDto })
  @ApiCreatedResponse({
    description:
      'Temporary in-memory incident; referenced UUIDs are format-checked only.',
    schema: incidentSchema,
    headers: {
      Location: {
        description: 'Path of the created incident.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'The request body is invalid.' })
  create(
    @Body(new CreateIncidentPipe()) input: CreateIncidentDto,
    @Res({ passthrough: true }) response: Response,
  ): Incident {
    const incident = this.incidentsService.create(input);
    response.setHeader('Location', `/incidents/${incident.id}`);
    return incident;
  }

  @Get(':id')
  @ApiOkResponse({ schema: incidentSchema })
  @ApiBadRequestResponse({ description: 'The incident id is not a UUID.' })
  @ApiNotFoundResponse({ description: 'The incident does not exist.' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Incident {
    return this.incidentsService.findOne(id);
  }
}
