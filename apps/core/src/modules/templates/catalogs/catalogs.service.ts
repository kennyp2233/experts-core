import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@internal/templates-client';
import { CatalogLoaderService } from './services/catalog-loader.service';
import { CatalogSearchService } from './services/catalog-search.service';
import { CatalogValidatorService } from './services/catalog-validator.service';
import { ReloadCatalogDto } from './dto/reload-catalog.dto';
import { SearchProductoDto } from './dto/search-producto.dto';
import { Express } from 'express';
import 'multer';

@Injectable()
export class CatalogsService {
    constructor(
        private loader: CatalogLoaderService,
        private search: CatalogSearchService,
        private validator: CatalogValidatorService,
        @Inject('PrismaClientTemplates') private prisma: PrismaClient,
    ) { }

    async reloadCatalogs(dto: ReloadCatalogDto, file?: Express.Multer.File) {
        if (!file) {
            throw new Error('File input is required for reloading catalogs.');
        }

        const buffer = file.buffer;
        let result = { loaded: 0 };

        if (dto.catalog === 'productos' || dto.catalog === 'all') {
            result = await this.loader.loadProductosCatalog(buffer);
        }
        if (dto.catalog === 'puertos_ecuador' || dto.catalog === 'all') {
            result = await this.loader.loadPuertosCatalog(buffer, true);
        }
        if (dto.catalog === 'puertos_internacional' || dto.catalog === 'all') {
            result = await this.loader.loadPuertosCatalog(buffer, false);
        }

        return { success: true, loaded: result.loaded };
    }

    async searchProducto(dto: SearchProductoDto) {
        return this.search.searchProducto(dto.nombre, dto.fuzzy);
    }

    async searchProductosAutocomplete(query: string) {
        return this.search.searchProductosAutocomplete(query);
    }

    async autoMatchProducts(productCodes: string[]) {
        return this.search.autoMatchProducts(productCodes);
    }

    async getStats() {
        return this.validator.validateIntegrity();
    }

    async listPuertos(esEcuador: boolean) {
        return this.prisma.catalogoPuerto.findMany({
            where: { esEcuador, activo: true },
            select: { codigoPuerto: true, nombrePuerto: true },
            orderBy: { nombrePuerto: 'asc' }
        });
    }

    async searchPuertos(query: string, esEcuador: boolean, limit = 20) {
        if (!query || query.length < 2) return [];

        return this.prisma.catalogoPuerto.findMany({
            where: {
                esEcuador,
                activo: true,
                OR: [
                    { nombrePuerto: { contains: query, mode: 'insensitive' } },
                    { nombrePais: { contains: query, mode: 'insensitive' } },
                    { codigoPuerto: { contains: query, mode: 'insensitive' } }
                ]
            },
            select: { codigoPuerto: true, nombrePuerto: true, nombrePais: true },
            orderBy: { nombrePuerto: 'asc' },
            take: limit
        });
    }
}


