import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Único cliente al `legacy-bridge` (Express + node-adodb corriendo en el host
 * Windows con la DB Access). Toda comunicación con Access en el monorepo
 * pasa por acá — no instanciar otros clientes (ver CLAUDE.md, regla "única
 * puerta de entrada/salida a Access").
 *
 * Servicios consumidores:
 *   - `templates/fito/services/fito-legacy.service.ts` — wrappers de guías
 *   - `sync/ebf-access/services/access-puller.service.ts` — pull para sync
 */
@Injectable()
export class LegacyDbService {
  private readonly logger = new Logger(LegacyDbService.name);
  private readonly bridgeUrl: string;
  private readonly bridgeToken: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.bridgeUrl =
      this.configService.get<string>('ACCESS_BRIDGE_URL') ||
      'http://host.docker.internal:3006/query';
    this.bridgeToken =
      this.configService.get<string>('LEGACY_BRIDGE_TOKEN') ?? '';
    if (!this.bridgeToken) {
      this.logger.warn(
        'LEGACY_BRIDGE_TOKEN not set — bridge calls will fail with 401.',
      );
    }
    this.logger.log(
      `LegacyDbService configured with Bridge URL: ${this.bridgeUrl}`,
    );
  }

  private static readonly WRITE_KEYWORDS = [
    'UPDATE',
    'INSERT',
    'DELETE',
    'ALTER',
    'DROP',
    'CREATE',
    'TRUNCATE',
    'REPLACE',
    'MERGE',
    'EXEC',
    'EXECUTE',
  ];

  private detectWriteOperation(sql: string): string | null {
    let cleaned = sql.trim();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (cleaned.startsWith('/*')) {
        const end = cleaned.indexOf('*/');
        if (end === -1) break;
        cleaned = cleaned.slice(end + 2).trim();
      } else if (cleaned.startsWith('--')) {
        const eol = cleaned.indexOf('\n');
        cleaned = eol === -1 ? '' : cleaned.slice(eol + 1).trim();
      } else {
        break;
      }
    }
    const firstWord = cleaned.split(/\s+/)[0]?.toUpperCase() ?? '';
    return LegacyDbService.WRITE_KEYWORDS.includes(firstWord) ? firstWord : null;
  }

  /** SELECT-only. Rechaza cualquier mutación — usar `executeWrite` para esas. */
  async queryBridge<T>(sql: string): Promise<T[]> {
    const writeOp = this.detectWriteOperation(sql);
    if (writeOp) {
      throw new ForbiddenException(
        `queryBridge() rejected ${writeOp}. Use executeWrite() for mutations.`,
      );
    }
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          this.bridgeUrl,
          { sql },
          { headers: { 'X-Bridge-Token': this.bridgeToken } },
        ),
      );
      return data as T[];
    } catch (error) {
      this.logger.error(
        `Bridge Query Failed. URL: ${this.bridgeUrl}. Error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Mutaciones a Access (Modo 3 del híbrido — último recurso). Capa 2 del
   * guard: requiere flag explícito + razón. Capa 1 vive en el bridge mismo
   * (token + LEGACY_WRITES_ENABLED + bloqueo multi-statement).
   */
  async executeWrite(
    sql: string,
    options: { allowWrite: true; reason: string },
  ): Promise<unknown> {
    if (options?.allowWrite !== true) {
      throw new ForbiddenException(
        'executeWrite() requires { allowWrite: true } to mutate Access.',
      );
    }
    if (typeof options?.reason !== 'string' || options.reason.trim().length < 5) {
      throw new BadRequestException(
        'executeWrite() requires a "reason" string (min 5 chars) for audit.',
      );
    }
    const writeOp = this.detectWriteOperation(sql);
    if (!writeOp) {
      throw new BadRequestException(
        'executeWrite() called with non-mutating SQL. Use queryBridge() / read methods for SELECT.',
      );
    }
    this.logger.warn(
      `[LEGACY-WRITE] op=${writeOp} reason="${options.reason}" sql=${sql}`,
    );
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          this.bridgeUrl,
          { sql, allowWrite: true, reason: options.reason },
          { headers: { 'X-Bridge-Token': this.bridgeToken } },
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(
        `Legacy write failed. op=${writeOp} reason="${options.reason}" error=${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
