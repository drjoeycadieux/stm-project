import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { hasLocale, localePath } from "@/lib/i18n-config";
import { pageMetadata } from "@/lib/page-metadata";
import { formatCAD } from "@/lib/pricing";
import { listDriverRides, serializeRide } from "@/lib/rides";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "earnings");
}

export default async function EarningsPage({
  params,
}: PageProps<"/[locale]/driver/earnings">) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);

  const user = await getCurrentUser();
  if (!user) redirect(localePath(locale, "/login"));
  if (!user.driver) redirect(localePath(locale, "/driver"));

  const rides = (await listDriverRides(user.driver.id)).map((ride) =>
    serializeRide(ride, locale),
  );
  const completed = rides.filter((ride) => ride.status === "completed");

  const total = completed.reduce((sum, ride) => sum + ride.driverPayout, 0);
  const average = completed.length > 0 ? total / completed.length : 0;

  // Daily totals for the last seven days.
  const days: { label: string; total: number }[] = [];
  const dayFormatter = new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    weekday: "short",
  });
  for (let offset = 6; offset >= 0; offset--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);
    const totalForDay = completed
      .filter(
        (ride) =>
          ride.completedAt !== null &&
          new Date(ride.completedAt) >= day &&
          new Date(ride.completedAt) < nextDay,
      )
      .reduce((sum, ride) => sum + ride.driverPayout, 0);
    days.push({ label: dayFormatter.format(day), total: totalForDay });
  }
  const maxDay = Math.max(...days.map((day) => day.total), 1);

  const dateFormatter = new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink-950">
        {dict.driver.earnings.title}
      </h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-ink-500">{dict.driver.earnings.total}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-ink-950">
            {formatCAD(total, locale)}
          </p>
        </div>
        <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-ink-500">{dict.driver.earnings.trips}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-ink-950">
            {completed.length}
          </p>
        </div>
        <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-ink-500">{dict.driver.earnings.average}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-ink-950">
            {formatCAD(average, locale)}
          </p>
        </div>
      </div>

      {/* Seven-day chart */}
      <div className="mt-6 rounded-3xl border border-ink-100 bg-white p-6 shadow-sm">
        <div className="flex h-40 items-end gap-3">
          {days.map((day) => (
            <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-lg bg-brand-500 transition-all"
                  style={{ height: `${Math.max(4, (day.total / maxDay) * 100)}%` }}
                  title={formatCAD(day.total, locale)}
                />
              </div>
              <span className="text-xs text-ink-400">{day.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 border-t border-ink-100 pt-4 text-sm text-ink-500">
          {dict.driver.earnings.shareNote}
        </p>
      </div>

      {/* Recent trips */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
          {dict.driver.earnings.recent}
        </h2>
        {completed.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
            {dict.driver.earnings.noTrips}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {completed.slice(0, 10).map((ride) => (
              <li
                key={ride.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink-100 bg-white p-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-950">
                    {ride.pickup.name}
                    <span className="mx-1.5 text-ink-300">→</span>
                    {ride.dropoff.name}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">
                    {ride.completedAt ? dateFormatter.format(new Date(ride.completedAt)) : ""} ·{" "}
                    {ride.distanceKm} km
                  </p>
                </div>
                <span className="font-semibold text-brand-700">
                  +{formatCAD(ride.driverPayout, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6">
          <Link
            href={localePath(locale, "/driver")}
            className="text-sm font-semibold text-brand-700 hover:underline"
          >
            ← {dict.nav.driverDashboard}
          </Link>
        </p>
      </div>
    </div>
  );
}
