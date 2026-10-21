import app from '../server/app.js';
import * as gtfs from '../server/gtfsStatic.js';

/**
 * Vercel Function entry point.
 *
 * All /api/* requests are rewritten here (see vercel.json) so a single warm
 * instance shares the GTFS index and the realtime feed caches.
 */

function restorePath(req) {
  const url = new URL(req.url, 'http://internal');
  const rewritten = url.searchParams.get('__path');

  // The rewrite appends ?__path=<original path>. If Vercel kept the original
  // pathname too, only drop the marker; otherwise rebuild it.
  if (rewritten != null) {
    url.searchParams.delete('__path');
    if (url.pathname === '/api' || url.pathname === '/api/index' || url.pathname === '/api/index.js') {
      url.pathname = `/api/${rewritten.replace(/^\/+/, '')}`;
    }
    req.url = `${url.pathname}${url.search}`;
  }
}

let readyPromise = null;

function ensureGtfs() {
  if (gtfs.isReady()) return Promise.resolve();
  readyPromise ??= Promise.race([
    gtfs.initGtfs(),
    new Promise((resolve) => setTimeout(resolve, 45_000)),
  ]);
  return readyPromise;
}

export default async function handler(req, res) {
  await ensureGtfs();
  restorePath(req);
  app(req, res);
}
