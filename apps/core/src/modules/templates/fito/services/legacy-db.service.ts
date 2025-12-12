import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GuiaCompleta, GuiaData, DetalleGuia, GuiaMadre, MarcaData } from '../interfaces/guia-data.interface';

@Injectable()
export class LegacyDbService {
    private readonly logger = new Logger(LegacyDbService.name);
    private readonly bridgeUrl: string;

    constructor(
        private configService: ConfigService,
        private httpService: HttpService
    ) {
        // Default to host.docker.internal for Docker -> Host communication
        this.bridgeUrl = this.configService.get<string>('ACCESS_BRIDGE_URL') || 'http://host.docker.internal:3006/query';
        this.logger.log(`LegacyDbService configured with Bridge URL: ${this.bridgeUrl}`);
    }

    /**
     * Executes a SQL query via the Access Bridge
     */
    private async queryBridge<T>(sql: string): Promise<T[]> {
        try {
            const { data } = await firstValueFrom(
                this.httpService.post(this.bridgeUrl, { sql })
            );
            return data as T[];
        } catch (error) {
            this.logger.error(`Bridge Query Failed. URL: ${this.bridgeUrl}. Error: ${error.message}`, error.stack);
            // Return empty array on failure to avoid crashing the app, or rethrow? 
            // Original code caught errors and returned empty array or null mostly.
            // But sometimes threw. Let's try to match behavior per method, but here we explicitly throw 
            // so the caller handles it or we return empty based on context. 
            // Actually, best to throw here and handle in methods.
            throw error;
        }
    }

    /**
     * List guías using PIN_dDocCoor with docNumGuia as the identifier users see
     */
    async listGuias(limit = 50): Promise<GuiaMadre[]> {
        try {
            const sql = `
                SELECT TOP ${limit}
                    d.bodCodigo, d.docTipo, d.docNumero, d.docNumGuia, d.marCodigo,
                    m.docFecha, m.docDestino,
                    mar.marNombre as consignatarioNombre, mar.marDireccion as consignatarioDireccion
                FROM ((PIN_dDocCoor AS d
                INNER JOIN PIN_MCoordina AS m ON d.bodCodigo = m.bodCodigo AND d.docTipo = m.docTipo AND d.docNumero = m.docNumero)
                LEFT JOIN PIN_auxMarcas AS mar ON d.marCodigo = mar.marCodigo)
                ORDER BY m.docFecha DESC
            `;
            const results = await this.queryBridge<GuiaMadre>(sql);
            return results || [];
        } catch (error) {
            this.logger.error(`Error listing guias: ${error.message}`);
            return [];
        }
    }

    /**
     * Get marca/consignatario data
     */
    async getMarcaData(marCodigo: number): Promise<MarcaData | null> {
        try {
            const sql = `SELECT * FROM PIN_auxMarcas WHERE marCodigo = ${marCodigo}`;
            const results = await this.queryBridge<MarcaData>(sql);
            return results[0] || null;
        } catch (error) {
            this.logger.error(`Error fetching marca ${marCodigo}: ${error.message}`);
            return null;
        }
    }

    /**
     * Get Guía Madre by docNumGuia (the AWB/guide number users see)
     */
    async getGuiaByDocNumGuia(docNumGuia: string): Promise<GuiaMadre | null> {
        try {
            const sql = `
                SELECT d.bodCodigo, d.docTipo, d.docNumero, d.docNumGuia, d.marCodigo,
                    m.docFecha, m.docDestino,
                    mar.marNombre as consignatarioNombre, mar.marDireccion as consignatarioDireccion
                FROM ((PIN_dDocCoor AS d
                INNER JOIN PIN_MCoordina AS m ON d.bodCodigo = m.bodCodigo AND d.docTipo = m.docTipo AND d.docNumero = m.docNumero)
                LEFT JOIN PIN_auxMarcas AS mar ON d.marCodigo = mar.marCodigo)
                WHERE d.docNumGuia = '${docNumGuia}'
            `;
            const results = await this.queryBridge<GuiaMadre>(sql);
            return results[0] || null;
        } catch (error) {
            this.logger.error(`Error fetching guia by docNumGuia ${docNumGuia}: ${error.message}`);
            return null;
        }
    }

    async getGuiaCompleta(docNumero: number): Promise<GuiaCompleta> {
        try {
            const guiaSql = `SELECT * FROM PIN_MCoordina WHERE docNumero = ${docNumero}`;
            const guias = await this.queryBridge<GuiaData>(guiaSql);

            if (!guias || guias.length === 0) {
                throw new Error(`Guía ${docNumero} no encontrada en Access.`);
            }
            const guia = guias[0];

            const docTipo = guia['docTipo'];
            const bodCodigo = guia['bodCodigo'];

            const detallesSql = `
                SELECT d.*, 
                       m.marNombre, m.marDireccion, m.marPaisSigla, m.marFITO,
                       p.plaRUC, p.plaNombre
                FROM ((PIN_DCoordina AS d
                LEFT JOIN PIN_auxMarcas AS m ON d.marCodigo = m.marCodigo)
                LEFT JOIN PIN_auxPlantaciones AS p ON d.plaCodigo = p.plaCodigo)
                WHERE d.docNumero = ${docNumero} 
                  AND d.docTipo = '${docTipo}' 
                  AND d.bodCodigo = ${bodCodigo}
            `;
            const detalles = await this.queryBridge<DetalleGuia>(detallesSql);

            return {
                guia,
                detalles,
                consignatario: {
                    nombre: detalles[0]?.marNombre || '',
                    direccion: detalles[0]?.marDireccion || '',
                    fito: detalles[0]?.marFITO || '',
                    paisSigla: detalles[0]?.marPaisSigla || ''
                }
            };

        } catch (error) {
            this.logger.error(`Error fetching guia ${docNumero}: ${error.message}`, error.stack);
            throw error;
        }
    }

    async getGuiasHijas(docNumero: number): Promise<DetalleGuia[]> {
        try {
            const madreSql = `SELECT docTipo, bodCodigo FROM PIN_MCoordina WHERE docNumero = ${docNumero}`;
            const madres = await this.queryBridge<{ docTipo: string; bodCodigo: number }>(madreSql);

            if (!madres || madres.length === 0) {
                throw new Error(`Guía Madre ${docNumero} no encontrada`);
            }

            const { docTipo, bodCodigo } = madres[0];

            const sql = `
                SELECT d.*, 
                       m.marNombre, m.marDireccion, m.marPaisSigla, m.marFITO,
                       p.plaRUC, p.plaNombre
                FROM ((PIN_DCoordina AS d
                LEFT JOIN PIN_auxMarcas AS m ON d.marCodigo = m.marCodigo)
                LEFT JOIN PIN_auxPlantaciones AS p ON d.plaCodigo = p.plaCodigo)
                WHERE d.docNumero = ${docNumero} 
                  AND d.docTipo = '${docTipo}' 
                  AND d.bodCodigo = ${bodCodigo}
            `;

            return this.queryBridge<DetalleGuia>(sql);
        } catch (error) {
            this.logger.error(`Error fetching guias hijas for ${docNumero}: ${error.message}`);
            throw error;
        }
    }
}
