import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { asegurarEditable } from '../comun/modo-operacion';
import { PrestarGuiaDto } from './dto/stock-guias.dto';
import { recalcularEstadoIngresos } from './estado-ingreso';

const fechaDe = (s?: string) => (s ? new Date(`${s.slice(0, 10)}T00:00:00Z`) : new Date());

/**
 * Movimientos de una guía (Administración de guías del sistema viejo,
 * `frmPIN_ManGuias`): préstamo, quitar préstamo, devolución y "Verificar
 * estado AWB". Cada cambio recalcula el estado de su ingreso.
 */
@Injectable()
export class StockGuiasService {
  constructor(@Inject(PRISMA_DOCUMENTOS) private readonly db: PrismaDocumentos) {}

  /** Préstamo: la guía la usó otra agencia (EBF, FlowerCargo) o no se usa. La observación es opcional. */
  async prestar(id: number, dto: PrestarGuiaDto) {
    const g = await this.guiaEditable(id);
    if (g.estado !== 'INGRESADA') throw new BadRequestException('Solo se presta una guía libre.');
    return this.guardar(g.idDocumentoBase, id, {
      estado: 'PRESTADA',
      prestada: true,
      fechaPrestamo: fechaDe(dto.fecha),
      observaciones: dto.observaciones?.trim() || g.observaciones,
    });
  }

  /** Quitar préstamo: vuelve a libre (en el sistema viejo, desmarcar "Préstamo"). */
  async quitarPrestamo(id: number) {
    const g = await this.guiaEditable(id);
    if (g.estado !== 'PRESTADA') throw new BadRequestException('La guía no está prestada.');
    return this.guardar(g.idDocumentoBase, id, {
      estado: 'INGRESADA',
      prestada: false,
      fechaPrestamo: null,
      devolucion: false,
      fechaDevolucion: null,
    });
  }

  async devolver(id: number, dto: PrestarGuiaDto) {
    const g = await this.guiaEditable(id);
    if (g.estado !== 'PRESTADA') throw new BadRequestException('Solo se registra la devolución de una guía prestada.');
    return this.guardar(g.idDocumentoBase, id, {
      devolucion: true,
      fechaDevolucion: fechaDe(dto.fecha),
      observaciones: dto.observaciones?.trim() || g.observaciones,
    });
  }

  /**
   * "Verificar estado AWB": si una coordinación usa la guía queda coordinada;
   * si no, libre (como el sistema viejo, también si estaba prestada).
   */
  async verificar(id: number) {
    const g = await this.guiaEditable(id);
    if (g.estado === 'ANULADA') throw new BadRequestException('La guía está anulada.');
    const usada = await this.db.documentoCoordinacion.findUnique({ where: { idGuiaMadre: id }, select: { id: true } });
    const estado = usada ? ('COORDINADA' as const) : ('INGRESADA' as const);
    return this.guardar(g.idDocumentoBase, id, {
      estado,
      ...(estado === 'INGRESADA' ? { prestada: false, fechaPrestamo: null, devolucion: false, fechaDevolucion: null } : {}),
    });
  }

  private guardar(idDocumentoBase: number, id: number, data: Parameters<PrismaDocumentos['guiaMadre']['update']>[0]['data']) {
    return this.db.$transaction(async (tx) => {
      const g = await tx.guiaMadre.update({ where: { id }, data });
      await recalcularEstadoIngresos(tx, [idDocumentoBase]);
      return g;
    });
  }

  private async guiaEditable(id: number) {
    const g = await this.db.guiaMadre.findUnique({ where: { id }, include: { documentoBase: { select: { codigoAccess: true } } } });
    if (!g) throw new NotFoundException('Guía no encontrada');
    asegurarEditable(g.documentoBase, `La guía ${g.numero}`);
    return g;
  }
}
