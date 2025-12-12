import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CatalogsModule } from '../catalogs/catalogs.module';
import { FitoController } from './fito.controller';
import { FitoService } from './fito.service';
import { LegacyDbService } from './services/legacy-db.service';
import { XmlGeneratorService } from './services/xml-generator.service';
import { XmlValidatorService } from './services/xml-validator.service';
import { FitoProcessor } from './services/fito-processor.service';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'fito-xml',
        }),
        CatalogsModule,
        // We need PrismaClientTemplates from TemplatesModule, but if this module is imported BY TemplatesModule 
        // and TemplatesModule is Global, we might be fine. 
        // If FitoModule is imported by TemplatesModule, circular dependency might occur if Fito uses Templates providers?
        // TemplatesModule exports 'PrismaClientTemplates', and it is Global. So FitoModule just needs to exist.
    ],
    controllers: [FitoController],
    providers: [
        FitoService,
        LegacyDbService,
        XmlGeneratorService,
        XmlValidatorService,
        FitoProcessor
    ],
    exports: [FitoService]
})
export class FitoModule { }
