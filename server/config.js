import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

dotenv.config({ path: path.join(rootDir, '.env'), quiet: true });

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

export const config = {
  rootDir,
  port: positiveInt(process.env.PORT, 8787),

  // STM developer portal credentials. These never leave the server.
  apiKey: (process.env.STM_API_KEY || '').trim(),
  clientSecret: (process.env.STM_CLIENT_SECRET || '').trim(),
  apiBase: (process.env.STM_API_BASE || 'https://api.stm.info/pub/od').replace(/\/+$/, ''),
  origin: (process.env.STM_ORIGIN || 'http://localhost:5173').trim(),
  gtfsUrl:
    process.env.STM_GTFS_URL ||
    'https://www.stm.info/sites/default/files/gtfs/gtfs_stm.zip',

  cacheDir: path.join(rootDir, 'server', '.cache'),

  // How long decoded feeds are reused between browser polls.
  vehicleTtlMs: positiveInt(process.env.VEHICLE_TTL_MS, 8_000),
  tripTtlMs: positiveInt(process.env.TRIP_TTL_MS, 10_000),
  alertsTtlMs: positiveInt(process.env.ALERTS_TTL_MS, 60_000),
  gtfsMaxAgeMs: positiveInt(process.env.GTFS_MAX_AGE_HOURS, 168) * 3_600_000,

  requestTimeoutMs: positiveInt(process.env.STM_TIMEOUT_MS, 15_000),
  retries: 2,
};
