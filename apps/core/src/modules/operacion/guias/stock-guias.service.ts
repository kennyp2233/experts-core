import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { asegurarEditable } from '../comun/modo-operacion';
import { awbClave, awbTexto, parsearSerial, rangoAwb } from './awb';
import { IngresarLoteDto, PrestarGuiaDto } from './dto/stock-guias.dto';

const MAX_POR_LOTE = 500;

/**
 * Movimientos del stock de guías AWB en el sistema nuevo: ingreso de un lote
 * (rango de guías de una aerolínea), préstamo y devolución.
 */
@Injectable()
export class StockGuiasService {
  constructor(
    @Inject(PRISMA_DOCUMENTOS) private readonly db: PrismaDocumentos,
    @Inject('PrismaClientDatosMaestros') private readonly maestros: PrismaMaestros,
  ) {}

  /** Arma el lote sin guardarlo: números, verificadores y choques con el stock. */
  async previsualizar(dto: IngresarLoteDto) {
    const aerolinea = await this.maestros.aerolinea.findUnique({
      where: { id: dto.idAerolinea },
      select: { id: true, nombre: true, codigo: true, prefijoAwb: true, estado: true },
    });
    if (!aerolinea) throw new NotFoundException('Aerolínea no encontrada');
    const prefijo = Number(aerolinea.prefijoAwb);
    if (!/^\d{3}$/.test(aerolinea.prefijoAwb ?? '')) {
      throw new BadRequestException(`La aerolínea ${aerolinea.nombre} no tiene un prefijo AWB numérico de 3 dígitos.`);
    }
    if (dto.cantidad < 1 || dto.cantidad > MAX_POR_LOTE) {
      throw new BadRequestException(`La cantidad debe estar entre 1 y ${MAX_POR_LOTE}.`);
    }
    const { serial, error } = parsearSerial(dto.primeraGuia);
    if (error) throw new BadRequestException(error);
    if (serial + dto.cantidad - 1 > 9_999_999) throw new BadRequestException('El rango se pasa del último serial posible.');

    const guias = rangoAwb(prefijo, serial, dto.cantidad);
    const claves = guias.map(awbClave);
    const existentes = await this.db.guiaMadre.findMany({ where: { numero: { in: claves } }, select: { numero: true } });
    return {
      aerolinea,
      guias: guias.map((g) => ({ numero: awbClave(g), texto: awbTexto(g) })),
      repetidas: existentes.map((e) => e.numero),
    };
  }

  async ingresarLote(dto: IngresarLoteDto) {
    const p = await this.previsualizar(dto);
    if (p.repetidas.length) {
      throw new ConflictException(`Ya están en el stock: ${p.repetidas.slice(0, 10).join(', ')}${p.repetidas.length > 10 ? '…' : ''}`);
    }
    const prefijo = Number(p.aerolinea.prefijoAwb);
    return this.db.$transaction(async (tx) => {
      const lote = await tx.documentoBase.create({
        data: {
          fecha: dto.fecha ? new Date(`${dto.fecha.slice(0, 10)}T00:00:00Z`) : new Date(new Date().toISOString().slice(0, 10)),
          idAerolinea: p.aerolinea.id,
          tipoStock: dto.virtual ? 'VIRTUAL' : 'NORMAL',
          estado: 'INGRESADO',
          referencia: dto.referencia ?? null,
          nota: dto.nota ?? null,
        },
      });
      await tx.guiaMadre.createMany({
        data: p.guias.map((g) => ({
          numero: g.numero,
          prefijo,
          secuencial: Number(g.numero.slice(4)),
          idDocumentoBase: lote.id,
          idAerolinea: p.aerolinea.id,
          estado: 'INGRESADA' as const,
          virtual: !!dto.virtual,
        })),
      });
      return { lote: { id: lote.id, fecha: lote.fecha }, guias: p.guias.length };
    });
  }

  async prestar(id: number, dto: PrestarGuiaDto) {
    const g = await this.guiaEditable(id);
    if (g.estado !== 'INGRESADA') throw new BadRequestException('Solo se puede prestar una guía disponible (ingresada).');
    return this.db.guiaMadre.update({
      where: { id },
      data: {
        estado: 'PRESTADA',
        prestada: true,
        fechaPrestamo: dto.fecha ? new Date(`${dto.fecha.slice(0, 10)}T00:00:00Z`) : new Date(),
        observaciones: dto.observaciones ?? g.observaciones,
      },
    });
  }

  async devolver(id: number, dto: PrestarGuiaDto) {
    const g = await this.guiaEditable(id);
    if (g.estado !== 'PRESTADA') throw new BadRequestException('Solo se puede devolver una guía prestada.');
    return this.db.guiaMadre.update({
      where: { id },
      data: {
        devolucion: true,
        fechaDevolucion: dto.fecha ? new Date(`${dto.fecha.slice(0, 10)}T00:00:00Z`) : new Date(),
        observaciones: dto.observaciones ?? g.observaciones,
      },
    });
  }

  private async guiaEditable(id: number) {
    const g = await this.db.guiaMadre.findUnique({ where: { id }, include: { documentoBase: { select: { codigoAccess: true } } } });
    if (!g) throw new NotFoundException('Guía no encontrada');
    asegurarEditable(g.documentoBase, `La guía ${g.numero}`);
    return g;
  }
}
