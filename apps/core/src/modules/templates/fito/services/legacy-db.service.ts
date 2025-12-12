import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as odbc from 'odbc';
import { GuiaCompleta, GuiaData, DetalleGuia, GuiaMadre, MarcaData } from '../interfaces/guia-data.interface';

@Injectable()
export class LegacyDbService implements OnModuleInit, OnModuleDestroy {
    private connection: odbc.Connection | null = null;
    private readonly logger = new Logger(LegacyDbService.name);
    private readonly dbPath: string;
    private readonly connectionString: string;

    constructor(private configService: ConfigService) {
        this.dbPath = this.configService.get<string>('LEGACY_DB_PATH') || '';
        const dbPassword = this.configService.get<string>('LEGACY_DB_PASSWORD') || '';

        if (!this.dbPath) {
            this.logger.warn('LEGACY_DB_PATH not configured. Access DB connection will fail.');
            this.connectionString = '';
        } else {
            this.connectionString = `Driver={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=${this.dbPath};PWD=${dbPassword};`;
        }
    }

    async onModuleInit() {
        if (this.connectionString) {
            try {
                this.logger.log(`Connecting to Access DB...`);
                this.connection = await odbc.connect(this.connectionString);
                this.logger.log('Connected to Access database via ODBC');
            } catch (error) {
                this.logger.error(`Failed to connect to Access DB: ${JSON.stringify(error)}`);
            }
        }
    }

    async onModuleDestroy() {
        if (this.connection) {
            await this.connection.close();
            this.logger.log('Closed Access database connection');
        }
    }

    private async ensureConnection(): Promise<odbc.Connection> {
        if (!this.connection) {
            if (!this.connectionString) {
                throw new Error('Access DB not configured');
            }
            this.connection = await odbc.connect(this.connectionString);
        }
        return this.connection;
    }

    /**
     * List guías using PIN_dDocCoor with docNumGuia as the identifier users see
     */
    async listGuias(limit = 50): Promise<GuiaMadre[]> {
        try {
            const conn = await this.ensureConnection();
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
            return conn.query<GuiaMadre>(sql);
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
            const conn = await this.ensureConnection();
            const sql = `SELECT * FROM PIN_auxMarcas WHERE marCodigo = ${marCodigo}`;
            const results = await conn.query<MarcaData>(sql);
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
            const conn = await this.ensureConnection();
            const sql = `
                SELECT d.bodCodigo, d.docTipo, d.docNumero, d.docNumGuia, d.marCodigo,
                       m.docFecha, m.docDestino,
                       mar.marNombre as consignatarioNombre, mar.marDireccion as consignatarioDireccion
                FROM ((PIN_dDocCoor AS d
                INNER JOIN PIN_MCoordina AS m ON d.bodCodigo = m.bodCodigo AND d.docTipo = m.docTipo AND d.docNumero = m.docNumero)
                LEFT JOIN PIN_auxMarcas AS mar ON d.marCodigo = mar.marCodigo)
                WHERE d.docNumGuia = '${docNumGuia}'
            `;
            const results = await conn.query<GuiaMadre>(sql);
            return results[0] || null;
        } catch (error) {
            this.logger.error(`Error fetching guia by docNumGuia ${docNumGuia}: ${error.message}`);
            return null;
        }
    }

    async getGuiaCompleta(docNumero: number): Promise<GuiaCompleta> {
        try {
            const conn = await this.ensureConnection();

            const guiaSql = `SELECT * FROM PIN_MCoordina WHERE docNumero = ${docNumero}`;
            const guias = await conn.query<GuiaData>(guiaSql);

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
            const detalles = await conn.query<DetalleGuia>(detallesSql);

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
            const conn = await this.ensureConnection();

            const madreSql = `SELECT docTipo, bodCodigo FROM PIN_MCoordina WHERE docNumero = ${docNumero}`;
            const madres = await conn.query<{ docTipo: string; bodCodigo: number }>(madreSql);

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

            return conn.query<DetalleGuia>(sql);
        } catch (error) {
            this.logger.error(`Error fetching guias hijas for ${docNumero}: ${error.message}`);
            throw error;
        }
    }
}

