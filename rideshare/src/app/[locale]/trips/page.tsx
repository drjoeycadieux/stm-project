import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { hasLocale, localePath } from "@/lib/i18n-config";
import { pageMetadata } from "@/lib/page-metadata";
import { formatCAD } from "@/lib/pricing";
import { ACTIVE_STATUSES, listRiderRides, serializeRide } from "@/lib/rides";
import type { RideStatus, RideView } from "@/lib/types";
import { TripTracker } from "@/components/trip-tracker";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "trips");
}

export default async function TripsPage({
  params,
}: PageProps<"/[locale]/trips">) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);

  const user = await getCurrentUser();
  if (!user) redirect(localePath(locale, "/login"));

  const rides = await listRiderRides(user.id);
  const views: RideView[] = rides.map((ride) => serializeRide(ride, locale));
  const active = views.find((ride) => ACTIVE_STATUSES.includes(ride.status as RideStatus)) ?? null;
  const past = views.filter((ride) => !ACTIVE_STATUSES.includes(ride.status as RideStatus));

  const dateFormatter = new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink-950">
        {dict.trips.title}
      </h1>

      {active && (
        <section className="mt-8">
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-ink-500 uppercase">
            {dict.trips.active}
          </h2>
          <TripTracker
            locale={locale}
            initialRide={active}
            canCancel
            dict={{
              statuses: dict.trips.statuses,
              timeline: dict.trips.timeline,
              driverCard: dict.trips.driverCard,
              cancel: dict.trips.cancel,
              receipt: dict.trips.receipt,
              rating: dict.trips.rating,
            }}
          />
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
          {dict.trips.past}
        </h2>

        {past.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-ink-200 bg-white p-10 text-center">
            <p className="text-ink-500">{dict.trips.empty}</p>
            <Link
              href={localePath(locale, "/ride")}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {dict.trips.emptyCta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {past.map((ride) => (
              <li key={ride.id}>
                <Link
                  href={localePath(locale, `/trips/${ride.id}`)}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition-colors hover:border-ink-300"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-950">
                      {ride.pickup.name}
                      <span className="mx-1.5 text-ink-300">→</span>
                      {ride.dropoff.name}
                    </p>
                    <p className="mt-1 text-xs text-ink-400">
                      {dateFormatter.format(new Date(ride.createdAt))} ·{" "}
                      {dict.trips.statuses[ride.status]}
                    </p>
                  </div>
                  <span className="font-semibold text-ink-950">
                    {formatCAD(ride.fare, locale)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8">
          <Link
            href={localePath(locale, "/ride")}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink-950 px-6 py-3 text-sm font-semibold text-white hover:bg-ink-800"
          >
            {dict.trips.newRide}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
