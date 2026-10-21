import app from './app.js';
import { config } from './config.js';
import * as gtfs from './gtfsStatic.js';

/**
 * Local development / self-hosted entry point.
 * On Vercel the Express app is exported from api/index.js instead.
 */
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
