import { Global, Module } from '@nestjs/common';
import { DbSyncService } from './db-sync.service.js';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService, DbSyncService],
  exports: [PrismaService],
})
export class PrismaModule {}
