import { Module } from '@nestjs/common';
import { GuiaMadreService } from './services/guia-madre.service';
import { GuiaMadreCrudService } from './services/guia-madre-crud.service';
import { GuiaMadreRepository } from './repositories/guia-madre.repository';
import { GuiaMadreSecuencialService } from './services/guia-madre-secuencial.service';
import { GuiaMadreController } from './guia-madre.controller';
import { DocumentoBaseModule } from '../documento-base/documento-base.module';

@Module({
    imports: [DocumentoBaseModule],
    controllers: [GuiaMadreController],
    providers: [
        GuiaMadreService,
        GuiaMadreCrudService,
        GuiaMadreRepository,
        GuiaMadreSecuencialService,
    ],
    exports: [GuiaMadreService],
})
export class GuiaMadreModule { }
