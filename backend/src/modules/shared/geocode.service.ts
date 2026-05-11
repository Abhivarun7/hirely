import { Client as GoogleMapsClient } from '@googlemaps/google-maps-services-js';
import pino from 'pino';
import { redis } from '../../config/redis.js';
import config from '../../config/env.js';

const logger = pino({ name: 'geocode' });

export interface Coords {
  latitude: number;
  longitude: number;
}

const CACHE_PREFIX = 'geocode:city:';
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

let client: GoogleMapsClient | null = null;
function getClient(): GoogleMapsClient {
  if (!client) client = new GoogleMapsClient({});
  return client;
}

function normalizeCityKey(parts: { city?: string; state?: string; country?: string }): string {
  return [parts.city, parts.state, parts.country]
    .filter((p) => typeof p === 'string' && p.trim().length > 0)
    .map((p) => (p as string).trim().toLowerCase())
    .join('|');
}

export const geocodeService = {
  /**
   * Geocode a free-text city/state/country into coordinates. Cached in Redis
   * for 30 days keyed by the normalized triple, so even with thousands of
   * seekers the Maps API sees one call per unique city.
   *
   * Returns null if the API key is missing, the lookup fails, or no key parts
   * were provided. Callers must tolerate null.
   */
  async geocodeCity(parts: { city?: string; state?: string; country?: string }): Promise<Coords | null> {
    const key = normalizeCityKey(parts);
    if (!key) return null;

    const cacheKey = CACHE_PREFIX + key;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        if (cached === 'NULL') return null;
        const parsed = JSON.parse(cached);
        if (typeof parsed?.latitude === 'number' && typeof parsed?.longitude === 'number') {
          return parsed;
        }
      }
    } catch (err) {
      logger.warn({ err }, 'geocode cache read failed');
    }

    const apiKey = config.GOOGLE_MAPS_SERVER_KEY ?? config.GOOGLE_API_KEY;
    if (!apiKey) {
      // No key configured — cache the miss for 1h to avoid repeated lookups
      try {
        await redis.set(cacheKey, 'NULL', 'EX', 60 * 60);
      } catch {}
      return null;
    }

    try {
      const address = [parts.city, parts.state, parts.country].filter(Boolean).join(', ');
      const res = await getClient().geocode({
        params: { address, key: apiKey },
        timeout: 5000,
      });
      const first = res.data.results[0];
      if (!first) {
        await redis.set(cacheKey, 'NULL', 'EX', 60 * 60 * 24); // 1d negative
        return null;
      }
      const coords: Coords = {
        latitude: first.geometry.location.lat,
        longitude: first.geometry.location.lng,
      };
      await redis.set(cacheKey, JSON.stringify(coords), 'EX', CACHE_TTL_SECONDS);
      return coords;
    } catch (err) {
      logger.warn({ err, key }, 'geocode lookup failed');
      return null;
    }
  },
};

export default geocodeService;
