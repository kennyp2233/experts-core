import { Injectable, Logger } from '@nestjs/common';
import * as convert from 'xml-js';
import { GuiaCompleta, DetalleGuia } from '../interfaces/guia-data.interface';
import { GenerateXmlDto } from '../dto/generate-xml.dto';

@Injectable()
export class XmlGeneratorService {
    private readonly logger = new Logger(XmlGeneratorService.name);

    async generateXML(guiaData: GuiaCompleta, dto: GenerateXmlDto): Promise<string> {
        const { config, guiasHijas } = dto;

        // Validate required config fields
        const requiredFields = ['tipoSolicitud', 'codigoIdioma', 'codigoTipoProduccion', 'fechaEmbarque',
            'codigoPuertoEc', 'codigoPuertoDestino', 'nombreMarca',
            'nombreConsignatario', 'direccionConsignatario'];
        const missingFields = requiredFields.filter(f => !config[f]);
        if (missingFields.length > 0) {
            throw new Error(`Campos requeridos faltantes en config: ${missingFields.join(', ')}`);
        }

        // Validate guiasHijas
        if (!guiasHijas || guiasHijas.length === 0) {
            throw new Error('No hay guías hijas para procesar. Verifique que existan registros con bultos/cantidad > 0.');
        }

        // Prepare Products - Use pre-aggregated guiasHijas from frontend
        const productosXml = [];
        for (const hija of guiasHijas) {
            if (!hija.plaRUC || hija.plaRUC === 'SIN_RUC') {
                throw new Error(`Producto ${hija.proCodigo} no tiene RUC de plantación`);
            }

            productosXml.push({
                codigoUnicoProducto: { _text: hija.codigoAgrocalidad },
                bulto: { _text: (hija.detCajas || 0).toFixed(2) },
                cantidad: { _text: (hija.detNumStems || 0).toFixed(2) },
                identificadorExportador: { _text: hija.plaRUC }
            });
        }

        // Construct XML Object using ONLY config values from frontend
        const xmlObject = {
            _declaration: { _attributes: { version: '1.0', encoding: 'utf-8' } },
            certificadoFitosanitario: {
                _attributes: {
                    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                    'xsi:noNamespaceSchemaLocation': 'certificadoFitosanitario.xsd'
                },
                id: {
                    datosGenerales: {
                        tipoSolicitud: { _text: config.tipoSolicitud },
                        codigoIdioma: { _text: config.codigoIdioma },
                        codigoTipoProduccion: { _text: config.codigoTipoProduccion },
                        fechaEmbarque: { _text: config.fechaEmbarque },
                        codigoPuertoEc: { _text: config.codigoPuertoEc },
                        nombreMarca: { _text: config.nombreMarca },
                        nombreConsignatario: { _text: config.nombreConsignatario },
                        direccionConsignatario: { _text: config.direccionConsignatario },
                        // Only include informacionAdicional if it has a value
                        ...(config.informacionAdicional ? { informacionAdicional: { _text: config.informacionAdicional } } : {})
                    },
                    datosPago: {
                        formaPago: { _text: 'SALDO' }
                    },
                    paisPuertosDestino: {
                        codigoPaisPuertoDestino: { _text: config.codigoPuertoDestino }
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
