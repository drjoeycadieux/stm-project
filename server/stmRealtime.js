import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { config } from './config.js';
import * as gtfs from './gtfsStatic.js';

const { transit_realtime } = GtfsRealtimeBindings;

/**
 * GTFS-Realtime client.
 *
 * STM serves protobuf feeds at /gtfs-rt/ic/v2/{vehiclePositions,tripUpdates}.
 * We decode them on the server so the API key never reaches the browser, and
 * cache the result for a few seconds so many dashboard tabs share one upstream
 * request.
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// protobufjs exposes GTFS-Realtime enums as numbers unless decoded to JSON.
const VEHICLE_STATUS = ['INCOMING_AT', 'STOPPED_AT', 'IN_TRANSIT_TO'];
const OCCUPANCY = [
  'EMPTY',
  'MANY_SEATS_AVAILABLE',
  'FEW_SEATS_AVAILABLE',
  'STANDING_ROOM_ONLY',
  'CRUSHED_STANDING_ROOM_ONLY',
  'FULL',
  'NOT_ACCEPTING_PASSENGERS',
  'NO_DATA_AVAILABLE',
  'NOT_BOARDABLE',
];
const WHEELCHAIR = [
  'NO_VALUE',
  'UNKNOWN',
  'WHEELCHAIR_ACCESSIBLE',
  'WHEELCHAIR_INACCESSIBLE',
];
const STOP_RELATIONSHIP = ['SCHEDULED', 'SKIPPED', 'NO_DATA', 'UNSCHEDULED'];

function enumName(values, value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return values[value] ?? null;
  return null;
}


function toNumber(value) {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value.toNumber === 'function') {
    const parsed = value.toNumber();
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchFeed(kind) {
  let lastError = null;

  for (let attempt = 0; attempt <= config.retries; attempt += 1) {
    try {
      const response = await fetch(`${config.apiBase}/gtfs-rt/ic/v2/${kind}`, {
        headers: {
          apikey: config.apiKey,
          accept: 'application/x-protobuf',
        },
        signal: AbortSignal.timeout(config.requestTimeoutMs),
      });

      if (!response.ok) {
        throw new Error(`STM ${kind} feed returned HTTP ${response.status}`);
      }

      const buffer = new Uint8Array(await response.arrayBuffer());
      const message = transit_realtime.FeedMessage.decode(buffer);
      return { message, fetchedAt: Date.now() };
    } catch (error) {
      lastError = error;
      if (attempt < config.retries) await sleep(400 * (attempt + 1));
    }
  }

  throw lastError ?? new Error(`Unable to fetch STM ${kind} feed`);
}

function makeCache(ttlMs, loader) {
  let value = null;
  let expiresAt = 0;
  let inflight = null;

  return async function get() {
    if (value && Date.now() < expiresAt) return value;
    if (inflight) return inflight;

    inflight = loader()
      .then((fresh) => {
        value = fresh;
        expiresAt = Date.now() + ttlMs;
        return fresh;
      })
      .catch((error) => {
        if (value) {
          console.warn(`[stm] serving cached data after error: ${error.message}`);
          return value;
        }
        throw error;
      })
      .finally(() => {
        inflight = null;
      });

    return inflight;
  };
}

function routeFor(routeId) {
  return routeId ? gtfs.getRoute(routeId) : null;
}

function tripFor(tripId) {
  return tripId ? gtfs.getTrip(tripId) : null;
}

function stopFor(stopId) {
  return stopId ? gtfs.getStop(stopId) : null;
}

const loadVehicles = async () => {
  const { message, fetchedAt } = await fetchFeed('vehiclePositions');
  const serverTime = Math.floor(Date.now() / 1000);
  const seen = new Set();
  const vehicles = [];

  for (const entity of message.entity ?? []) {
    const vehicle = entity.vehicle;
    if (!vehicle?.position) continue;

    const id = vehicle.vehicle?.id || entity.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const trip = vehicle.trip ?? {};
    const route = routeFor(trip.routeId);
    const staticTrip = tripFor(trip.tripId);
    const stop = stopFor(vehicle.stopId);
    const timestamp = toNumber(vehicle.timestamp) ?? serverTime;
    const speed = toNumber(vehicle.position.speed);

    vehicles.push({
      id,
      label: vehicle.vehicle?.label || null,
      tripId: trip.tripId || null,
      routeId: trip.routeId || null,
      routeShortName: route?.shortName || trip.routeId || '?',
      routeLongName: route?.longName || '',
      routeColor: route?.color || '#2DD4BF',
      routeTextColor: route?.textColor || '#04121A',
      routeMode: route?.mode || 'bus',
      headsign: staticTrip?.headsign || '',
      directionId: trip.directionId ?? staticTrip?.directionId ?? null,
      lat: vehicle.position.latitude,
      lon: vehicle.position.longitude,
      bearing: toNumber(vehicle.position.bearing),
      speedKmh: speed == null ? null : Math.round(speed * 3.6),
      stopId: vehicle.stopId || null,
      stopName: stop?.name || null,
      currentStopSequence: toNumber(vehicle.currentStopSequence),
      currentStatus: enumName(VEHICLE_STATUS, vehicle.currentStatus) ?? 'IN_TRANSIT_TO',
      occupancy: enumName(OCCUPANCY, vehicle.occupancyStatus),
      wheelchair: enumName(WHEELCHAIR, vehicle.vehicle?.wheelchairAccessible),
      timestamp,
      ageSeconds: Math.max(0, serverTime - timestamp),
    });
  }

  vehicles.sort(
    (a, b) =>
      a.routeShortName.localeCompare(b.routeShortName, 'en', { numeric: true }) ||
      a.id.localeCompare(b.id, 'en', { numeric: true }),
  );

  return {
    vehicles,
    count: vehicles.length,
    updatedAt: toNumber(message.header?.timestamp) ?? serverTime,
    serverTime,
    fetchedAt,
  };
};

const loadTripUpdates = async () => {
  const { message, fetchedAt } = await fetchFeed('tripUpdates');
  const serverTime = Math.floor(Date.now() / 1000);

  const byTrip = new Map();
  const byStop = new Map();
  const byRouteStops = new Map();

  for (const entity of message.entity ?? []) {
    const update = entity.tripUpdate;
    if (!update?.trip?.tripId) continue;

    const tripId = update.trip.tripId;
    const routeId = update.trip.routeId || null;
    const route = routeFor(routeId);
    const staticTrip = tripFor(tripId);

    const stops = [];
    for (const stopTime of update.stopTimeUpdate ?? []) {
      const stop = stopFor(stopTime.stopId);
      const arrival = toNumber(stopTime.arrival?.time);
      const departure = toNumber(stopTime.departure?.time);
      const time = arrival ?? departure;
      const delay = toNumber(stopTime.arrival?.delay) ?? toNumber(stopTime.departure?.delay);
      const relationship =
        enumName(STOP_RELATIONSHIP, stopTime.scheduleRelationship) ?? 'SCHEDULED';

      if (time == null && !stopTime.stopId) continue;

      stops.push({
        stopId: stopTime.stopId || null,
        stopName: stop?.name || null,
        lat: stop?.lat ?? null,
        lon: stop?.lon ?? null,
        sequence: toNumber(stopTime.stopSequence),
        arrival,
        departure,
        time,
        delay,
        skipped: relationship === 'SKIPPED',
        relationship,
      });
    }

    stops.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

    const tripUpdate = {
      tripId,
      routeId,
      routeShortName: route?.shortName || routeId || '?',
      routeColor: route?.color || '#2DD4BF',
      routeTextColor: route?.textColor || '#04121A',
      headsign: staticTrip?.headsign || '',
      directionId: update.trip.directionId ?? staticTrip?.directionId ?? null,
      startDate: update.trip.startDate || null,
      vehicleId: update.vehicle?.id || null,
      updatedAt: toNumber(update.timestamp) ?? null,
      stops,
    };

    byTrip.set(tripId, tripUpdate);

    for (const stop of stops) {
      if (!stop.stopId) continue;

      let departures = byStop.get(stop.stopId);
      if (!departures) {
        departures = [];
        byStop.set(stop.stopId, departures);
      }

      departures.push({
        tripId,
        routeId,
        routeShortName: tripUpdate.routeShortName,
        routeColor: tripUpdate.routeColor,
        routeTextColor: tripUpdate.routeTextColor,
        headsign: tripUpdate.headsign,
        directionId: tripUpdate.directionId,
        stopId: stop.stopId,
        stopName: stop.stopName,
        sequence: stop.sequence,
        arrival: stop.arrival,
        departure: stop.departure,
        time: stop.time,
        delay: stop.delay,
        skipped: stop.skipped,
        vehicleId: tripUpdate.vehicleId,
      });
    }

    if (routeId) {
      let stopsForRoute = byRouteStops.get(routeId);
      if (!stopsForRoute) {
        stopsForRoute = new Map();
        byRouteStops.set(routeId, stopsForRoute);
      }
      for (const stop of stops) {
        if (stop.stopId && stop.lat != null && stop.lon != null) {
          stopsForRoute.set(stop.stopId, {
            id: stop.stopId,
            name: stop.stopName || stop.stopId,
            lat: stop.lat,
            lon: stop.lon,
            code: stopFor(stop.stopId)?.code || '',
            accessible: stopFor(stop.stopId)?.accessible || false,
            isStation: stopFor(stop.stopId)?.isStation || false,
          });
        }
      }
    }
  }

  for (const departures of byStop.values()) {
    departures.sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
  }

  return {
    byTrip,
    byStop,
    byRouteStops,
    updatedAt: toNumber(message.header?.timestamp) ?? serverTime,
    serverTime,
    fetchedAt,
  };
};

export const getVehicles = makeCache(config.vehicleTtlMs, loadVehicles);
export const getTripUpdates = makeCache(config.tripTtlMs, loadTripUpdates);

export async function getArrivals(stopId, { limit = 30, routeId = null } = {}) {
  const snapshot = await getTripUpdates();
  const departures = snapshot.byStop.get(stopId);
  if (!departures) return [];

  const now = Math.floor(Date.now() / 1000);
  const seen = new Set();
  const arrivals = [];

  for (const departure of departures) {
    if (routeId && departure.routeId !== routeId) continue;
    if (departure.skipped) continue;
    if (!departure.time || departure.time < now - 90) continue;
    if (seen.has(departure.tripId)) continue;

    seen.add(departure.tripId);
    arrivals.push({
      ...departure,
      minutes: Math.max(0, Math.round((departure.time - now) / 60)),
    });

    if (arrivals.length >= limit) break;
  }

  return arrivals;
}

export async function getTripDetail(tripId) {
  const snapshot = await getTripUpdates();
  const trip = snapshot.byTrip.get(tripId);
  if (!trip) return null;

  let vehicle = null;
  try {
    const vehicles = await getVehicles();
    vehicle = vehicles.vehicles.find((item) => item.tripId === tripId) || null;
  } catch {
    // The trip schedule is still useful even when the vehicle feed hiccups.
  }
  const now = Math.floor(Date.now() / 1000);

  return {
    ...trip,
    shape: gtfs.getTripShape(tripId),
    vehicle,
    updatedAt: snapshot.updatedAt,
    serverTime: snapshot.serverTime,
    stops: trip.stops.map((stop) => ({
      ...stop,
      passed: stop.time != null && stop.time < now - 45,
    })),
  };
}

export async function getRouteStops(routeId) {
  const snapshot = await getTripUpdates();
  const stops = snapshot.byRouteStops.get(routeId);
  if (!stops) return [];
  return [...stops.values()].sort((a, b) =>
    String(a.name).localeCompare(String(b.name), 'en', { numeric: true }),
  );
}
