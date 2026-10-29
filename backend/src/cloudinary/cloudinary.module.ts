import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CloudinaryController } from './cloudinary.controller.js';
import { CloudinaryService } from './cloudinary.service.js';

@Module({
  imports: [AuthModule],
  controllers: [CloudinaryController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
