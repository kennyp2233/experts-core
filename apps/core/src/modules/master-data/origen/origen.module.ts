import { Module } from '@nestjs/common';
import { OrigenController } from './v1/origen.controller';
import { OrigenService } from './v1/origen.service';
import { PrismaClient } from '.prisma/productos-client';

@Module({
  providers: [
    OrigenService,
    { provide: 'PrismaClientDatosMaestros', useClass: PrismaClient },
  ],
  controllers: [OrigenController],
  exports: [OrigenService],
})
export class OrigenModule {}
