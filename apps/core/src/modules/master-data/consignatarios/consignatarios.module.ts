import { Module } from '@nestjs/common';
import { ConsignatariosController } from './v1/consignatarios.controller';
import { ConsignatariosService } from './v1/services/consignatarios.service';
import { ConsignatarioCaeSiceService } from './v1/services/consignatario-cae-sice.service';
import { ConsignatarioFacturacionService } from './v1/services/consignatario-facturacion.service';
import { ConsignatarioFitoService } from './v1/services/consignatario-fito.service';
import { ConsignatarioGuiaHService } from './v1/services/consignatario-guia-h.service';
import { ConsignatarioGuiaMService } from './v1/services/consignatario-guia-m.service';
import { ConsignatarioTransmisionService } from './v1/services/consignatario-transmision.service';
import { PrismaClient } from '.prisma/productos-client';

@Module({
  controllers: [ConsignatariosController],
  providers: [
    ConsignatariosService,
    ConsignatarioCaeSiceService,
    ConsignatarioFacturacionService,
    ConsignatarioFitoService,
    ConsignatarioGuiaHService,
    ConsignatarioGuiaMService,
    ConsignatarioTransmisionService,
    { provide: 'PrismaClientDatosMaestros', useClass: PrismaClient },
  ],
  exports: [ConsignatariosService],
})
export class ConsignatariosModule {}