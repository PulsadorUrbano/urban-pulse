import {
  Body,
  BadRequestException,
  Catch,
  Controller,
  ExceptionFilter,
  ArgumentsHost,
  Get,
  Param,
  ParseUUIDPipe,
  PayloadTooLargeException,
  Post,
  Res,
  UploadedFiles,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
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
import type { UploadedImageFile } from './incident.js';
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

@Catch(PayloadTooLargeException)
class UploadLimitFilter implements ExceptionFilter {
  catch(exception: PayloadTooLargeException, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(400)
      .json({ statusCode: 400, message: exception.message, error: 'Bad Request' });
  }
}

const acceptedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

@ApiTags('incidents')
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @UseFilters(UploadLimitFilter)
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      limits: { fileSize: 5 * 1024 * 1024, files: 5 },
      fileFilter: (_request, file, callback) => {
        callback(
          acceptedImageTypes.has(file.mimetype)
            ? null
            : new BadRequestException('images must be JPEG, PNG, or WebP'),
          acceptedImageTypes.has(file.mimetype),
        );
      },
    }),
  )
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
    @UploadedFiles() files: UploadedImageFile[] = [],
    @Res({ passthrough: true }) response: Response,
  ): Promise<Incident> {
    return this.createAndSetLocation(input, files, response);
  }

  private async createAndSetLocation(
    input: CreateIncidentDto,
    files: UploadedImageFile[],
    response: Response,
  ): Promise<Incident> {
    const incident = await this.incidentsService.create(input, files);
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
