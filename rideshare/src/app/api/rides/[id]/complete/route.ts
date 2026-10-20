import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requestLocale } from "@/lib/locale-request";
import { rideErrorResponse } from "@/lib/api";
import { completeRide, serializeRide } from "@/lib/rides";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const ride = await completeRide(id, user.id);
    return NextResponse.json({ ride: serializeRide(ride, await requestLocale()) });
  } catch (error) {
    return rideErrorResponse(error);
  }
}
