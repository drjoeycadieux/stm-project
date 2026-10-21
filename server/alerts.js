import { config } from './config.js';

/**
 * STM service status ("i3") endpoint — JSON, unlike the GTFS-RT feeds.
 * Returns planned and active disruptions affecting routes and stops.
 */
const ENDPOINT = '/i3/v2/messages/etatservice';
const CACHE_TTL_MS = 60_000;
const MAX_ALERTS = 450;

let cache = null;
let expiresAt = 0;
let inflight = null;

function pickText(texts, language) {
  const entry = texts?.find((item) => item.language === language);
  const value = entry?.text?.trim();
  return value ? value : null;
}

function periodsOf(alert) {
  if (!alert.active_periods) return [];
  return Array.isArray(alert.active_periods) ? alert.active_periods : [alert.active_periods];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeAlert(alert, index) {
  const entities = alert.informed_entities ?? [];
  const routes = unique(entities.map((entity) => entity.route_short_name));
  const stops = unique(entities.map((entity) => entity.stop_code));
  const directions = unique(entities.map((entity) => entity.direction_id));

  const headerFr = pickText(alert.header_texts, 'fr');
  const headerEn = pickText(alert.header_texts, 'en');
  const descriptionFr = pickText(alert.description_texts, 'fr');
  const descriptionEn = pickText(alert.description_texts, 'en');

  if (!headerFr && !headerEn && !descriptionFr && !descriptionEn) return null;

  const periods = periodsOf(alert);
  const starts = periods.map((period) => Number(period.start)).filter(Number.isFinite);
  const ends = periods.map((period) => Number(period.end)).filter(Number.isFinite);

  return {
    id: `alert-${index}`,
    level: stops.length > 0 ? 'stop' : 'route',
    header: headerEn || headerFr || 'Service notice',
    headerFr: headerFr || headerEn || 'Avis de service',
    description: descriptionEn || descriptionFr || '',
    descriptionFr: descriptionFr || descriptionEn || '',
    routes,
    stops,
    directions,
    start: starts.length ? Math.min(...starts) : null,
    end: ends.length ? Math.max(...ends) : null,
  };
}

function dedupe(alerts) {
  const byKey = new Map();

  for (const alert of alerts) {
    const key = [
      alert.header,
      alert.description,
      [...alert.routes].sort().join(','),
      [...alert.stops].sort().join(','),
      [...alert.directions].sort().join(','),
    ].join('|');

    const existing = byKey.get(key);
    if (existing) {
      existing.start = existing.start ?? alert.start;
      existing.end = existing.end ?? alert.end;
      continue;
    }
    byKey.set(key, alert);
  }

  return [...byKey.values()];
}

async function loadAlerts() {
  const response = await fetch(`${config.apiBase}${ENDPOINT}`, {
    headers: {
      apikey: config.apiKey,
      origin: config.origin,
      accept: 'application/json',
    },
    signal: AbortSignal.timeout(config.requestTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`STM service status returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  const now = Math.floor(Date.now() / 1000);

  const alerts = dedupe(
    (payload.alerts ?? [])
      .map((alert, index) => normalizeAlert(alert, index))
      .filter(Boolean),
  )
    .filter((alert) => !alert.end || alert.end > now - 86_400)
    .sort((a, b) => {
      if (a.level !== b.level) return a.level === 'route' ? -1 : 1;
      return (b.start ?? 0) - (a.start ?? 0);
    })
    .slice(0, MAX_ALERTS);

  return {
    alerts,
    count: alerts.length,
    routeAlertCount: alerts.filter((alert) => alert.level === 'route').length,
    stopAlertCount: alerts.filter((alert) => alert.level === 'stop').length,
    updatedAt: Number(payload.header?.timestamp) || now,
    serverTime: now,
  };
}

export async function getAlerts() {
  if (cache && Date.now() < expiresAt) return cache;
  if (inflight) return inflight;

  inflight = loadAlerts()
    .then((fresh) => {
      cache = fresh;
      expiresAt = Date.now() + CACHE_TTL_MS;
      return fresh;
    })
    .catch((error) => {
      if (cache) {
        console.warn(`[alerts] serving cached alerts after error: ${error.message}`);
        return cache;
      }
      throw error;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
