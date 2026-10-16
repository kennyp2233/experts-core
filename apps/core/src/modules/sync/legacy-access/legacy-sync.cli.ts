/**
 * Corre el sync Access → PG desde la terminal, sin HTTP ni login:
 *
 *   npm run build
 *   npm run sync:legacy -- [--grupo=maestros|documentos] [--completo] [--dry-run] [--forzar] [--entidades=a,b]
 *
 * Necesita las mismas variables que la API (Postgres, Redis, bridge).
 */
import { NestFactory } from '@nestjs/core';

// El cron no debe arrancar dentro de esta corrida puntual.
process.env.LEGACY_SYNC_AUTOSTART = 'false';
process.env.EBF_SYNC_AUTOSTART = 'false';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const valor = (nombre: string) =>
    args.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3);
  const grupo = (valor('grupo') ?? 'maestros') as 'maestros' | 'documentos';
  const entidades = valor('entidades')?.split(',').map((e) => e.trim()).filter(Boolean);

  const { AppModule } = await import('../../../app.module');
  const { LegacySyncService } = await import('./legacy-sync.service');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    const r = await app.get(LegacySyncService).ejecutar({
      origen: 'manual',
      grupo,
      modo: args.includes('--completo') ? 'completo' : 'incremental',
      dryRun: args.includes('--dry-run'),
      forzar: args.includes('--forzar'),
      entidades,
    });
    console.log(
      `\nEjecución #${r.ejecucionId ?? '-'} [${r.grupo}/${r.modo}] → ${r.estado}${r.motivo ? ` (${r.motivo})` : ''}${r.dryRun ? ' [dry-run]' : ''}${r.forzado ? ' [forzado]' : ''} en ${(r.ms / 1000).toFixed(1)} s`,
    );
    console.table(
      r.entidades.map((e) => ({
        entidad: e.entidad,
        leidos: e.leidos,
        nuevos: e.creados,
        actualizados: e.actualizados,
        sinCambios: e.sinCambios,
        desactivados: e.desactivados,
        omitidos: e.omitidos.length,
        errores: e.errores.length + (e.errorFatal ? 1 : 0),
        segundos: Math.round(e.ms / 100) / 10,
      })),
    );
    for (const e of r.entidades) {
      if (e.errorFatal) console.log(`✖ ${e.entidad}: ${e.errorFatal}`);
      for (const x of e.errores.slice(0, 5)) console.log(`✖ ${e.entidad} [${x.clave}]: ${x.error}`);
      const motivos = new Map<string, number>();
      for (const x of e.omitidos) motivos.set(x.motivo, (motivos.get(x.motivo) ?? 0) + 1);
      for (const [m, n] of motivos) console.log(`· ${e.entidad}: ${n} omitido(s) — ${m}`);
    }
    process.exitCode = r.estado === 'OK' ? 0 : 1;
  } finally {
    await app.close();
  }
}

// Los pools de pg y las conexiones de Bull/Redis mantienen vivo el proceso
// aunque el contexto ya se cerró: salir explícitamente al terminar.
main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
