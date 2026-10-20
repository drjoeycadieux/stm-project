import type { RideTier } from "./pricing";

export type RideStatus =
  | "requested"
  | "matched"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface RideView {
  id: string;
  status: RideStatus;
  tier: RideTier;
  pickup: { id: string; name: string; lat: number; lng: number };
  dropoff: { id: string; name: string; lat: number; lng: number };
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
  driverPayout: number;
  paymentRef: string;
  rating: number | null;
  createdAt: string;
  matchedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  driver: {
    name: string;
    carModel: string;
    plate: string;
    color: string;
    rating: number;
    lat: number;
    lng: number;
  } | null;
}
