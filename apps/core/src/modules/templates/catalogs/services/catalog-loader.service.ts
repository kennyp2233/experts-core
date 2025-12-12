import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { readExcelFromBuffer } from '../../../../common/utils/excel-reader.util';
import { normalize } from '../../../../common/utils/normalizer.util';
import { ExcelProductoRow, ExcelPuertoRow } from '../interfaces/excel-row.interface';

@Injectable()
export class CatalogLoaderService {
    private readonly logger = new Logger(CatalogLoaderService.name);

    constructor(
        @Inject('PrismaClientTemplates') private prisma: PrismaClient,
    ) { }

    private findCol(row: Record<string, any>, patterns: string[]): string {
        const keys = Object.keys(row);
        for (const pattern of patterns) {
            const key = keys.find(k => k.toLowerCase().includes(pattern.toLowerCase()));
            if (key && row[key]) return row[key];
        }
        return '';
    }

    async loadProductosCatalog(buffer: Buffer) {
        this.logger.log(`Cargando productos desde archivo subido...`);
        const start = Date.now();
        const rows = readExcelFromBuffer<ExcelProductoRow>(buffer);

        if (rows.length > 0) {
            this.logger.log(`Excel columns found: ${Object.keys(rows[0]).join(', ')}`);
            this.logger.log(`Total rows to process: ${rows.length}`);
        }

        // Prepare data outside transaction
        const dataToInsert: any[] = [];
        let skipped = 0;

        for (const row of rows) {
            const nombreComun = this.findCol(row, ['nombre_comun', 'nombre comun', 'producto', 'descripcion']);
            const codigo = this.findCol(row, ['id_producto_unico', 'id_producto', 'codigo', 'code', 'cod']);
            const tipoProducto = this.findCol(row, ['nombre_tipo_producto', 'tipo_producto', 'tipo', 'categoria']);
            const subtipoProducto = this.findCol(row, ['nombre_subtipo_producto', 'subtipo_producto', 'subtipo']);
            const clasificacion = this.findCol(row, ['clasificacion', 'class']);

            if (!codigo || !nombreComun) {
                skipped++;
                continue;
            }

            dataToInsert.push({
                codigoAgrocalidad: codigo.toString().trim(),
                nombreComun: nombreComun.toString().trim(),
                nombreComunNormalizado: normalize(nombreComun),
                nombreTipoProducto: tipoProducto?.toString() || 'Generico',
                nombreSubtipoProducto: subtipoProducto?.toString() || null,
                clasificacion: clasificacion?.toString() || null,
                activo: true,
                fechaCarga: new Date(),
            });
        }

        this.logger.log(`Prepared ${dataToInsert.length} records, skipped ${skipped}`);

        // Delete and insert in transaction
        let loaded = 0;
        try {
            await this.prisma.$transaction(async (tx) => {
                // Clear existing
                await tx.catalogoProducto.deleteMany({});

                // Batch insert
                const result = await tx.catalogoProducto.createMany({
                    data: dataToInsert,
                    skipDuplicates: true,
                });
                loaded = result.count;
            }, { timeout: 120000 }); // 2 min timeout
        } catch (e) {
            this.logger.error(`Transaction error: ${e.message}`);
            return { loaded: 0, errors: dataToInsert.length, error: e.message };
        }

        this.logger.log(`Carga finalizada. Loaded: ${loaded}, Time: ${Date.now() - start}ms`);
        return { loaded, errors: 0 };
    }

    async loadPuertosCatalog(buffer: Buffer, esEcuador: boolean) {
        this.logger.log(`Cargando puertos (${esEcuador ? 'EC' : 'INT'}) desde archivo subido...`);
        const start = Date.now();
        const rows = readExcelFromBuffer<ExcelPuertoRow>(buffer);

        if (rows.length > 0) {
            this.logger.log(`Excel columns found: ${Object.keys(rows[0]).join(', ')}`);
            this.logger.log(`Total rows to process: ${rows.length}`);
        }

        // Prepare data outside transaction
        const dataToInsert: any[] = [];
        let skipped = 0;

        for (const row of rows) {
            const codigo = this.findCol(row, ['codigo', 'code', 'cod', 'unloco', 'locode']);
            const nombre = this.findCol(row, ['puerto', 'port', 'nombre', 'name', 'aeropuerto']);
            const pais = this.findCol(row, ['pais', 'country', 'paises']) || (esEcuador ? 'Ecuador' : '');
            const paisIngles = this.findCol(row, ['pais_ingles', 'country_english', 'english']);
            const tipoPuerto = this.findCol(row, ['tipo', 'type']);

            if (!codigo || !nombre) {
                skipped++;
                continue;
            }

            dataToInsert.push({
                codigoPuerto: codigo.toString().trim(),
                nombrePuerto: nombre.toString().trim(),
                nombrePuertoNormalizado: normalize(nombre),
                nombrePais: pais.toString().trim(),
                nombrePaisIngles: paisIngles?.toString() || null,
                tipoPuerto: tipoPuerto?.toString() || null,
                esEcuador,
                activo: true,
                fechaCarga: new Date(),
            });
        }

        this.logger.log(`Prepared ${dataToInsert.length} records, skipped ${skipped}`);

        let loaded = 0;
        try {
            await this.prisma.$transaction(async (tx) => {
                // Delete only puertos of this type (EC or INT)
                await tx.catalogoPuerto.deleteMany({ where: { esEcuador } });

                // Batch insert
                const result = await tx.catalogoPuerto.createMany({
                    data: dataToInsert,
                    skipDuplicates: true,
                });
                loaded = result.count;
            }, { timeout: 120000 });
        } catch (e) {
            this.logger.error(`Transaction error: ${e.message}`);
            return { loaded: 0, errors: dataToInsert.length, error: e.message };
        }

        this.logger.log(`Puertos carga finalizada. Loaded: ${loaded}, Time: ${Date.now() - start}ms`);
        return { loaded, errors: 0 };
    }
}
