import { Module } from '@nestjs/common';
import { AerolineaController } from './aerolinea.controller';
import { AerolineaService } from './services/aerolinea.service';
import { AerolineaRutaService } from './services/aerolinea-ruta.service';
import { AerolineaPlantillaService } from './services/aerolinea-plantilla.service';
import { PrismaClient } from '.prisma/productos-client';

@Module({
  controllers: [AerolineaController],
  providers: [
    AerolineaService,
    AerolineaRutaService,
    AerolineaPlantillaService,
    { provide: 'PrismaClientDatosMaestros', useClass: PrismaClient },
  ],
  exports: [AerolineaService, AerolineaRutaService, AerolineaPlantillaService],
})
export class AerolineaModule {}