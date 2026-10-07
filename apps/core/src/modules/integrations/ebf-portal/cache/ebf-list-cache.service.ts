import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../redis/redis.module';

/** Listas read-only que scrapean el portal (lentas: 10-20 s por request). */
export type EbfListCacheNamespace = 'coordinaciones' | 'daes' | 'customer-awbs';

type KeyParams = Record<string, string | number | boolean | null | undefined>;

const KEY_ROOT = 'ebf-portal:list';
/** Set con las keys vivas de cada namespace — permite invalidar sin SCAN (keyPrefix de ioredis no aplica a SCAN). */
const INDEX_ROOT = 'ebf-portal:list-index';
const TTL_SECONDS = 120;
/** Redis caído/lento nunca debe frenar la request: tope duro por operación. */
const REDIS_OP_TIMEOUT_MS = 300;

/** `?fresh=true|1` → true. Tolera query repetida (array) y ausencia. */
export function parseFreshFlag(value?: string | string[]): boolean {
  const v = Array.isArray(value) ? value[value.length - 1] : value;
  return v === 'true' || v === '1';
}

/**
 * Cache server-side (Redis, TTL 120 s) para las listas del portal EBF.
 *
 * - Key = namespace + query normalizada (params ordenados, vacíos fuera).
 * - `fresh` saltea la lectura, hace fetch en vivo y SOBRESCRIBE la entry
 *   (SET … EX 120) antes de devolver la respuesta.
 * - Cualquier falla de Redis (caído, timeout, JSON corrupto) degrada a
 *   fetch en vivo — nunca propaga error al caller.
 * - Fetches idénticos concurrentes se deduplican in-process.
 * - `invalidate()` borra todas las keys del namespace; un fetch que estaba
 *   en vuelo al invalidar no repuebla la cache (evita guardar data vieja).
 *
 * Solo para uso desde controllers: los services del portal (y el sync hub)
 * siguen leyendo en vivo.
 */
@Injectable()
export class EbfListCacheService {
  private readonly logger = new Logger(EbfListCacheService.name);
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly generation = new Map<EbfListCacheNamespace, number>();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async getOrFetch<T>(
    namespace: EbfListCacheNamespace,
    params: KeyParams,
    fetcher: () => Promise<T>,
    opts: { fresh?: boolean } = {},
  ): Promise<T> {
    const key = this.buildKey(namespace, params);

    if (!opts.fresh) {
      const hit = await this.read<T>(key);
      if (hit !== undefined) {
        this.logger.debug(`[EBF-CACHE] HIT ${key}`);
        return hit;
      }
      const pending = this.inFlight.get(key) as Promise<T> | undefined;
      if (pending) return pending;
    }

    this.logger.debug(`[EBF-CACHE] ${opts.fresh ? 'FRESH' : 'MISS'} ${key}`);
    const startedAtGeneration = this.currentGeneration(namespace);
    const promise: Promise<T> = fetcher()
      .then(async (value) => {
        // Awaited (acotado por timeout, nunca lanza): cuando la respuesta
        // sale, la entry ya quedó sobrescrita — `fresh` deja la cache al día
        // para las lecturas siguientes.
        if (this.currentGeneration(namespace) === startedAtGeneration) {
          await this.write(namespace, key, value);
        }
        return value;
      })
      .finally(() => {
        if (this.inFlight.get(key) === promise) this.inFlight.delete(key);
      });
    this.inFlight.set(key, promise);
    return promise;
  }

  /** Borra todas las entradas del namespace. Nunca lanza. */
  async invalidate(namespace: EbfListCacheNamespace): Promise<void> {
    this.generation.set(namespace, this.currentGeneration(namespace) + 1);
    const prefix = `${KEY_ROOT}:${namespace}:`;
    for (const k of [...this.inFlight.keys()]) {
      if (k.startsWith(prefix)) this.inFlight.delete(k);
    }

    if (!this.isRedisReady()) return;
    const indexKey = `${INDEX_ROOT}:${namespace}`;
    try {
      const keys = await this.withTimeout(this.redis.smembers(indexKey));
      await this.withTimeout(this.redis.del(indexKey, ...keys));
      this.logger.debug(`[EBF-CACHE] invalidated ${namespace} (${keys.length} keys)`);
    } catch (err) {
      this.logger.warn(
        `[EBF-CACHE] invalidate ${namespace} failed: ${this.describe(err)} — entries expire in ≤${TTL_SECONDS}s`,
      );
    }
  }

  private async read<T>(key: string): Promise<T | undefined> {
    if (!this.isRedisReady()) return undefined;
    try {
      const raw = await this.withTimeout(this.redis.get(key));
      return raw == null ? undefined : (JSON.parse(raw) as T);
    } catch (err) {
      this.logger.warn(`[EBF-CACHE] read ${key} failed: ${this.describe(err)} — live fetch`);
      return undefined;
    }
  }

  private async write(
    namespace: EbfListCacheNamespace,
    key: string,
    value: unknown,
  ): Promise<void> {
    if (!this.isRedisReady()) return;
    const indexKey = `${INDEX_ROOT}:${namespace}`;
    try {
      await this.withTimeout(
        this.redis
          .multi()
          .set(key, JSON.stringify(value), 'EX', TTL_SECONDS)
          .sadd(indexKey, key)
          // Cada write refresca el TTL del índice: siempre sobrevive a sus miembros.
          .expire(indexKey, TTL_SECONDS)
          .exec(),
      );
    } catch (err) {
      this.logger.warn(`[EBF-CACHE] write ${key} failed: ${this.describe(err)}`);
    }
  }

  private buildKey(namespace: EbfListCacheNamespace, params: KeyParams): string {
    const qs = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]).trim())}`)
      .join('&');
    return `${KEY_ROOT}:${namespace}:${qs}`;
  }

  private currentGeneration(namespace: EbfListCacheNamespace): number {
    return this.generation.get(namespace) ?? 0;
  }

  /** Con Redis caído ioredis encola comandos (offline queue) — mejor ni intentarlo. */
  private isRedisReady(): boolean {
    return this.redis?.status === 'ready';
  }

  private withTimeout<T>(op: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`redis timeout ${REDIS_OP_TIMEOUT_MS}ms`)),
        REDIS_OP_TIMEOUT_MS,
      );
    });
    return Promise.race([op, timeout]).finally(() => clearTimeout(timer));
  }

  private describe(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
