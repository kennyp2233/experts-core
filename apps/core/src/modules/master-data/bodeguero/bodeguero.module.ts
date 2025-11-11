import { Module } from '@nestjs/common';
import { BodegueroController } from './v1/bodeguero.controller';
import { BodegueroService } from './v1/services/bodeguero.service';
import { PrismaClient } from '.prisma/productos-client';

@Module({
  controllers: [BodegueroController],
  providers: [
    BodegueroService,
    { provide: 'PrismaClientDatosMaestros', useClass: PrismaClient },
  ],
  exports: [BodegueroService],
})
export class BodegueroModule {}