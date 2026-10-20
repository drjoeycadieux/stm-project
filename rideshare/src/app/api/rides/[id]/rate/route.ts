import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requestLocale } from "@/lib/locale-request";
import { rideErrorResponse } from "@/lib/api";
import { rateRide, serializeRide } from "@/lib/rides";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const rating = body && typeof body.rating === "number" ? body.rating : 0;

  try {
    const { id } = await params;
    const ride = await rateRide(id, user.id, rating);
    return NextResponse.json({ ride: serializeRide(ride, await requestLocale()) });
  } catch (error) {
    return rideErrorResponse(error);
  }
}
