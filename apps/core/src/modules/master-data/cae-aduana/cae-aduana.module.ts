import { Module } from '@nestjs/common';
import { CaeAduanaController } from './v1/cae-aduana.controller';
import { CaeAduanaService } from './v1/cae-aduana.service';
import { PrismaClient } from '.prisma/productos-client';

@Module({
  providers: [
    CaeAduanaService,
    { provide: 'PrismaClientDatosMaestros', useClass: PrismaClient },
  ],
  controllers: [CaeAduanaController],
  exports: [CaeAduanaService],
})
export class CaeAduanaModule {}
