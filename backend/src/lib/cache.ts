import crypto from 'crypto';
import { redis } from '../config/redis.js';

/**
 * Tiny JSON cache helpers built on top of the shared Redis connection.
 *
 * All operations are best-effort: a cache miss, a Redis outage, or a
 * deserialization error will silently degrade to "no cache" rather than
 * surface as a 500. Callers should never block correctness on cache hits.
 */

/**
 * Stable hash for any JSON-serializable input. Used to compose cache keys
 * from method inputs without worrying about key length or encoding.
 */
export function hashKey(input: unknown): string {
  return crypto.createHash('sha1').update(stableStringify(input)).digest('hex');
}

/**
 * JSON.stringify with sorted object keys so {a:1,b:2} and {b:2,a:1} hash to
 * the same value. Critical for caches keyed off query objects where the
 * caller might pass keys in arbitrary order.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn('[cache] get failed for', key, err);
    return null;
  }
}

export async function setCached<T>(key: string, value: T, ttlSec: number): Promise<void> {
  try {
    await redis.setex(key, ttlSec, JSON.stringify(value));
  } catch (err) {
    console.warn('[cache] set failed for', key, err);
  }
}

/**
 * Wrap an async producer with a Redis-backed cache. Returns the cached value
 * if present, otherwise runs the producer, persists the result, and returns
 * it. The producer is awaited inline — there is no stale-while-revalidate.
 */
export async function withCache<T>(
  key: string,
  ttlSec: number,
  produce: () => Promise<T>
): Promise<T> {
  const hit = await getCached<T>(key);
  if (hit !== null) return hit;
  const value = await produce();
  await setCached(key, value, ttlSec);
  return value;
}

export async function bustCache(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    console.warn('[cache] del failed', err);
  }
}

/**
 * Bust every key matching a glob (e.g. "company:insights:*:companyA"). Uses
 * SCAN so it's safe on large keyspaces. Best-effort; tolerates Redis errors.
 */
export async function bustCachePattern(pattern: string): Promise<void> {
  try {
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = next;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.warn('[cache] bustCachePattern failed for', pattern, err);
  }
}
