import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { config } from './config.js';
import * as gtfs from './gtfsStatic.js';
import * as realtime from './stmRealtime.js';
import { getAlerts } from './alerts.js';

const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

function requireApiKey(req, res, next) {
  if (!config.apiKey) {
    res.status(503).json({
      error: 'STM_API_KEY is not configured. Add it to .env and restart the server.',
    });
    return;
  }
  next();
}

function integer(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function queryString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// ---------------------------------------------------------------------------
// Health / metadata
// ---------------------------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    keyConfigured: Boolean(config.apiKey),
    now: Math.floor(Date.now() / 1000),
    uptimeSeconds: Math.round(process.uptime()),
    gtfs: gtfs.getStatus(),
  });
});

app.get('/api/network', (req, res) => {
  const status = gtfs.getStatus();
  res.json({
    ready: status.ready,
    loading: status.loading,
    error: status.error,
    updatedAt: status.updatedAt,
    feedVersion: status.feedVersion,
    counts: status.counts,
    routes: status.ready ? gtfs.getRoutes() : [],
  });
});

// ---------------------------------------------------------------------------
// Live feeds
// ---------------------------------------------------------------------------

app.get(
  '/api/vehicles',
  requireApiKey,
  asyncRoute(async (req, res) => {
    const snapshot = await realtime.getVehicles();
    const routeId = queryString(req.query.route);
    const vehicles = routeId
      ? snapshot.vehicles.filter((vehicle) => vehicle.routeId === routeId)
      : snapshot.vehicles;

    res.json({ ...snapshot, vehicles, count: vehicles.length });
  }),
);

app.get(
  '/api/alerts',
  requireApiKey,
  asyncRoute(async (req, res) => {
    const payload = await getAlerts();
    const routeId = queryString(req.query.route);
    const level = queryString(req.query.level);

    let alerts = payload.alerts;
    if (routeId) alerts = alerts.filter((alert) => alert.routes.includes(routeId));
    if (level === 'route' || level === 'stop') {
      alerts = alerts.filter((alert) => alert.level === level);
    }

    res.json({
      ...payload,
      alerts,
      count: alerts.length,
      routeAlertCount: alerts.filter((alert) => alert.level === 'route').length,
      stopAlertCount: alerts.filter((alert) => alert.level === 'stop').length,
    });
  }),
);

// ---------------------------------------------------------------------------
// Stops
// ---------------------------------------------------------------------------

app.get('/api/stops/search', (req, res) => {
  if (!gtfs.isReady()) {
    res.status(503).json({ error: 'Static GTFS data is still loading.', loading: true });
    return;
  }
  const query = queryString(req.query.q) ?? '';
  const limit = integer(req.query.limit, 25, 1, 100);
  res.json({ stops: gtfs.searchStops(query, limit) });
});

app.get('/api/stops/nearby', (req, res) => {
  if (!gtfs.isReady()) {
    res.status(503).json({ error: 'Static GTFS data is still loading.', loading: true });
    return;
  }
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    res.status(400).json({ error: 'lat and lon query parameters are required.' });
    return;
  }
  const limit = integer(req.query.limit, 10, 1, 50);
  const radius = integer(req.query.radius, 1200, 100, 10_000);
  res.json({ stops: gtfs.nearestStops(lat, lon, limit, radius) });
});

app.get(
  '/api/stops/:stopId/arrivals',
  requireApiKey,
  asyncRoute(async (req, res) => {
    const limit = integer(req.query.limit, 30, 1, 100);
    const routeId = queryString(req.query.route);
    const arrivals = await realtime.getArrivals(req.params.stopId, { limit, routeId });
    res.json({ stopId: req.params.stopId, arrivals, serverTime: Math.floor(Date.now() / 1000) });
  }),
);

app.get(
  '/api/stops/:stopId',
  requireApiKey,
  asyncRoute(async (req, res) => {
    const stop = gtfs.getStop(req.params.stopId);
    const arrivals = await realtime.getArrivals(req.params.stopId, { limit: 40 });
    res.json({
      stop: gtfs.publicStop(stop),
      arrivals,
      serverTime: Math.floor(Date.now() / 1000),
    });
  }),
);

// ---------------------------------------------------------------------------
// Trips & routes
// ---------------------------------------------------------------------------

app.get(
  '/api/trips/:tripId',
  requireApiKey,
  asyncRoute(async (req, res) => {
    const trip = await realtime.getTripDetail(req.params.tripId);
    if (!trip) {
      res.status(404).json({
        error: 'This trip is no longer broadcasting in the realtime feed.',
      });
      return;
    }
    res.json(trip);
  }),
);

app.get(
  '/api/routes/:routeId/stops',
  requireApiKey,
  asyncRoute(async (req, res) => {
    const stops = await realtime.getRouteStops(req.params.routeId);
    res.json({ routeId: req.params.routeId, stops });
  }),
);

app.get('/api/routes/:routeId/shape', (req, res) => {
  if (!gtfs.isReady()) {
    res.status(503).json({ error: 'Static GTFS data is still loading.', loading: true });
    return;
  }
  const direction = integer(req.query.direction, 0, 0, 1);
  const points = gtfs.getRouteShape(req.params.routeId, direction);
  if (!points) {
    res.status(404).json({ error: 'No shape found for this route.' });
    return;
  }
  res.json({ routeId: req.params.routeId, direction, points });
});

app.get('/api/routes/:routeId', (req, res) => {
  const route = gtfs.getRoute(req.params.routeId);
  if (!route) {
    res.status(404).json({ error: 'Unknown route.' });
    return;
  }
  res.json({
    route,
    shape: gtfs.getRouteShape(req.params.routeId, 0),
    shapeDirection1: gtfs.getRouteShape(req.params.routeId, 1),
  });
});

// ---------------------------------------------------------------------------
// Production build (npm run build) + API fallbacks
// ---------------------------------------------------------------------------

const distDir = path.join(config.rootDir, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Unknown API endpoint.' });
});

app.use((error, req, res, next) => {
  console.error(`[api] ${req.method} ${req.originalUrl} — ${error.message}`);
  if (res.headersSent) {
    next(error);
    return;
  }
  res.status(error.status || 502).json({
    error: error.message || 'Unexpected upstream error.',
  });
});

const server = app.listen(config.port, () => {
  console.log(`[server] STM Live API listening on http://localhost:${config.port}`);
  console.log(
    `[server] STM API key ${config.apiKey ? 'loaded' : 'MISSING — add STM_API_KEY to .env'}`,
  );

  gtfs.initGtfs();
});

// Keep the static feed reasonably fresh in long-running deployments.
setInterval(() => {
  gtfs.initGtfs();
}, 6 * 3_600_000).unref();

function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
