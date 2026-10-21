import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';
import { config } from './config.js';

/**
 * Static GTFS loader.
 *
 * Downloads the STM GTFS archive once (then weekly), extracts only the files the
 * dashboard needs and keeps a compact in-memory index:
 *   routes, stops, trips and shapes.
 *
 * stop_times.txt is intentionally ignored: it is ~326 MB in the STM feed and the
 * live GTFS-Realtime trip updates already provide the upcoming schedule.
 */
const state = {
  ready: false,
  loading: false,
  error: null,
  updatedAt: null,
  feedVersion: null,
  routes: new Map(),
  routeList: [],
  stops: new Map(),
  stopList: [],
  trips: new Map(),
  shapes: new Map(),
  routeShapeIndex: new Map(),
};

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeColor(value) {
  const raw = String(value ?? '').trim().replace(/^#/, '');
  return /^[0-9a-f]{6}$/i.test(raw) ? `#${raw.toUpperCase()}` : null;
}

function readableTextColor(background) {
  const hex = background.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#08111A' : '#FFFFFF';
}

function routeMode(type) {
  if (type === 1) return 'metro';
  if (type === 3) return 'bus';
  if (type === 0) return 'tram';
  if (type === 2) return 'rail';
  return 'other';
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6_371_000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function readCsv(zip, name) {
  const entry = zip.getEntry(name);
  if (!entry) throw new Error(`GTFS archive is missing ${name}`);
  const text = entry.getData().toString('utf8');
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  });
}

async function downloadGtfs(target) {
  await fs.mkdir(config.cacheDir, { recursive: true });
  const tmp = `${target}.tmp`;

  console.log('[gtfs] downloading static feed from STM…');
  const startedAt = Date.now();
  const response = await fetch(config.gtfsUrl, { signal: AbortSignal.timeout(300_000) });
  if (!response.ok || !response.body) {
    throw new Error(`GTFS download failed (HTTP ${response.status})`);
  }

  const total = Number(response.headers.get('content-length') || 0);
  let received = 0;
  let lastLogged = 0;

  await new Promise((resolve, reject) => {
    const out = createWriteStream(tmp);
    out.on('error', reject);
    out.on('finish', resolve);
    (async () => {
      try {
        for await (const chunk of response.body) {
          out.write(chunk);
          received += chunk.length;
          if (received - lastLogged > 15_000_000) {
            lastLogged = received;
            const pct = total ? ` (${Math.round((received / total) * 100)}%)` : '';
            console.log(`[gtfs] ${(received / 1e6).toFixed(1)} MB downloaded${pct}`);
          }
        }
        out.end();
      } catch (error) {
        out.destroy();
        reject(error);
      }
    })();
  });

  await fs.rename(tmp, target);
  console.log(
    `[gtfs] downloaded ${(received / 1e6).toFixed(1)} MB in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
  );
}

async function ensureArchive() {
  const archive = path.join(config.cacheDir, 'gtfs_stm.zip');
  let stat = await fs.stat(archive).catch(() => null);
  const fresh = stat && Date.now() - stat.mtimeMs < config.gtfsMaxAgeMs;

  if (!fresh) {
    try {
      await downloadGtfs(archive);
      stat = await fs.stat(archive);
    } catch (error) {
      if (stat) {
        console.warn(`[gtfs] refresh failed, keeping cached archive: ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  if (!stat) throw new Error('GTFS archive is unavailable');
  return archive;
}

function loadArchive(archive) {
  const zip = new AdmZip(archive);

  const feedInfo = readCsv(zip, 'feed_info.txt')[0] || {};

  // Routes -----------------------------------------------------------------
  for (const row of readCsv(zip, 'routes.txt')) {
    const type = Number(row.route_type);
    const color =
      normalizeColor(row.route_color) || (type === 1 ? '#009B4E' : '#0E7CE0');
    const textColor = normalizeColor(row.route_text_color) || readableTextColor(color);

    const route = {
      id: row.route_id,
      shortName: (row.route_short_name || row.route_id || '').trim(),
      longName: (row.route_long_name || '').trim(),
      type,
      mode: routeMode(type),
      color,
      textColor,
      description: (row.route_desc || row.route_desc_detail || '').trim(),
      url: row.route_url || '',
    };
    state.routes.set(route.id, route);
  }
  state.routeList = [...state.routes.values()].sort((a, b) =>
    a.shortName.localeCompare(b.shortName, 'en', { numeric: true }),
  );

  // Trips ------------------------------------------------------------------
  for (const row of readCsv(zip, 'trips.txt')) {
    if (!row.trip_id) continue;
    const trip = {
      id: row.trip_id,
      routeId: row.route_id || null,
      serviceId: row.service_id || null,
      headsign: (row.trip_headsign || '').trim(),
      directionId: Number(row.direction_id) || 0,
      shapeId: row.shape_id || null,
      accessible: row.wheelchair_accessible === '1',
    };
    state.trips.set(trip.id, trip);

    if (trip.shapeId && trip.routeId) {
      const key = `${trip.routeId}:${trip.directionId}`;
      if (!state.routeShapeIndex.has(key)) state.routeShapeIndex.set(key, trip.shapeId);
    }
  }

  // Stops ------------------------------------------------------------------
  for (const row of readCsv(zip, 'stops.txt')) {
    if (!row.stop_id) continue;
    const stop = {
      id: row.stop_id,
      code: (row.stop_code || '').trim(),
      name: (row.stop_name || '').trim(),
      lat: Number(row.stop_lat),
      lon: Number(row.stop_lon),
      accessible: row.wheelchair_boarding === '1',
      isStation: row.location_type === '1',
      parent: row.parent_station || null,
    };
    if (!Number.isFinite(stop.lat) || !Number.isFinite(stop.lon)) continue;
    state.stops.set(stop.id, stop);
  }
  state.stopList = [...state.stops.values()].map((stop) => ({
    ...stop,
    search: normalizeText(`${stop.name} ${stop.code}`),
  }));

  // Shapes -----------------------------------------------------------------
  const grouped = new Map();
  for (const row of readCsv(zip, 'shapes.txt')) {
    const shapeId = row.shape_id;
    if (!shapeId) continue;
    let points = grouped.get(shapeId);
    if (!points) {
      points = [];
      grouped.set(shapeId, points);
    }
    const lat = Number(row.shape_pt_lat);
    const lon = Number(row.shape_pt_lon);
    const sequence = Number(row.shape_pt_sequence);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      points.push({ sequence: Number.isFinite(sequence) ? sequence : points.length, lat, lon });
    }
  }

  for (const [shapeId, points] of grouped) {
    points.sort((a, b) => a.sequence - b.sequence);
    // Round to ~1 m precision to keep the JSON payload small.
    state.shapes.set(
      shapeId,
      points.map((point) => [
        Math.round(point.lat * 100_000) / 100_000,
        Math.round(point.lon * 100_000) / 100_000,
      ]),
    );
  }

  state.feedVersion = feedInfo.feed_version || null;
  state.updatedAt = Date.now();

  console.log(
    `[gtfs] ready — ${state.routes.size} routes, ${state.stops.size} stops, ` +
      `${state.trips.size} trips, ${state.shapes.size} shapes (feed ${state.feedVersion || 'unknown'})`,
  );
}

export async function initGtfs() {
  if (state.loading) return;
  state.loading = true;
  state.error = null;

  try {
    const archive = await ensureArchive();
    loadArchive(archive);
    state.ready = true;
  } catch (error) {
    state.error = error.message;
    console.error(`[gtfs] failed to load static data: ${error.message}`);
  } finally {
    state.loading = false;
  }
}

export function getStatus() {
  return {
    ready: state.ready,
    loading: state.loading,
    error: state.error,
    updatedAt: state.updatedAt,
    feedVersion: state.feedVersion,
    counts: {
      routes: state.routes.size,
      stops: state.stops.size,
      trips: state.trips.size,
      shapes: state.shapes.size,
    },
  };
}

export const isReady = () => state.ready;

export function getRoutes() {
  return state.routeList;
}

export function getRoute(routeId) {
  return state.routes.get(routeId) || null;
}

export function getStop(stopId) {
  return state.stops.get(stopId) || null;
}

export function getTrip(tripId) {
  return state.trips.get(tripId) || null;
}

export function publicStop(stop) {
  if (!stop) return null;
  return {
    id: stop.id,
    code: stop.code,
    name: stop.name,
    lat: stop.lat,
    lon: stop.lon,
    accessible: stop.accessible,
    isStation: stop.isStation,
  };
}

export function searchStops(query, limit = 25) {
  const raw = String(query || '').trim();
  if (raw.length < 2) return [];
  const needle = normalizeText(raw);
  const exactCode = raw.toLowerCase();

  const matches = [];
  for (const stop of state.stopList) {
    const index = stop.search.indexOf(needle);
    if (index === -1) continue;

    let score = index;
    if (index === 0) score -= 100;
    if (stop.code && stop.code.toLowerCase() === exactCode) score -= 500;
    if (stop.isStation) score -= 10;
    matches.push({ score, stop });
  }

  matches.sort((a, b) => a.score - b.score || a.stop.name.localeCompare(b.stop.name));
  return matches.slice(0, limit).map((match) => publicStop(match.stop));
}

export function nearestStops(lat, lon, limit = 10, radiusMeters = 1200) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];

  const found = [];
  for (const stop of state.stopList) {
    const distance = haversineMeters(lat, lon, stop.lat, stop.lon);
    if (distance <= radiusMeters) found.push({ distance, stop });
  }

  found.sort((a, b) => a.distance - b.distance);
  return found.slice(0, limit).map((match) => ({
    ...publicStop(match.stop),
    distance: Math.round(match.distance),
  }));
}

export function getRouteShape(routeId, directionId = 0) {
  const shapeId =
    state.routeShapeIndex.get(`${routeId}:${directionId}`) ??
    state.routeShapeIndex.get(`${routeId}:0`) ??
    null;
  return shapeId ? state.shapes.get(shapeId) || null : null;
}

export function getTripShape(tripId) {
  const trip = state.trips.get(tripId);
  if (!trip?.shapeId) return null;
  return state.shapes.get(trip.shapeId) || null;
}
