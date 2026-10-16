import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient as PrismaDocumentos } from '@internal/documentos-client';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';
import { PRISMA_DOCUMENTOS } from '../../database/database.module';
import { armarArchivoFlowerCargo, FilaFlowerCargo, textoArchivo } from './flowercargo';

/** OCE de FlowerCargo como consolidador en ECUAPASS (sale en su propio archivo). */
const OCE_FLOWERCARGO = () => process.env.FLOWERCARGO_OCE || '23901050';

export interface ArchivoFlowerCargo {
  nombreArchivo: string;
  filas: Array<Omit<FilaFlowerCargo, 'columnas'>>;
  advertencias: string[];
  texto: string;
}

/** Arma el archivo de manifiesto que se le manda a FlowerCargo para una coordinación. */
@Injectable()
export class FlowerCargoService {
  constructor(
    @Inject(PRISMA_DOCUMENTOS) private readonly db: PrismaDocumentos,
    @Inject('PrismaClientDatosMaestros') private readonly maestros: PrismaMaestros,
  ) {}

  async generar(id: number): Promise<ArchivoFlowerCargo> {
    const c = await this.db.documentoCoordinacion.findUnique({
      where: { id },
      include: { manifiesto: true, rutas: { orderBy: { orden: 'asc' } }, guiaHijas: true },
    });
    if (!c) throw new NotFoundException('La coordinación no existe.');

    const idsDestino = [c.idDestinoAwb, c.idDestinoFinalDocs].filter((x): x is number => x !== null);
    const [aerolinea, destinos, cae, fincas, embarque] = await Promise.all([
      c.idAerolinea ? this.maestros.aerolinea.findUnique({ where: { id: c.idAerolinea } }) : null,
      this.maestros.destino.findMany({ where: { id: { in: idsDestino } }, include: { pais: true } }),
      c.idConsignatario ? this.maestros.consignatarioCaeSice.findUnique({ where: { idConsignatario: c.idConsignatario } }) : null,
      this.maestros.finca.findMany({ where: { id: { in: [...new Set(c.guiaHijas.map((g) => g.idFinca))] } } }),
      c.idTipoEmbarque ? this.maestros.tipoEmbarque.findUnique({ where: { id: c.idTipoEmbarque } }) : null,
    ]);
    const destino = (idDestino: number | null) => {
      const d = destinos.find((x) => x.id === idDestino);
      return { codigo: d?.codigo ?? null, pais: d?.pais?.siglasPais ?? null };
    };
    const finca = new Map(fincas.map((f) => [f.id, f]));
    const m = c.manifiesto;
    const origenRuta = c.rutas.find((r) => r.tipoRuta === 'ORIGEN')?.codigo;
    const mercancia =
      embarque?.mercancia?.trim() || embarque?.descripcionGuia?.split('\n')[0]?.trim() || 'FRESH FLOWERS';

    const { filas, advertencias } = armarArchivoFlowerCargo({
      awb: c.numeroGuia ?? '',
      fechaVuelo: c.fechaVuelo,
      manifiesto: {
        prefijo: m?.referencia?.split('-')[0] ?? 'CEC',
        aduana: m?.aduana ?? '055',
        anio: m?.anio ?? null,
        tipo: m?.tipo ?? aerolinea?.codigo ?? null,
        numero: m?.numero ?? null,
        secuencial: m?.secuencial ?? null,
      },
      aerolinea: { nombre: aerolinea?.nombre ?? '', codigoCae: aerolinea?.codigoCae ?? null },
      origen: m?.origen || origenRuta || 'UIO',
      destinoAwb: destino(c.idDestinoAwb),
      destinoFinal: destino(c.idDestinoFinalDocs ?? c.idDestinoAwb),
      consignee: {
        nombre: cae?.hawbNombre ?? null,
        direccion: cae?.hawbDireccion ?? null,
        tipoDocumento: cae?.hawbTipoDocumento ?? null,
        documento: cae?.hawbDocumento ?? null,
        pais: cae?.hawbSiglasPais ?? null,
      },
      notify: {
        nombre: cae?.notifyNombre ?? null,
        direccion: cae?.notifyDireccion ?? null,
        tipoDocumento: cae?.notifyTipoDocumento ?? null,
        documento: cae?.notifyDocumento ?? null,
        pais: cae?.notifySiglasPais ?? null,
      },
      mercancia,
      oceConsolidador: OCE_FLOWERCARGO(),
      guias: c.guiaHijas.map((g) => {
        const f = finca.get(g.idFinca);
        return {
          numero: g.numeroGuiaHija,
          dae: g.dae,
          piezas: g.totalPiezas,
          kg: g.pesoBruto,
          finca: {
            ruc: f?.rucFinca ?? null,
            nombre: f?.nombreFinca ?? `Finca ${g.idFinca}`,
            direccion: f?.direccion ?? null,
            tipoDocumento: f?.tipoDocumento ?? null,
          },
        };
      }),
    });

    return {
      nombreArchivo: `flowercargo-${(c.numeroGuia ?? String(id)).replace(/\s/g, '')}.txt`,
      filas: filas.map(({ columnas: _c, ...f }) => f),
      advertencias,
      texto: textoArchivo(filas),
    };
  }
}
