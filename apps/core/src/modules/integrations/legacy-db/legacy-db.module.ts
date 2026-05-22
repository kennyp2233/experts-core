import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LegacyDbService } from './legacy-db.service';

/**
 * Módulo que provee acceso al `legacy-bridge` (Access). Importar este
 * módulo en cualquier feature que necesite consultar Access.
 * NO crear clientes propios — ver CLAUDE.md.
 */
@Module({
  imports: [HttpModule],
  providers: [LegacyDbService],
  exports: [LegacyDbService],
})
export class LegacyDbModule {}
