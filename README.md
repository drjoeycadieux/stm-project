# STM Live Dashboard

Live STM (Montréal) bus and métro tracking: vehicle positions, stop arrivals, route
shapes and service alerts. React + Vite frontend, Express API, deployed as a static
site plus one Vercel Function.

## Architecture

```
src/            React app (Vite) — talks to /api/* on the same origin
server/
  app.js        Express app shared by local dev and Vercel
  index.js      Local dev entry point (app.listen)
  config.js     Environment configuration
  gtfsStatic.js Static GTFS index (routes, stops, trips, shapes)
  stmRealtime.js GTFS-Realtime client + in-memory caches
  alerts.js     STM service-status client
api/index.js    Vercel Function entry point (exports the Express app)
scripts/build-gtfs.mjs  Build-time GTFS preprocessor
gtfs-data/      Generated at build time (not committed)
```

The STM API key stays on the server. The browser only calls this app's `/api`
routes.

## Run locally

```bash
npm install
cp .env.example .env        # add STM_API_KEY
npm run dev                 # http://localhost:5173
```

The first run downloads the STM static GTFS archive (~67 MB) to `server/.cache/`
and indexes it in memory. That can take a minute; later runs reuse the cache.

To use the production data path locally, run `npm run build:gtfs` once. This writes
`gtfs-data/network.json` and `gtfs-data/shapes.json`, which the server prefers over
the zip download.

## Deploy to Vercel (production)

1. Push this repository to GitHub/GitLab/Bitbucket.
2. In Vercel, **Add New → Project** and import the repo. The repo root is the
   project root — no Root Directory override is needed. If you already created
   the project while the app lived in `stm-project/`, clear the Root Directory
   setting so it points at the repository root.
3. Add the environment variables in **Project → Settings → Environment Variables**:

   | Name | Required | Notes |
   | --- | --- | --- |
   | `STM_API_KEY` | yes | From https://developpeurs.stm.info |
   | `STM_CLIENT_SECRET` | no | Kept server-side only; currently unused |
   | `STM_ORIGIN` | recommended | `https://your-domain.com` — sent to the STM service-status API. Defaults to `https://$VERCEL_PROJECT_PRODUCTION_URL`. |
   | `STM_GTFS_URL` | no | Override the static GTFS archive URL |

4. Deploy. `vercel.json` sets:

   - build command `npm run build:vercel` — downloads and preprocesses GTFS, then
     builds the Vite app;
   - output directory `dist`;
   - one function at `api/index.js` with the generated `gtfs-data/` bundled via
     `includeFiles` (max duration 60 s);
   - a rewrite of `/api/*` to that function.

Vercel serves the built frontend from its CDN, so Express never handles static
files in production.

### Why GTFS is prebuilt

Vercel Functions have a read-only filesystem (except `/tmp`, per instance) and no
shared disk between instances. Downloading and unzipping 67 MB on every cold start
would be slow and unreliable. Instead, `scripts/build-gtfs.mjs` converts only the
needed tables into compact JSON (~13 MB total) during the build:

- `network.json` — routes, stops, trips (compact tuple format)
- `shapes.json` — route polylines, loaded lazily on the first shape request

`stop_times.txt` (~326 MB) is skipped intentionally; live trip updates from the
realtime feed provide upcoming arrivals.

Static data is refreshed each deployment. To pick up a new STM schedule, redeploy
(or trigger a redeploy from the Vercel dashboard).

### Runtime notes

- Realtime responses are cached in memory per function instance (`VEHICLE_TTL_MS`,
  `TRIP_TTL_MS`, `ALERTS_TTL_MS`). Several warm instances may each hold their own
  cache; this is expected.
- `/api/health` reports whether the key is configured and which GTFS source was
  loaded (`prebuilt` or `archive`).

## API

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | Liveness, key status, GTFS status |
| `GET /api/network` | Routes and GTFS metadata |
| `GET /api/vehicles?route=` | Live vehicle positions |
| `GET /api/alerts?route=&level=` | Service alerts |
| `GET /api/stops/search?q=` | Stop search |
| `GET /api/stops/nearby?lat=&lon=` | Nearby stops |
| `GET /api/stops/:id` | Stop + arrivals |
| `GET /api/stops/:id/arrivals` | Arrivals |
| `GET /api/trips/:id` | Trip schedule + shape |
| `GET /api/routes/:id` | Route + shapes |
| `GET /api/routes/:id/shape?direction=` | Route polyline |
| `GET /api/routes/:id/stops` | Stops served by a route |

## Scripts

```bash
npm run dev          # API + Vite dev server
npm run build        # Frontend production build
npm run build:gtfs   # Download/convert GTFS into ./gtfs-data
npm run build:vercel # build:gtfs + build (what Vercel runs)
npm run start        # Run the API + serve ./dist locally
npm run typecheck    # TypeScript
```

## Attribution

Transit data © Société de transport de Montréal (STM), licensed under CC BY 4.0.
