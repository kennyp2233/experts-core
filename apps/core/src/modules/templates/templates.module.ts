import { Module } from '@nestjs/common';
import { CatalogsModule } from './catalogs/catalogs.module';
import { FitoModule } from './fito/fito.module';

@Module({
    imports: [CatalogsModule, FitoModule],
    controllers: [],
    providers: [],
    exports: [],
})
export class TemplatesModule { }
