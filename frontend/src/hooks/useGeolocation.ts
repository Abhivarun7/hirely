import { useEffect, useState } from 'react';

export interface GeoCoords {
  latitude: number;
  longitude: number;
}

type GeoStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable';

const STORAGE_KEY = 'hirely.lastGeo';

interface StoredGeo {
  latitude: number;
  longitude: number;
  ts: number;
}

const FRESH_MS = 1000 * 60 * 60 * 24; // 24 hours

function readCached(): StoredGeo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredGeo;
    if (typeof parsed?.latitude !== 'number' || typeof parsed?.longitude !== 'number') return null;
    if (Date.now() - parsed.ts > FRESH_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCached(c: GeoCoords) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...c, ts: Date.now() } satisfies StoredGeo));
  } catch {}
}

/**
 * Best-effort browser geolocation. Returns cached coords immediately if a
 * recent grant is in localStorage, then upgrades silently from the live API.
 * Never blocks rendering — the home feed should work without coords too.
 */
export function useGeolocation(options: { autoRequest?: boolean } = {}): {
  coords: GeoCoords | null;
  status: GeoStatus;
  request: () => void;
} {
  const cached = readCached();
  const [coords, setCoords] = useState<GeoCoords | null>(cached);
  const [status, setStatus] = useState<GeoStatus>(cached ? 'granted' : 'idle');

  function request() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: GeoCoords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setCoords(c);
        setStatus('granted');
        writeCached(c);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setStatus('denied');
        else setStatus('unavailable');
      },
      { enableHighAccuracy: false, maximumAge: FRESH_MS, timeout: 8000 }
    );
  }

  useEffect(() => {
    if (!options.autoRequest) return;
    if (cached) return;
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((result) => {
        if (result.state === 'granted') request();
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { coords, status, request };
}

export default useGeolocation;
