import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaClient } from '@internal/templates-client';
import { ProductMappingDto } from '../dto/generate-xml.dto';

export interface FitoMapeoRecordado {
    proCodigo: string;
    codigoAgrocalidad: string;
    nombreComun: string | null;
    subtipo: string | null;
}

/** Límites de columna de `templates.fito_producto_mapeo`. */
const MAX_PRO_CODIGO = 50;
const MAX_CODIGO_AGROCALIDAD = 20;
const MAX_NOMBRE_COMUN = 200;
const MAX_SUBTIPO = 100;
/** Tope defensivo de códigos por consulta (una guía trae decenas, no miles). */
const MAX_CODIGOS_QUERY = 500;

/**
 * Memoria de mapeos proCodigo (Access) → código Agrocalidad, para no pedirle
 * al usuario que re-mapee los mismos productos en cada FITO.
 *
 * Modo 2 (write-aside): vive solo en Postgres (schema `templates`), nunca se
 * escribe a Access. Todo es best-effort: si la tabla no existe todavía
 * (migración sin aplicar) o la DB falla, se loguea y se sigue — nunca rompe
 * la generación ni el paso de mapeo.
 */
@Injectable()
export class FitoMapeoService {
    private readonly logger = new Logger(FitoMapeoService.name);

    constructor(@Inject('PrismaClientTemplates') private prisma: PrismaClient) { }

    async findByCodigos(codigos?: string | string[]): Promise<FitoMapeoRecordado[]> {
        const lista = this.parseCodigos(codigos);
        if (lista.length === 0) return [];

        try {
            return await this.prisma.fitoProductoMapeo.findMany({
                where: { proCodigo: { in: lista } },
                select: {
                    proCodigo: true,
                    codigoAgrocalidad: true,
                    nombreComun: true,
                    subtipo: true,
                },
                orderBy: { proCodigo: 'asc' },
            });
        } catch (error) {
            this.logger.warn(
                `[FITO-MAPEO] lectura de mapeos falló (¿migración sin aplicar?): ${this.describe(error)} — devolviendo []`,
            );
            return [];
        }
    }

    /**
     * Upsert de los mapeos con código Agrocalidad. Key = `originalCode`
     * (proCodigo); en update incrementa `vecesUsado`. Nunca lanza.
     */
    async remember(mappings: ProductMappingDto[] | undefined): Promise<void> {
        const porCodigo = new Map<string, ProductMappingDto>();
        for (const m of mappings ?? []) {
            const proCodigo = m?.originalCode?.trim();
            const codigoAgrocalidad = m?.codigoAgrocalidad?.trim();
            if (!proCodigo || !codigoAgrocalidad) continue;
            if (proCodigo.length > MAX_PRO_CODIGO || codigoAgrocalidad.length > MAX_CODIGO_AGROCALIDAD) {
                this.logger.warn(
                    `[FITO-MAPEO] mapeo ignorado por exceder largo de columna: ${proCodigo} → ${codigoAgrocalidad}`,
                );
                continue;
            }
            porCodigo.set(proCodigo, m);
        }
        if (porCodigo.size === 0) return;

        const results = await Promise.allSettled(
            [...porCodigo.entries()].map(([proCodigo, m]) => {
                const codigoAgrocalidad = m.codigoAgrocalidad.trim();
                const nombreComun = m.nombreComun?.trim().slice(0, MAX_NOMBRE_COMUN) || null;
                const subtipo = m.subtipo?.trim().slice(0, MAX_SUBTIPO) || null;
                return this.prisma.fitoProductoMapeo.upsert({
                    where: { proCodigo },
                    create: { proCodigo, codigoAgrocalidad, nombreComun, subtipo },
                    update: {
                        codigoAgrocalidad,
                        // No pisar con vacío lo que ya se había recordado.
                        ...(nombreComun ? { nombreComun } : {}),
                        ...(subtipo ? { subtipo } : {}),
                        vecesUsado: { increment: 1 },
                    },
                });
            }),
        );

        const fallidos = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
        if (fallidos.length > 0) {
            this.logger.warn(
                `[FITO-MAPEO] ${fallidos.length}/${results.length} mapeos no se pudieron guardar: ${this.describe(fallidos[0].reason)}`,
            );
        } else {
            this.logger.log(`[FITO-MAPEO] ${results.length} mapeos recordados`);
        }
    }

    private parseCodigos(codigos?: string | string[]): string[] {
        const raw = Array.isArray(codigos) ? codigos.join(',') : codigos ?? '';
        const unicos = new Set(
            raw
                .split(',')
                .map((c) => c.trim())
                .filter((c) => c.length > 0 && c.length <= MAX_PRO_CODIGO),
        );
        return [...unicos].slice(0, MAX_CODIGOS_QUERY);
    }

    private describe(error: unknown): string {
        if (error && typeof error === 'object' && 'code' in error) {
            const { code, message } = error as { code?: string; message?: string };
            return `${code}: ${(message ?? '').split('\n').pop()?.trim()}`;
        }
        return error instanceof Error ? error.message : String(error);
    }
}
