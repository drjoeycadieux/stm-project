import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requestLocale } from "@/lib/locale-request";
import { listOpenRequests, serializeRide } from "@/lib/rides";

/** Open ride requests visible to an online driver. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!user.driver) {
    return NextResponse.json({ error: "no_driver_profile" }, { status: 403 });
  }

  const rides = await listOpenRequests();
  const locale = await requestLocale();
  return NextResponse.json({
    rides: rides
      .filter((ride) => ride.riderId !== user.id)
      .map((ride) => serializeRide(ride, locale)),
  });
}
