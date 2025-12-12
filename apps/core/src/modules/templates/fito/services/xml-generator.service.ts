import { Injectable, Logger } from '@nestjs/common';
import * as convert from 'xml-js';
import { GuiaCompleta, DetalleGuia } from '../interfaces/guia-data.interface';
import { GenerateXmlDto } from '../dto/generate-xml.dto';

@Injectable()
export class XmlGeneratorService {
    private readonly logger = new Logger(XmlGeneratorService.name);

    async generateXML(guiaData: GuiaCompleta, dto: GenerateXmlDto): Promise<string> {
        const { guia, detalles, consignatario } = guiaData;
        const { config, productMappings } = dto;

        // Build product mapping lookup
        const productMap = new Map<string, string>();
        if (productMappings && productMappings.length > 0) {
            productMappings.forEach(m => {
                productMap.set(m.originalCode, m.codigoAgrocalidad);
            });
        }

        // Prepare Products
        const productosXml = [];
        for (const detalle of detalles) {
            // Use mapping if available, otherwise fallback to original code
            const codigoUnico = productMap.get(detalle.proCodigo) || detalle.proCodigo;

            productosXml.push({
                codigoUnicoProducto: { _text: codigoUnico },
                bulto: { _text: (detalle.detCajas || 0).toFixed(2) },
                cantidad: { _text: (detalle.detNumStems || 0).toFixed(2) },
                identificadorExportador: { _text: detalle.plaRUC || '9999999999999' }
            });
        }

        // Construct XML Object using config values from frontend
        const xmlObject = {
            _declaration: { _attributes: { version: '1.0', encoding: 'utf-8' } },
            certificadoFitosanitario: {
                _attributes: {
                    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                    'xsi:noNamespaceSchemaLocation': 'certificadoFitosanitario.xsd'
                },
                id: {
                    datosGenerales: {
                        tipoSolicitud: { _text: config.tipoSolicitud || 'ORNAMENTALES' },
                        codigoIdioma: { _text: config.codigoIdioma || 'SPA' },
                        codigoTipoProduccion: { _text: config.codigoTipoProduccion || 'CONV' },
                        fechaEmbarque: { _text: config.fechaEmbarque || this.formatDate(guia.docFecha) },
                        codigoPuertoEc: { _text: config.codigoPuertoEc || 'AEECUIO' },
                        nombreMarca: { _text: config.nombreMarca || 'LAS DEL EXPORTADOR' },
                        nombreConsignatario: { _text: config.nombreConsignatario || consignatario.nombre },
                        direccionConsignatario: { _text: config.direccionConsignatario || consignatario.direccion },
                        informacionAdicional: { _text: consignatario.fito || guia.docNota || '' }
                    },
                    datosPago: {
                        formaPago: { _text: 'SALDO' }
                    },
                    paisPuertosDestino: {
                        codigoPaisPuertoDestino: { _text: config.codigoPuertoDestino || 'USMIA' }
                    },
                    exportadoresProductos: {
                        producto: productosXml
                    }
                }
            }
        };

        return convert.js2xml(xmlObject, { compact: true, spaces: 2 });
    }

    private formatDate(dateStr: string): string {
        try {
            const d = new Date(dateStr);
            return d.toISOString().split('T')[0];
        } catch {
            return '2025-01-01';
        }
    }
}
