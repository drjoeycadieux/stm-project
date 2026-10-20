import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Creates (or updates) the signed-in user's driver profile. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const carModel = typeof body.carModel === "string" ? body.carModel.trim() : "";
  const plate = typeof body.plate === "string" ? body.plate.trim().toUpperCase() : "";
  const color = typeof body.color === "string" ? body.color.trim() : "";

  if (carModel.length < 2 || plate.length < 2 || color.length < 2) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const driver = user.driver
    ? await prisma.driver.update({
        where: { id: user.driver.id },
        data: { carModel, plate, color },
      })
    : await prisma.driver.create({
        data: { userId: user.id, carModel, plate, color },
      });

  return NextResponse.json(
    { driver: { id: driver.id, carModel: driver.carModel, plate: driver.plate, color: driver.color } },
    { status: 201 },
  );
}
