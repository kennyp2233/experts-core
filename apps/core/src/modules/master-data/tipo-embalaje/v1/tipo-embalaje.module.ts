import { Module } from '@nestjs/common';
import { TipoEmbalajeController } from './tipo-embalaje.controller';
import { TipoEmbalajeService } from './services/tipo-embalaje.service';
import { PrismaClient } from '.prisma/productos-client';

@Module({
  controllers: [TipoEmbalajeController],
  providers: [
    TipoEmbalajeService,
    { provide: 'PrismaClientDatosMaestros', useClass: PrismaClient },
  ],
  exports: [TipoEmbalajeService],
})
export class TipoEmbalajeModule {}