import { Provider } from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@internal/ebf-portal-sync-client';

export const PRISMA_EBF_PORTAL_SYNC = 'PrismaClientEbfPortalSync';

/**
 * Factory para el PrismaClient del schema `ebf_portal_sync` (side-car).
 * Sigue el mismo patrón que `DocumentoBaseModule` — Pool de `pg` +
 * adapter `PrismaPg`, URL desde `DATABASE_URL_EBF_PORTAL_SYNC`.
 */
export const PrismaEbfPortalSyncProvider: Provider = {
  provide: PRISMA_EBF_PORTAL_SYNC,
  useFactory: () => {
    const connectionString = process.env.DATABASE_URL_EBF_PORTAL_SYNC;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL_EBF_PORTAL_SYNC no configurado — agregar a .env',
      );
    }
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter } as never);
  },
};
