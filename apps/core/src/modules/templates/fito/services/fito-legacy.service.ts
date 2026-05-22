import { Injectable, Logger } from '@nestjs/common';
import { LegacyDbService } from '../../../integrations/legacy-db/legacy-db.service';
import {
  GuiaCompleta,
  GuiaData,
  DetalleGuia,
  GuiaMadre,
  MarcaData,
} from '../interfaces/guia-data.interface';

/**
 * Wrappers fito-específicos sobre `LegacyDbService` (acceso genérico al
 * legacy-bridge). Toda query a Access para guías/coordinaciones pasa por
 * acá — mantiene la lógica de domain dentro del módulo que la entiende.
 *
 * NO mover los `queryBridge` / `executeWrite` acá — esos viven en el
 * service compartido para que otros módulos los reusen (sync, etc.).
 */
@Injectable()
export class FitoLegacyService {
  private readonly logger = new Logger(FitoLegacyService.name);

  constructor(private readonly legacyDb: LegacyDbService) {}

  /** Lista de guías madre (PIN_dDocCoor JOIN PIN_MCoordina). */
  async listGuias(limit = 50): Promise<GuiaMadre[]> {
    try {
      const sql = `
        SELECT TOP ${limit}
            d.bodCodigo, d.docTipo, d.docNumero, d.docNumGuia, d.marCodigo,
            m.docFecha, m.docDestino, m.docFITODestino,
            mar.marNombre as consignatarioNombre, mar.marDireccion as consignatarioDireccion
        FROM ((PIN_dDocCoor AS d
        INNER JOIN PIN_MCoordina AS m ON d.bodCodigo = m.bodCodigo AND d.docTipo = m.docTipo AND d.docNumero = m.docNumero)
        LEFT JOIN PIN_auxMarcas AS mar ON d.marCodigo = mar.marCodigo)
        ORDER BY m.docFecha DESC
      `;
      const results = await this.legacyDb.queryBridge<GuiaMadre>(sql);
      return results || [];
    } catch (error) {
      this.logger.error(`Error listing guias: ${(error as Error).message}`);
      return [];
    }
  }

  /** Datos de marca / consignatario por código. */
  async getMarcaData(marCodigo: number): Promise<MarcaData | null> {
    try {
      const sql = `SELECT * FROM PIN_auxMarcas WHERE marCodigo = ${marCodigo}`;
      const results = await this.legacyDb.queryBridge<MarcaData>(sql);
      return results[0] || null;
    } catch (error) {
      this.logger.error(
        `Error fetching marca ${marCodigo}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /** Guía madre por docNumGuia (el AWB/guide visible al usuario). */
  async getGuiaByDocNumGuia(docNumGuia: string): Promise<GuiaMadre | null> {
    try {
      const sql = `
        SELECT d.bodCodigo, d.docTipo, d.docNumero, d.docNumGuia, d.marCodigo,
            m.docFecha, m.docDestino, m.docFITODestino,
            mar.marNombre as consignatarioNombre, mar.marDireccion as consignatarioDireccion
        FROM ((PIN_dDocCoor AS d
        INNER JOIN PIN_MCoordina AS m ON d.bodCodigo = m.bodCodigo AND d.docTipo = m.docTipo AND d.docNumero = m.docNumero)
        LEFT JOIN PIN_auxMarcas AS mar ON d.marCodigo = mar.marCodigo)
        WHERE d.docNumGuia = '${docNumGuia}'
      `;
      const results = await this.legacyDb.queryBridge<GuiaMadre>(sql);
      return results[0] || null;
    } catch (error) {
      this.logger.error(
        `Error fetching guia by docNumGuia ${docNumGuia}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async getGuiaCompleta(docNumero: number): Promise<GuiaCompleta> {
    try {
      const guiaSql = `SELECT * FROM PIN_MCoordina WHERE docNumero = ${docNumero}`;
      const guias = await this.legacyDb.queryBridge<GuiaData>(guiaSql);

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
      const detalles =
        await this.legacyDb.queryBridge<DetalleGuia>(detallesSql);

      return {
        guia,
        detalles,
        consignatario: {
          nombre: detalles[0]?.marNombre || '',
          direccion: detalles[0]?.marDireccion || '',
          fito: detalles[0]?.marFITO || '',
          paisSigla: detalles[0]?.marPaisSigla || '',
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching guia ${docNumero}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async getGuiasHijas(docNumero: number): Promise<DetalleGuia[]> {
    try {
      const madreSql = `SELECT docTipo, bodCodigo FROM PIN_MCoordina WHERE docNumero = ${docNumero}`;
      const madres = await this.legacyDb.queryBridge<{
        docTipo: string;
        bodCodigo: number;
      }>(madreSql);

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

      return this.legacyDb.queryBridge<DetalleGuia>(sql);
    } catch (error) {
      this.logger.error(
        `Error fetching guias hijas for ${docNumero}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async getDestinoByCode(desCodigo: string): Promise<{
    desCodigo: string;
    desNombre: string;
    desAeropuerto: string;
    desPais: string;
  } | null> {
    try {
      const sql = `SELECT desCodigo, desNombre, desAeropuerto, desPais FROM PIN_auxDestinos WHERE desCodigo = '${desCodigo}'`;
      const results = await this.legacyDb.queryBridge<{
        desCodigo: string;
        desNombre: string;
        desAeropuerto: string;
        desPais: string;
      }>(sql);
      return results[0] || null;
    } catch (error) {
      this.logger.error(
        `Error fetching destino ${desCodigo}: ${(error as Error).message}`,
      );
      return null;
    }
  }
}
