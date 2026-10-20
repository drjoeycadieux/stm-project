import type { Locale } from "./i18n-config";
import type { Place } from "./places";

export type RideTier = "economy" | "premium" | "xl";

export const RIDE_TIERS: RideTier[] = ["economy", "premium", "xl"];

interface TierRates {
  base: number;
  perKm: number;
  perMin: number;
  minFare: number;
  seats: number;
}

export const TIER_RATES: Record<RideTier, TierRates> = {
  economy: { base: 3.5, perKm: 1.85, perMin: 0.35, minFare: 7.5, seats: 4 },
  premium: { base: 6.5, perKm: 2.95, perMin: 0.55, minFare: 12, seats: 4 },
  xl: { base: 5.5, perKm: 2.4, perMin: 0.45, minFare: 10, seats: 6 },
};

/** Flat fee applied to trips that start or end at Trudeau Airport. */
export const AIRPORT_FEE = 12;

/** Quebec sales taxes: TPS (5%) + TVQ (9.975%). */
export const TAX_RATE = 0.14975;

/** Share of the subtotal paid out to the driver. */
export const DRIVER_SHARE = 0.78;

/** Montreal street networks are not straight lines; inflate great-circle distance. */
const ROAD_FACTOR = 1.35;

/** Average urban speed used to estimate trip duration. */
const AVG_SPEED_KMH = 24;

/** Slightly higher fares during weekday rush hours. */
const PEAK_SURGE = 1.25;

export function isRushHour(at: Date = new Date()): boolean {
  const day = at.getDay();
  const hour = at.getHours();
  const weekday = day >= 1 && day <= 5;
  const morningRush = weekday && hour >= 7 && hour <= 9;
  const eveningRush = weekday && hour >= 16 && hour <= 18;
  return morningRush || eveningRush;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface TripEstimate {
  distanceKm: number;
  durationMin: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  airportFee: number;
  surge: number;
  subtotal: number;
  taxes: number;
  fare: number;
}

export function estimateTrip(
  pickup: Place,
  dropoff: Place,
  tier: RideTier,
  at: Date = new Date(),
): TripEstimate {
  const rates = TIER_RATES[tier];
  const distanceKm = Math.max(
    1,
    Math.round(haversineKm(pickup, dropoff) * ROAD_FACTOR * 10) / 10,
  );
  const durationMin = Math.max(
    4,
    Math.round((distanceKm / AVG_SPEED_KMH) * 60),
  );

  const distanceFare = round2(rates.perKm * distanceKm);
  const timeFare = round2(rates.perMin * durationMin);
  const billable = Math.max(round2(rates.base + distanceFare + timeFare), rates.minFare);
  const surge = isRushHour(at) ? PEAK_SURGE : 1;
  const airportFee = pickup.id === "yul" || dropoff.id === "yul" ? AIRPORT_FEE : 0;

  const subtotal = round2(billable * surge + airportFee);
  const taxes = round2(subtotal * TAX_RATE);
  const fare = round2(subtotal + taxes);

  return {
    distanceKm,
    durationMin,
    baseFare: rates.base,
    distanceFare,
    timeFare,
    airportFee,
    surge,
    subtotal,
    taxes,
    fare,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatCAD(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount);
}
