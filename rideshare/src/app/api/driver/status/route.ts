import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const online = Boolean(body?.online);

  if (!user.driver) {
    return NextResponse.json({ error: "no_driver_profile" }, { status: 403 });
  }

  const driver = await prisma.driver.update({
    where: { id: user.driver.id },
    data: { online },
  });

  return NextResponse.json({ driver: { online: driver.online } });
}
