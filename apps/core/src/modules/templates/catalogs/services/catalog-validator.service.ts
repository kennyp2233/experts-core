import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@internal/templates-client';

@Injectable()
export class CatalogValidatorService {
    constructor(
        @Inject('PrismaClientTemplates') private prisma: PrismaClient,
    ) { }

    async validateIntegrity() {
        const productosCount = await this.prisma.catalogoProducto.count();
        const puertosTotal = await this.prisma.catalogoPuerto.count();
        const puertosEcuador = await this.prisma.catalogoPuerto.count({ where: { esEcuador: true } });
        const puertosInternacional = await this.prisma.catalogoPuerto.count({ where: { esEcuador: false } });

        // Get sample data
        const productosRecientes = await this.prisma.catalogoProducto.findMany({
            take: 5,
            orderBy: { fechaCarga: 'desc' },
            select: { codigoAgrocalidad: true, nombreComun: true, fechaCarga: true }
        });

        const puertosRecientes = await this.prisma.catalogoPuerto.findMany({
            take: 5,
            orderBy: { fechaCarga: 'desc' },
            select: { codigoPuerto: true, nombrePuerto: true, nombrePais: true, esEcuador: true, fechaCarga: true }
        });

        return {
            valid: productosCount > 0 && puertosTotal > 0,
            productos: {
                total: productosCount,
                recientes: productosRecientes
            },
            puertos: {
                total: puertosTotal,
                ecuador: puertosEcuador,
                internacional: puertosInternacional,
                recientes: puertosRecientes
            }
        };
    }
}

