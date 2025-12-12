import { Module } from '@nestjs/common';
import { CatalogsService } from './catalogs.service';
import { CatalogsController } from './catalogs.controller';
import { CatalogLoaderService } from './services/catalog-loader.service';
import { CatalogSearchService } from './services/catalog-search.service';
import { CatalogValidatorService } from './services/catalog-validator.service';

@Module({
    controllers: [CatalogsController],
    providers: [
        CatalogsService,
        CatalogLoaderService,
        CatalogSearchService,
        CatalogValidatorService,
        // PrismaClientTemplates provider is expected to be available globally or via parent
        // or provided here if it's imported.
        // But better to expect it from TemplatesModule if it's shared.
    ],
    exports: [CatalogsService]
})
export class CatalogsModule { }
