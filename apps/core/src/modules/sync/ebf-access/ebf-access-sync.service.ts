import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PrismaClient, Prisma } from '@internal/ebf-portal-sync-client';
import { AccessPullerService } from './services/access-puller.service';
import { EbfPullerService } from './services/ebf-puller.service';
import { MatcherService } from './services/matcher.service';
import { PRISMA_EBF_PORTAL_SYNC } from './prisma/prisma-ebf-portal-sync.provider';
import type {
  AccessCoordinacionRow,
  MatchResult,
  SyncCycleReport,
} from './types/sync.types';

/**
 * Orquestador del sync hub (Fase 1, read-only).
 *
 * Ciclo:
 *   1. Pull EBF despacho + histórico (filtrado por EXPERTS HANDLING CARGO).
 *   2. Pull Access coordinaciones recientes (ventana N días).
 *   3. Match por AWB normalizado.
 *   4. Upsert al side-car (EbfCoordinacionSync + EbfDetalleAccessLink).
 *   5. Generar report del ciclo.
 *
 * NO escribe a Access (Modo 1 puro). NO escribe a EBF.
 */
@Injectable()
export class EbfAccessSyncService {
  private readonly logger = new Logger(EbfAccessSyncService.name);
  /** Ventana móvil de fechas Access a leer cada ciclo. */
  private readonly windowDays: number;
  /** Exportador EBF a tratar como propio. AWBs ajenos van a IGNORED. */
  private readonly ownExportador: string;

  constructor(
    private readonly accessPuller: AccessPullerService,
    private readonly ebfPuller: EbfPullerService,
    private readonly matcher: MatcherService,
    @Inject(PRISMA_EBF_PORTAL_SYNC)
    private readonly prisma: PrismaClient,
  ) {
    this.windowDays = parseInt(process.env.EBF_SYNC_WINDOW_DAYS || '30', 10);
    this.ownExportador =
      process.env.EBF_SYNC_OWN_EXPORTADOR || 'EXPERTS HANDLING CARGO';
  }

  /** Ejecuta un ciclo completo. Devuelve report con totales y errores. */
  async runCycle(): Promise<SyncCycleReport> {
    const startedAt = new Date();
    const errors: SyncCycleReport['errors'] = [];

    let accessRows: AccessCoordinacionRow[] = [];
    let ebfRows: Awaited<ReturnType<EbfPullerService['pullDespacho']>> = [];

    try {
      accessRows = await this.accessPuller.pullRecentCoordinaciones(
        this.windowDays,
      );
    } catch (err) {
      errors.push({
        stage: 'access-pull',
        message: (err as Error).message,
      });
      this.logger.error(`[sync] access pull failed: ${(err as Error).message}`);
    }

    try {
      const despacho = await this.ebfPuller.pullDespacho(this.ownExportador);
      const historico = await this.ebfPuller.pullHistorico(this.ownExportador);
      ebfRows = [...despacho, ...historico];
    } catch (err) {
      errors.push({
        stage: 'ebf-pull',
        message: (err as Error).message,
      });
      this.logger.error(`[sync] ebf pull failed: ${(err as Error).message}`);
    }

    const matches = this.matcher.matchEbfToAccess(ebfRows, accessRows);
    const onlyAccess = this.matcher.findOnlyAccess(accessRows, matches);

    let upserted = 0;
    let mismatches = 0;
    let matchedCount = 0;
    try {
      for (const m of matches) {
        await this.upsertMatch(m);
        upserted += 1;
        if (m.status === 'SYNCED') matchedCount += 1;
        if (m.status === 'MISMATCH') mismatches += 1;
      }
    } catch (err) {
      errors.push({
        stage: 'upsert',
        message: (err as Error).message,
      });
      this.logger.error(`[sync] upsert failed: ${(err as Error).message}`);
    }

    const endedAt = new Date();
    const report: SyncCycleReport = {
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: endedAt.getTime() - startedAt.getTime(),
      totals: {
        accessRows: accessRows.length,
        ebfRows: ebfRows.length,
        matched: matchedCount,
        onlyAccess: onlyAccess.length,
        onlyEbf: matches.filter((m) => m.status === 'ONLY_EBF').length,
        mismatches,
        ignored: 0, // F1 no tiene reglas de ignore aún
        upserted,
      },
      errors,
    };
    this.logger.log(
      `[sync] cycle done in ${report.durationMs}ms — matched=${report.totals.matched} onlyAccess=${report.totals.onlyAccess} onlyEbf=${report.totals.onlyEbf} mismatch=${report.totals.mismatches}`,
    );
    return report;
  }

  /** Lectura: filas del side-car por bucket. Sin paginación todavía (F1 chico). */
  async listByStatus(
    status:
      | 'SYNCED'
      | 'ONLY_EBF'
      | 'MISMATCH'
      | 'MANUAL_REVIEW'
      | 'IGNORED'
      | 'ALL',
    limit = 100,
  ) {
    return this.prisma.ebfCoordinacionSync.findMany({
      where: status === 'ALL' ? {} : { status },
      take: limit,
      orderBy: { lastSyncAt: 'desc' },
      include: { accessLinks: true },
    });
  }

  async getStats() {
    const rows = await this.prisma.ebfCoordinacionSync.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const byStatus = Object.fromEntries(
      rows.map((r) => [r.status, r._count._all]),
    );
    const total = rows.reduce((sum, r) => sum + r._count._all, 0);
    return { total, byStatus };
  }

  private async upsertMatch(m: MatchResult): Promise<void> {
    const { ebf, access, strategy, confidence, status, discrepancies } = m;

    const data = {
      ebfHawbCode: ebf.ebfHawbCode,
      awbNumber: ebf.awbNormalized,
      daeNumber: ebf.daeNumber,
      exportadorEbf: ebf.exportadorEbf,
      consigneeAlias: ebf.marcacionEbf,
      productoEbf: ebf.productoEbf,
      productoEbfId: null as number | null, // F1 no resuelve catálogo productos
      fechaVuelo: this.parseDate(ebf.etd),
      destinoFinal: ebf.destinoFinal,
      ebfBxsCoo: ebf.bxsCoo,
      ebfPcsCoo: ebf.pcsCoo,
      ebfBxsWh: ebf.bxsWh,
      ebfPcsWh: ebf.pcsWh,
      matchStrategy: strategy,
      matchConfidence: confidence,
      status,
      isOwnedByExperts:
        ebf.exportadorEbf.toUpperCase() === this.ownExportador.toUpperCase(),
      discrepancies: (discrepancies ?? undefined) as Prisma.InputJsonValue | undefined,
      lastSyncAt: new Date(),
    };

    const existing = await this.prisma.ebfCoordinacionSync.findUnique({
      where: { ebfDetalleId: ebf.detalleId },
      select: { id: true },
    });

    const saved = existing
      ? await this.prisma.ebfCoordinacionSync.update({
          where: { ebfDetalleId: ebf.detalleId },
          data,
        })
      : await this.prisma.ebfCoordinacionSync.create({
          data: { ...data, ebfDetalleId: ebf.detalleId },
        });

    // Refrescar links Access — borrar y recrear (más simple que diff)
    await this.prisma.ebfDetalleAccessLink.deleteMany({
      where: { ebfSyncId: saved.id },
    });
    if (access.length > 0) {
      await this.prisma.ebfDetalleAccessLink.createMany({
        data: access.map((a) => ({
          ebfSyncId: saved.id,
          accessBodCodigo: a.bodCodigo,
          accessDocTipo: a.docTipo,
          accessDocNumero: a.docNumero,
          accessDetNumero: null,
          accessHawb: null,
          accessPlaCodigo: null,
          accessProCodigo: null,
          accessFue: null,
          matchReason: strategy,
        })),
      });
    }
  }

  private parseDate(s: string | null): Date | null {
    if (!s) return null;
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d : null;
  }
}
