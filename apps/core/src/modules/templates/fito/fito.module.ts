import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CatalogsModule } from '../catalogs/catalogs.module';
import { LegacyDbModule } from '../../integrations/legacy-db/legacy-db.module';
import { FitoController } from './fito.controller';
import { FitoService } from './fito.service';
import { FitoLegacyService } from './services/fito-legacy.service';
import { XmlGeneratorService } from './services/xml-generator.service';
import { XmlValidatorService } from './services/xml-validator.service';
import { FitoProcessor } from './services/fito-processor.service';

@Module({
    imports: [
        LegacyDbModule, // provee LegacyDbService (acceso al bridge Access)
        BullModule.registerQueue({
            name: 'fito-xml',
        }),
        CatalogsModule,
        // PrismaClientTemplates lo da TemplatesModule (global).
    ],
    controllers: [FitoController],
    providers: [
        FitoService,
        FitoLegacyService,
        XmlGeneratorService,
        XmlValidatorService,
        FitoProcessor
    ],
    exports: [FitoService]
})
export class FitoModule { }
