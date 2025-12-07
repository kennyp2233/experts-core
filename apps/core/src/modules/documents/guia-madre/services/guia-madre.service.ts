import { Injectable } from '@nestjs/common';
import { GuiaMadreCrudService } from './guia-madre-crud.service';
import { GuiaMadreSecuencialService } from './guia-madre-secuencial.service';
import { CreateGuiaMadreDto } from '../dto/create-guia-madre.dto';
import { UpdateGuiaMadreDto } from '../dto/update-guia-madre.dto';

@Injectable()
export class GuiaMadreService {
    constructor(
        private crudService: GuiaMadreCrudService,
        private secuencialService: GuiaMadreSecuencialService,
    ) { }

    generarSecuenciales(inicial: number, cantidad: number): number[] {
        return this.secuencialService.generarSecuenciales(inicial, cantidad);
    }

    async createLote(createGuiaMadreDto: CreateGuiaMadreDto, usuarioId?: string) {
        return this.crudService.createLote(createGuiaMadreDto, usuarioId);
    }

    async findAll(
        page = 1,
        limit = 10,
        aerolinea?: number,
        disponibles?: boolean
    ) {
        return this.crudService.findAll(page, limit, aerolinea, disponibles);
    }

    async findOne(id: number) {
        return this.crudService.findOne(id);
    }

    async update(id: number, updateGuiaMadreDto: UpdateGuiaMadreDto) {
        return this.crudService.update(id, updateGuiaMadreDto);
    }

    async getDisponibles(idAerolinea?: number) {
        return this.crudService.getDisponibles(idAerolinea);
    }
}
