/**
 * Build-time GTFS preprocessor.
 *
 * Downloads the STM static GTFS archive and converts the parts the dashboard
 * needs into compact JSON files in ./gtfs-data. Those files are bundled with
 * the API function on Vercel (see the `includeFiles` entry in vercel.json) so
 * a cold start never has to download or unzip the ~67 MB archive.
 *
 * Usage: node scripts/build-gtfs.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = path.join(rootDir, 'server', '.cache');
const dataDir = path.join(rootDir, 'gtfs-data');
const archivePath = path.join(cacheDir, 'gtfs_stm.zip');

const gtfsUrl =
  process.env.STM_GTFS_URL || 'https://beta.stm.info/sites/default/files/gtfs/gtfs_stm.zip';
const maxAgeMs = Number(process.env.GTFS_MAX_AGE_HOURS || 168) * 3_600_000;

function normalizeText(value) {
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
  return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? '#08111A' : '#FFFFFF';
}

function routeMode(type) {
  if (type === 1) return 'metro';
  if (type === 3) return 'bus';
  if (type === 0) return 'tram';
  if (type === 2) return 'rail';
  return 'other';
}

function readCsv(zip, name) {
  const entry = zip.getEntry(name);
  if (!entry) throw new Error(`GTFS archive is missing ${name}`);
  return parse(entry.getData().toString('utf8'), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  });
}

async function ensureArchive() {
  await fs.mkdir(cacheDir, { recursive: true });
  const stat = await fs.stat(archivePath).catch(() => null);
  if (stat && Date.now() - stat.mtimeMs < maxAgeMs) {
    console.log('[build:gtfs] reusing cached archive');
    return;
  }

  console.log(`[build:gtfs] downloading ${gtfsUrl}`);
  const startedAt = Date.now();
  const response = await fetch(gtfsUrl, { signal: AbortSignal.timeout(300_000) });
  if (!response.ok || !response.body) {
    throw new Error(`GTFS download failed (HTTP ${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.subarray(0, 2).toString() !== 'PK') {
    throw new Error(
      `GTFS download did not return a zip (HTTP ${response.status}, ` +
        `content-type ${response.headers.get('content-type') || 'unknown'}). ` +
        'Set STM_GTFS_URL to the current feed URL.',
    );
  }
  const tmp = `${archivePath}.tmp`;
  await fs.writeFile(tmp, buffer);
  await fs.rename(tmp, archivePath);
  console.log(
    `[build:gtfs] downloaded ${(buffer.length / 1e6).toFixed(1)} MB in ` +
      `${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
  );
}

function buildNetwork(zip) {
  const feedInfo = readCsv(zip, 'feed_info.txt')[0] || {};

  const routes = readCsv(zip, 'routes.txt').map((row) => {
    const type = Number(row.route_type);
    const color = normalizeColor(row.route_color) || (type === 1 ? '#009B4E' : '#0E7CE0');
    return {
      id: row.route_id,
      shortName: (row.route_short_name || row.route_id || '').trim(),
      longName: (row.route_long_name || '').trim(),
      type,
      mode: routeMode(type),
      color,
      textColor: normalizeColor(row.route_text_color) || readableTextColor(color),
      description: (row.route_desc || row.route_desc_detail || '').trim(),
      url: row.route_url || '',
    };
  });
  routes.sort((a, b) => a.shortName.localeCompare(b.shortName, 'en', { numeric: true }));

  const stops = [];
  for (const row of readCsv(zip, 'stops.txt')) {
    if (!row.stop_id) continue;
    const lat = Number(row.stop_lat);
    const lon = Number(row.stop_lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    stops.push([
      row.stop_id,
      (row.stop_code || '').trim(),
      (row.stop_name || '').trim(),
      lat,
      lon,
      row.wheelchair_boarding === '1' ? 1 : 0,
      row.location_type === '1' ? 1 : 0,
      row.parent_station || null,
      normalizeText(`${row.stop_name || ''} ${row.stop_code || ''}`),
    ]);
  }

  const trips = [];
  for (const row of readCsv(zip, 'trips.txt')) {
    if (!row.trip_id) continue;
    trips.push([
      row.trip_id,
      row.route_id || null,
      (row.trip_headsign || '').trim(),
      Number(row.direction_id) || 0,
      row.shape_id || null,
    ]);
  }

  return {
    feedVersion: feedInfo.feed_version || null,
    generatedAt: Date.now(),
    routes,
    stops,
    trips,
  };
}

function buildShapes(zip) {
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

  const shapes = {};
  for (const [shapeId, points] of grouped) {
    points.sort((a, b) => a.sequence - b.sequence);
    const flat = [];
    for (const point of points) {
      // ~1 m precision keeps the payload small.
      flat.push(Math.round(point.lat * 100_000) / 100_000);
      flat.push(Math.round(point.lon * 100_000) / 100_000);
    }
    shapes[shapeId] = flat;
  }
  return shapes;
}

async function writeJson(name, value) {
  const file = path.join(dataDir, name);
  await fs.writeFile(file, JSON.stringify(value));
  const { size } = await fs.stat(file);
  console.log(`[build:gtfs] ${name} — ${(size / 1e6).toFixed(1)} MB`);
}

async function main() {
  await ensureArchive();
  const zip = new AdmZip(archivePath);

  const network = buildNetwork(zip);
  console.log(
    `[build:gtfs] parsed ${network.routes.length} routes, ${network.stops.length} stops, ` +
      `${network.trips.length} trips (feed ${network.feedVersion || 'unknown'})`,
  );

  const shapes = buildShapes(zip);
  console.log(`[build:gtfs] parsed ${Object.keys(shapes).length} shapes`);

  await fs.mkdir(dataDir, { recursive: true });
  await writeJson('network.json', network);
  await writeJson('shapes.json', shapes);
}

main().catch((error) => {
  console.error(`[build:gtfs] ${error.stack || error.message}`);
  process.exit(1);
});
