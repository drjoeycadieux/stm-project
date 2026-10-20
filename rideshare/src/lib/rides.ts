import type { Prisma, Ride } from "@prisma/client";
import { prisma } from "./db";
import { getPlace } from "./places";
import { estimateTrip, haversineKm, type RideTier } from "./pricing";
import type { Locale } from "./i18n-config";
import type { RideStatus, RideView } from "./types";

export type { RideStatus, RideView };

export const ACTIVE_STATUSES: RideStatus[] = ["requested", "matched", "in_progress"];

/**
 * RideShare's dispatch simulation: once a driver is matched, the rider is
 * "picked up" after this many seconds, and the trip itself takes TRIP_MS.
 * Timings are derived from timestamps so every read of the ride advances it.
 */
const PICKUP_MS = 12_000;
const TRIP_MS = 45_000;

export class RideError extends Error {
  constructor(
    public code:
      | "invalid_place"
      | "same_place"
      | "active_ride"
      | "not_found"
      | "forbidden"
      | "bad_status"
      | "no_driver_profile"
      | "offline"
      | "invalid_rating",
    message: string,
  ) {
    super(message);
  }
}

export type RideWithDriver = Prisma.RideGetPayload<{
  include: { driver: { include: { user: true } } };
}>;

/** Advance a ride through the simulated lifecycle based on elapsed time. */
export async function advanceRide(ride: Ride): Promise<Ride> {
  let updated = ride;
  const now = Date.now();

  if (
    updated.status === "matched" &&
    updated.matchedAt &&
    now - updated.matchedAt.getTime() >= PICKUP_MS
  ) {
    updated = await prisma.ride.update({
      where: { id: updated.id },
      data: { status: "in_progress", startedAt: new Date() },
    });
  }

  if (
    updated.status === "in_progress" &&
    updated.startedAt &&
    now - updated.startedAt.getTime() >= TRIP_MS
  ) {
    updated = await prisma.ride.update({
      where: { id: updated.id },
      data: { status: "completed", completedAt: new Date() },
    });
    if (updated.driverId) {
      await prisma.driver.update({
        where: { id: updated.driverId },
        data: { lat: updated.dropoffLat, lng: updated.dropoffLng },
      });
    }
  }

  return updated;
}

export async function getRideById(id: string): Promise<RideWithDriver | null> {
  const ride = await prisma.ride.findUnique({
    where: { id },
    include: { driver: { include: { user: true } } },
  });
  if (!ride) return null;
  const advanced = await advanceRide(ride);
  if (advanced.status === ride.status) return ride;
  return prisma.ride.findUnique({
    where: { id },
    include: { driver: { include: { user: true } } },
  });
}

export async function listRiderRides(riderId: string): Promise<RideWithDriver[]> {
  const rides = await prisma.ride.findMany({
    where: { riderId },
    include: { driver: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
  for (const ride of rides.filter((r) => ACTIVE_STATUSES.includes(r.status as RideStatus))) {
    await advanceRide(ride);
  }
  return prisma.ride.findMany({
    where: { riderId },
    include: { driver: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listDriverRides(driverId: string): Promise<RideWithDriver[]> {
  const rides = await prisma.ride.findMany({
    where: { driverId },
    include: { driver: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
  for (const ride of rides.filter((r) => ACTIVE_STATUSES.includes(r.status as RideStatus))) {
    await advanceRide(ride);
  }
  return prisma.ride.findMany({
    where: { driverId },
    include: { driver: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Open requests any online driver can claim. */
export async function listOpenRequests(): Promise<RideWithDriver[]> {
  const rides = await prisma.ride.findMany({
    where: { status: "requested", driverId: null },
    include: { driver: { include: { user: true } } },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  return rides;
}

export async function requestRide(input: {
  riderId: string;
  pickupId: string;
  dropoffId: string;
  tier: RideTier;
}): Promise<RideWithDriver> {
  const pickup = getPlace(input.pickupId);
  const dropoff = getPlace(input.dropoffId);
  if (!pickup || !dropoff) throw new RideError("invalid_place", "Unknown pickup or drop-off.");
  if (pickup.id === dropoff.id) {
    throw new RideError("same_place", "Pickup and drop-off must be different.");
  }

  const active = await prisma.ride.findFirst({
    where: { riderId: input.riderId, status: { in: ACTIVE_STATUSES } },
  });
  if (active) {
    throw new RideError("active_ride", "You already have an active ride.");
  }

  const price = estimateTrip(pickup, dropoff, input.tier);
  const ride = await prisma.ride.create({
    data: {
      riderId: input.riderId,
      status: "requested",
      tier: input.tier,
      pickupId: pickup.id,
      pickupName: pickup.id,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropoffId: dropoff.id,
      dropoffName: dropoff.id,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
      distanceKm: price.distanceKm,
      durationMin: price.durationMin,
      baseFare: price.baseFare,
      distanceFare: price.distanceFare,
      timeFare: price.timeFare,
      airportFee: price.airportFee,
      surge: price.surge,
      subtotal: price.subtotal,
      taxes: price.taxes,
      fare: price.fare,
      driverPayout: Math.round(price.subtotal * 0.78 * 100) / 100,
      paymentRef: `RDS-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    },
    include: { driver: { include: { user: true } } },
  });

  return matchRide(ride);
}

/** Assign the closest available driver, if there is one. */
export async function matchRide(ride: RideWithDriver): Promise<RideWithDriver> {
  const available = await prisma.driver.findMany({
    where: {
      online: true,
      rides: { none: { status: { in: ACTIVE_STATUSES } } },
    },
    include: { user: true },
  });
  if (available.length === 0) return ride;

  const nearest = available.sort(
    (a, b) =>
      haversineKm(a, { lat: ride.pickupLat, lng: ride.pickupLng }) -
      haversineKm(b, { lat: ride.pickupLat, lng: ride.pickupLng }),
  )[0];

  const updated = await prisma.ride.update({
    where: { id: ride.id },
    data: { driverId: nearest.id, status: "matched", matchedAt: new Date() },
    include: { driver: { include: { user: true } } },
  });
  // The driver heads to the pickup point.
  await prisma.driver.update({
    where: { id: nearest.id },
    data: { lat: ride.pickupLat, lng: ride.pickupLng },
  });
  return updated;
}

async function loadDriverForUser(userId: string) {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new RideError("no_driver_profile", "No driver profile.");
  return driver;
}

async function loadOwnRide(rideId: string, driverId: string): Promise<RideWithDriver> {
  const ride = await getRideById(rideId);
  if (!ride) throw new RideError("not_found", "Ride not found.");
  if (ride.driverId !== driverId) throw new RideError("forbidden", "Not your ride.");
  return ride;
}

export async function acceptRide(rideId: string, userId: string): Promise<RideWithDriver> {
  const driver = await loadDriverForUser(userId);
  if (!driver.online) throw new RideError("offline", "Go online to accept rides.");

  const busy = await prisma.ride.findFirst({
    where: { driverId: driver.id, status: { in: ACTIVE_STATUSES } },
  });
  if (busy) throw new RideError("bad_status", "You already have an active ride.");

  const ride = await getRideById(rideId);
  if (!ride) throw new RideError("not_found", "Ride not found.");
  if (ride.status !== "requested" || ride.driverId) {
    throw new RideError("bad_status", "This ride is already taken.");
  }

  const updated = await prisma.ride.update({
    where: { id: ride.id },
    data: { driverId: driver.id, status: "matched", matchedAt: new Date() },
    include: { driver: { include: { user: true } } },
  });
  await prisma.driver.update({
    where: { id: driver.id },
    data: { lat: ride.pickupLat, lng: ride.pickupLng },
  });
  return updated;
}

export async function startRide(rideId: string, userId: string): Promise<RideWithDriver> {
  const driver = await loadDriverForUser(userId);
  const ride = await loadOwnRide(rideId, driver.id);
  if (ride.status !== "matched") throw new RideError("bad_status", "Ride cannot be started.");
  return prisma.ride.update({
    where: { id: ride.id },
    data: { status: "in_progress", startedAt: new Date() },
    include: { driver: { include: { user: true } } },
  });
}

export async function completeRide(rideId: string, userId: string): Promise<RideWithDriver> {
  const driver = await loadDriverForUser(userId);
  const ride = await loadOwnRide(rideId, driver.id);
  if (ride.status !== "in_progress") {
    throw new RideError("bad_status", "Ride cannot be completed.");
  }
  const updated = await prisma.ride.update({
    where: { id: ride.id },
    data: { status: "completed", completedAt: new Date() },
    include: { driver: { include: { user: true } } },
  });
  await prisma.driver.update({
    where: { id: driver.id },
    data: { lat: ride.dropoffLat, lng: ride.dropoffLng },
  });
  return updated;
}

export async function cancelRide(rideId: string, userId: string): Promise<RideWithDriver> {
  const ride = await getRideById(rideId);
  if (!ride) throw new RideError("not_found", "Ride not found.");
  if (ride.riderId !== userId) throw new RideError("forbidden", "Not your ride.");
  if (ride.status !== "requested" && ride.status !== "matched") {
    throw new RideError("bad_status", "This ride can no longer be cancelled.");
  }
  return prisma.ride.update({
    where: { id: ride.id },
    data: { status: "cancelled", cancelledAt: new Date(), driverId: null },
    include: { driver: { include: { user: true } } },
  });
}

export async function rateRide(
  rideId: string,
  userId: string,
  rating: number,
): Promise<RideWithDriver> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new RideError("invalid_rating", "Rating must be between 1 and 5.");
  }
  const ride = await getRideById(rideId);
  if (!ride) throw new RideError("not_found", "Ride not found.");
  if (ride.riderId !== userId) throw new RideError("forbidden", "Not your ride.");
  if (ride.status !== "completed") {
    throw new RideError("bad_status", "You can only rate completed rides.");
  }
  const updated = await prisma.ride.update({
    where: { id: ride.id },
    data: { rating },
    include: { driver: { include: { user: true } } },
  });
  if (ride.driverId) {
    const stats = await prisma.ride.aggregate({
      where: { driverId: ride.driverId, rating: { not: null } },
      _avg: { rating: true },
    });
    if (stats._avg.rating) {
      await prisma.driver.update({
        where: { id: ride.driverId },
        data: { rating: Math.round(stats._avg.rating * 100) / 100 },
      });
    }
  }
  return updated;
}

/** Where the driver currently is along the trip, for the live map. */
function currentDriverPosition(ride: RideWithDriver): { lat: number; lng: number } | null {
  if (!ride.driver) return null;
  const pickup = { lat: ride.pickupLat, lng: ride.pickupLng };
  const dropoff = { lat: ride.dropoffLat, lng: ride.dropoffLng };

  if (ride.status === "matched" || !ride.startedAt) return pickup;
  if (ride.status === "completed") return dropoff;

  const progress = Math.min(
    1,
    (Date.now() - ride.startedAt.getTime()) / TRIP_MS,
  );
  return {
    lat: pickup.lat + (dropoff.lat - pickup.lat) * progress,
    lng: pickup.lng + (dropoff.lng - pickup.lng) * progress,
  };
}

export function serializeRide(ride: RideWithDriver, locale: Locale): RideView {
  const pickup = getPlace(ride.pickupId);
  const dropoff = getPlace(ride.dropoffId);
  const position = currentDriverPosition(ride);

  return {
    id: ride.id,
    status: ride.status as RideStatus,
    tier: ride.tier as RideTier,
    pickup: {
      id: ride.pickupId,
      name: pickup ? pickup.name[locale] : ride.pickupName,
      lat: ride.pickupLat,
      lng: ride.pickupLng,
    },
    dropoff: {
      id: ride.dropoffId,
      name: dropoff ? dropoff.name[locale] : ride.dropoffName,
      lat: ride.dropoffLat,
      lng: ride.dropoffLng,
    },
    distanceKm: ride.distanceKm,
    durationMin: ride.durationMin,
    baseFare: ride.baseFare,
    distanceFare: ride.distanceFare,
    timeFare: ride.timeFare,
    airportFee: ride.airportFee,
    surge: ride.surge,
    subtotal: ride.subtotal,
    taxes: ride.taxes,
    fare: ride.fare,
    driverPayout: ride.driverPayout,
    paymentRef: ride.paymentRef,
    rating: ride.rating,
    createdAt: ride.createdAt.toISOString(),
    matchedAt: ride.matchedAt?.toISOString() ?? null,
    startedAt: ride.startedAt?.toISOString() ?? null,
    completedAt: ride.completedAt?.toISOString() ?? null,
    cancelledAt: ride.cancelledAt?.toISOString() ?? null,
    driver: ride.driver
      ? {
          name: ride.driver.user.name,
          carModel: ride.driver.carModel,
          plate: ride.driver.plate,
          color: ride.driver.color,
          rating: ride.driver.rating,
          lat: position?.lat ?? ride.driver.lat,
          lng: position?.lng ?? ride.driver.lng,
        }
      : null,
  };
}
