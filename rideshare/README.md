# RideShare LLC

A bilingual (English/French) ride-sharing web app for Montreal, Quebec, built with Next.js 16 (App Router), Tailwind CSS 4, Prisma, and SQLite.

## What's inside

**Riders**
- Browse Montreal landmarks, metro stations, and districts as pickup/drop-off points
- Upfront fare estimates in CAD (distance + time + Quebec taxes: TPS 5% + TVQ 9.975%)
- Three ride classes: RideShare (economy), Comfort (premium), and XL
- Book a ride, watch a live trip map, track the driver, cancel, and rate the trip
- Trip history with receipts

**Drivers**
- Apply with a car and licence plate (instant approval in the demo)
- Go online/offline, see nearby ride requests, and accept them
- Start and complete trips; earnings are tracked daily and weekly
- Keep 78% of every fare (shown in the dashboard)

**The dispatch simulation**
When a ride is requested, the closest available online driver is matched automatically. Timestamps drive the lifecycle (`requested → matched → in_progress → completed`), so trips progress in real time as the rider and driver pages poll. Seeded demo drivers are online around the island, so booking works immediately.

## Getting started

```bash
npm install          # also runs `prisma generate`
npm run db:push      # create the SQLite database
npm run db:seed      # demo accounts + trip history
npm run dev
```

Open http://localhost:3000 — the locale proxy redirects to `/en` or `/fr` based on your browser language (toggle with the EN/FR switch in the header).

### Demo accounts

| Role   | Email              | Password    |
| ------ | ------------------ | ----------- |
| Rider  | emma@rideshare.ca  | montreal1   |
| Driver | marc@rideshare.ca  | montreal1   |

Other seeded drivers (also online): sophie@rideshare.ca, jean@rideshare.ca, olivia@rideshare.ca — same password.

To reset everything: `npm run db:reset`

## Scripts

| Command            | Description                                  |
| ------------------ | -------------------------------------------- |
| `npm run dev`      | Start the dev server (Turbopack)             |
| `npm run build`    | Production build                             |
| `npm run start`    | Serve the production build                   |
| `npm run lint`     | ESLint                                       |
| `npm run db:push`  | Sync the Prisma schema to SQLite             |
| `npm run db:seed`  | Seed demo users, drivers, and trips          |
| `npm run db:reset` | Force-reset and reseed the database          |
| `npm run db:studio`| Browse the database with Prisma Studio       |

## Project structure

```
prisma/            schema + seed script (SQLite: dev.db)
src/
  proxy.ts         locale negotiation (/ride -> /en/ride or /fr/ride)
  messages/        en.json + fr.json dictionaries
  lib/
    auth.ts        scrypt password hashing + HMAC session cookies
    rides.ts       dispatch/matching + trip lifecycle simulation
    pricing.ts     fare engine (haversine distance, rush hour, taxes)
    places.ts      Montreal landmarks with coordinates
  app/
    [locale]/      all pages: landing, ride, trips, driver, pricing...
    api/           auth, rides, driver endpoints
  components/      UI: booking, tracker, dashboard, map...
```

## Configuration

Copy `.env.example` to `.env`:

- `DATABASE_URL` — SQLite file location (defaults to `prisma/dev.db`)
- `SESSION_SECRET` — secret used to sign session cookies; set a long random string in production

## Notes

- The Montreal map is a decorative SVG projection, not a navigational map.
- Fares use great-circle distance × 1.35 (street-network factor) at 24 km/h average city speed.
- The app is fully bilingual: every string lives in `src/messages/{en,fr}.json`.
