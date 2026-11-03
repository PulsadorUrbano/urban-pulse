import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CloudinaryService } from './cloudinary.service.js';

@Controller('images')
@UseGuards(JwtAuthGuard)
export class CloudinaryController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post()
  subirImagen(@Body('imagen') imagen: unknown) {
    return this.cloudinary.subirImagen(imagen);
  }
}
