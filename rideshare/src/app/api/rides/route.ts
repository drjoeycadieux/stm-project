import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requestLocale } from "@/lib/locale-request";
import { RIDE_TIERS, type RideTier } from "@/lib/pricing";
import {
  listDriverRides,
  listRiderRides,
  requestRide,
  RideError,
  serializeRide,
} from "@/lib/rides";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const pickupId = typeof body.pickupId === "string" ? body.pickupId : "";
  const dropoffId = typeof body.dropoffId === "string" ? body.dropoffId : "";
  const tier = typeof body.tier === "string" ? (body.tier as RideTier) : "economy";

  if (!RIDE_TIERS.includes(tier)) {
    return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
  }

  try {
    const ride = await requestRide({ riderId: user.id, pickupId, dropoffId, tier });
    return NextResponse.json(
      { ride: serializeRide(ride, await requestLocale()) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof RideError) {
      return NextResponse.json({ error: error.code }, { status: 400 });
    }
    console.error("requestRide failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const role = new URL(request.url).searchParams.get("role") ?? "rider";
  const locale = await requestLocale();

  if (role === "driver") {
    if (!user.driver) {
      return NextResponse.json({ error: "no_driver_profile" }, { status: 403 });
    }
    const rides = await listDriverRides(user.driver.id);
    return NextResponse.json({ rides: rides.map((ride) => serializeRide(ride, locale)) });
  }

  const rides = await listRiderRides(user.id);
  return NextResponse.json({ rides: rides.map((ride) => serializeRide(ride, locale)) });
}
