import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { normalize } from '../../../../common/utils/normalizer.util';

@Injectable()
export class CatalogSearchService {
    constructor(
        @Inject('PrismaClientTemplates') private prisma: PrismaClient,
    ) { }

    async searchProducto(nombre: string, fuzzy: boolean = false) {
        const normalized = normalize(nombre);

        // 1. Exact Match via Normalized
        const exact = await this.prisma.catalogoProducto.findFirst({
            where: { nombreComunNormalizado: normalized, activo: true }
        });
        if (exact) return { found: true, entity: exact, confidence: 1.0, method: 'exact' };

        // 2. Partial Match (Contains)
        const partial = await this.prisma.catalogoProducto.findFirst({
            where: {
                nombreComunNormalizado: { contains: normalized },
                activo: true
            }
        });
        if (partial) return { found: true, entity: partial, confidence: 0.9, method: 'partial' };

        return { found: false, entity: null, confidence: 0 };
    }

    async searchPuerto(nombre: string, esEcuador: boolean) {
        const normalized = normalize(nombre);

        const exact = await this.prisma.catalogoPuerto.findFirst({
            where: {
                nombrePuertoNormalizado: normalized,
                esEcuador,
                activo: true
            }
        });
        if (exact) return { found: true, entity: exact, confidence: 1.0 };

        const partial = await this.prisma.catalogoPuerto.findFirst({
            where: {
                nombrePuertoNormalizado: { contains: normalized },
                esEcuador,
                activo: true
            }
        });
        if (partial) return { found: true, entity: partial, confidence: 0.8 };

        return { found: false, entity: null, confidence: 0 };
    }

    async findProductoByCodigo(codigo: string) {
        return this.prisma.catalogoProducto.findUnique({
            where: { codigoAgrocalidad: codigo }
        });
    }

    /**
     * Auto-match a list of product names/codes to catalog entries
     * Returns array with original code + best match from catalog
     */
    async autoMatchProducts(productCodes: string[]) {
        const uniqueCodes = [...new Set(productCodes)];
        const results: Array<{
            originalCode: string;
            matched: boolean;
            confidence: number;
            catalogMatch: {
                codigoAgrocalidad: string;
                nombreComun: string;
            } | null;
        }> = [];

        for (const code of uniqueCodes) {
            // Build search variations (singular/plural)
            const variations = [code];
            if (code.toUpperCase().endsWith('S')) {
                variations.push(code.slice(0, -1)); // ROSAS -> ROSA
            } else {
                variations.push(code + 'S'); // ROSA -> ROSAS
            }

            let found = false;
            for (const variant of variations) {
                // Try exact match by code first
                const byCode = await this.prisma.catalogoProducto.findFirst({
                    where: {
                        OR: [
                            { codigoAgrocalidad: { contains: variant, mode: 'insensitive' } },
                            { nombreComun: { contains: variant, mode: 'insensitive' } }
                        ],
                        activo: true
                    },
                    select: { codigoAgrocalidad: true, nombreComun: true }
                });

                if (byCode) {
                    results.push({
                        originalCode: code,
                        matched: true,
                        confidence: variant === code ? 0.9 : 0.85, // Slightly lower if using variant
                        catalogMatch: byCode
                    });
                    found = true;
                    break;
                }
            }

            if (!found) {
                // Try normalized search as last resort
                const searchResult = await this.searchProducto(code);
                if (searchResult.found && searchResult.entity) {
                    results.push({
                        originalCode: code,
                        matched: true,
                        confidence: searchResult.confidence,
                        catalogMatch: {
                            codigoAgrocalidad: searchResult.entity.codigoAgrocalidad,
                            nombreComun: searchResult.entity.nombreComun
                        }
                    });
                } else {
                    results.push({
                        originalCode: code,
                        matched: false,
                        confidence: 0,
                        catalogMatch: null
                    });
                }
            }
        }

        return results;
    }

    /**
     * Search products with limit for autocomplete
     */
    async searchProductosAutocomplete(query: string, limit = 15) {
        if (!query || query.length < 2) return [];

        return this.prisma.catalogoProducto.findMany({
            where: {
                activo: true,
                OR: [
                    { codigoAgrocalidad: { contains: query, mode: 'insensitive' } },
                    { nombreComun: { contains: query, mode: 'insensitive' } }
                ]
            },
            select: { codigoAgrocalidad: true, nombreComun: true },
            orderBy: { nombreComun: 'asc' },
            take: limit
        });
    }
}

