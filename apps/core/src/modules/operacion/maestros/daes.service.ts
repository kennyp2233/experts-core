import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';
import { modoOperacion } from '../comun/modo-operacion';
import { NombresMaestrosService, ref } from './nombres-maestros.service';
import { DaeFincaDto } from '../portal-fincas/portal-fincas.dto';

const hoy = () => {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());
  return new Date(`${s}T00:00:00Z`);
};
const dia = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Registro de DAEs desde la oficina (frmPIN_ManDAES / F4 "Actualizar FUE" de la
 * coordinación en el viejo: 3,5 % de las DAE desde 2025; el resto las cargan
 * las fincas en su portal). Misma tabla (`DaeFinca`, sincronizada de
 * awbm_auxdaes) y misma regla para proponerla al coordinar.
 */
@Injectable()
export class DaesService {
  constructor(
    @Inject('PrismaClientDatosMaestros') private readonly db: PrismaMaestros,
    private readonly nombres: NombresMaestrosService,
  ) {}

  async listar(f: { idFinca?: number; q?: string; vigentes?: boolean }) {
    const and: Prisma.DaeFincaWhereInput[] = [{ activa: true }];
    if (f.idFinca) and.push({ idFinca: f.idFinca });
    if (f.q?.trim()) and.push({ dae: { contains: f.q.trim() } });
    if (f.vigentes) and.push({ fechaInicio: { lte: hoy() }, fechaFin: { gte: hoy() } });
    else and.push({ fechaFin: { gte: new Date(hoy().getTime() - 62 * 86_400_000) } });
    const rs = await this.db.daeFinca.findMany({ where: { AND: and }, orderBy: [{ fechaInicio: 'desc' }, { id: 'desc' }], take: 300 });
    const refs = await this.nombres.resolver({ fincas: rs.map((r) => r.idFinca) });
    const paises = new Map(
      (await this.db.pais.findMany({ where: { siglasPais: { in: [...new Set(rs.map((r) => r.pais))] } } })).map((p) => [p.siglasPais, p.nombre]),
    );
    return rs.map((r) => {
      const finca = ref(refs.fincas, r.idFinca);
      return {
        id: r.id,
        idFinca: r.idFinca,
        finca: finca ? finca.alias || finca.nombre : null,
        pais: r.pais,
        nombrePais: paises.get(r.pais) ?? r.pais,
        desde: dia(r.fechaInicio),
        hasta: dia(r.fechaFin),
        dae: r.dae,
        vigente: r.fechaInicio <= hoy() && r.fechaFin >= hoy(),
        registradoPor: r.registradoPor,
        origenRegistro: r.codigoAccess !== null ? 'SISTEMA_VIEJO' : 'SISTEMA',
        // En modo sombra lo que vino del viejo se cambia allá.
        editable: r.codigoAccess === null || modoOperacion() === 'activo',
      };
    });
  }

  async crear(dto: DaeFincaDto, usuario?: string) {
    const finca = await this.db.finca.findUnique({ where: { id: dto.idFinca }, select: { id: true } });
    if (!finca) throw new BadRequestException('La finca no existe.');
    const desde = new Date(`${dto.desde.slice(0, 10)}T00:00:00Z`);
    const hasta = new Date(`${dto.hasta.slice(0, 10)}T00:00:00Z`);
    if (hasta < desde) throw new BadRequestException('La fecha "hasta" es anterior a "desde".');
    const pais = await this.db.pais.findUnique({ where: { siglasPais: dto.pais.toUpperCase() } });
    if (!pais) throw new BadRequestException('País desconocido.');
    const r = await this.db.daeFinca.create({
      data: {
        idFinca: dto.idFinca,
        origen: 'UIO',
        pais: pais.siglasPais,
        fechaInicio: desde,
        fechaFin: hasta,
        dae: dto.dae,
        activa: true,
        registradoPor: usuario ?? null,
        registradoEn: new Date(),
      },
    });
    return { id: r.id };
  }

  /** Nada se borra: se desactiva (deja de proponerse al coordinar). */
  async quitar(id: number) {
    const r = await this.db.daeFinca.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('La DAE no existe.');
    if (r.codigoAccess !== null && modoOperacion() === 'sombra') {
      throw new ForbiddenException('Esa DAE viene del sistema viejo: mientras ese sistema mande se cambia allá.');
    }
    await this.db.daeFinca.update({ where: { id }, data: { activa: false } });
    return { id, activa: false };
  }
}
