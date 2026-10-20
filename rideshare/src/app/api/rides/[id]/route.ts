import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRideById, serializeRide } from "@/lib/rides";
import { requestLocale } from "@/lib/locale-request";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await params;
  const ride = await getRideById(id);
  if (!ride) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isRider = ride.riderId === user.id;
  const isDriver = Boolean(user.driver && ride.driverId === user.driver.id);
  if (!isRider && !isDriver) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({ ride: serializeRide(ride, await requestLocale()) });
}
