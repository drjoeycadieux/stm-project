import { NextResponse } from "next/server";
import { RideError } from "./rides";

/** Map domain errors from the ride engine onto HTTP responses. */
export function rideErrorResponse(error: unknown): NextResponse {
  if (error instanceof RideError) {
    const status =
      error.code === "not_found" ? 404 : error.code === "forbidden" ? 403 : 400;
    return NextResponse.json({ error: error.code }, { status });
  }
  console.error("Ride action failed", error);
  return NextResponse.json({ error: "server_error" }, { status: 500 });
}
