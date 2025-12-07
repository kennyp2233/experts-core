import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { GuiaMadreRepository } from '../repositories/guia-madre.repository';
import { GuiaMadreSecuencialService } from './guia-madre-secuencial.service';
import { DocumentoBaseService } from '../../documento-base/documento-base.service';
import { CreateGuiaMadreDto } from '../dto/create-guia-madre.dto';
import { UpdateGuiaMadreDto } from '../dto/update-guia-madre.dto';

@Injectable()
export class GuiaMadreCrudService {
    constructor(
        private guiaMadreRepository: GuiaMadreRepository,
        private secuencialService: GuiaMadreSecuencialService,
        private documentoBaseService: DocumentoBaseService,
    ) { }

    async createLote(createGuiaMadreDto: CreateGuiaMadreDto, usuarioId?: string) {
        const {
            prefijo,
            secuencialInicial,
            cantidad,
            idAerolinea,
            idAgenciaIata,
            fecha,
            tipoStock,
            prestamo,
            observaciones
        } = createGuiaMadreDto;

        const secuenciales = this.secuencialService.generarSecuenciales(secuencialInicial, cantidad);

        return this.guiaMadreRepository.runTransaction(async (prisma) => {
            // Crear el documento base delegando al servicio
            const documentoBase = await this.documentoBaseService.create({
                fecha: fecha ? new Date(fecha) : new Date(),
                idAerolinea,
                idAgenciaIata,
                tipoStock,
            }, prisma);

            const guiasCreadas = [];

            for (const secuencial of secuenciales) {
                const guiaMadre = await prisma.guiaMadre.create({
                    data: {
                        prefijo,
                        secuencial,
                        idDocumentoBase: documentoBase.id,
                        prestada: prestamo,
                        observaciones,
                        fechaPrestamo: prestamo ? new Date() : null,
                    },
                });
                guiasCreadas.push(guiaMadre);
            }

            return {
                documentoBase,
                guiasMadre: guiasCreadas,
                cantidadCreada: guiasCreadas.length,
            };
        });
    }

    async findAll(
        page = 1,
        limit = 10,
        aerolinea?: number,
        disponibles?: boolean
    ) {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (aerolinea) {
            where.documentoBase = {
                idAerolinea: aerolinea,
            };
        }

        if (disponibles) {
            where.documentoCoordinacion = null;
            where.prestada = false;
            where.devolucion = false;
        }

        const [guiasMadre, total] = await Promise.all([
            this.guiaMadreRepository.findAll({
                where,
                skip,
                take: limit
            }),
            this.guiaMadreRepository.count(where),
        ]);

        return {
            data: guiasMadre,
            meta: {
                total,
                page,
                limit,
                lastPage: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number) {
        const guiaMadre = await this.guiaMadreRepository.findById(id);
        if (!guiaMadre) {
            throw new NotFoundException(`Guía madre con ID ${id} no encontrada`);
        }
        return guiaMadre;
    }

    async update(id: number, updateGuiaMadreDto: UpdateGuiaMadreDto) {
        const guiaMadre = await this.guiaMadreRepository.findById(id);

        if (!guiaMadre) {
            throw new NotFoundException(`Guía madre con ID ${id} no encontrada`);
        }

        if (guiaMadre.documentoCoordinacion) {
            throw new BadRequestException('No se puede actualizar una guía madre asignada a un documento de coordinación');
        }

        const { prestamo, observaciones, fechaPrestamo, devolucion, fechaDevolucion } = updateGuiaMadreDto;

        // Logic for updates
        const updateData: any = { observaciones };

        if (prestamo !== undefined) updateData.prestada = prestamo;
        if (fechaPrestamo !== undefined) updateData.fechaPrestamo = new Date(fechaPrestamo);
        if (devolucion !== undefined) updateData.devolucion = devolucion;
        if (fechaDevolucion !== undefined) updateData.fechaDevolucion = new Date(fechaDevolucion);

        return this.guiaMadreRepository.update(id, updateData);
    }

    async getDisponibles(idAerolinea?: number) {
        return this.guiaMadreRepository.findDisponibles(idAerolinea);
    }
}
