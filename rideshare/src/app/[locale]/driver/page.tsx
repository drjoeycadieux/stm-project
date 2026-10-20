import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { hasLocale, localePath } from "@/lib/i18n-config";
import { pageMetadata } from "@/lib/page-metadata";
import { ACTIVE_STATUSES, listDriverRides, serializeRide } from "@/lib/rides";
import type { RideStatus, RideView } from "@/lib/types";
import { DriverApplyForm } from "@/components/driver-apply";
import { DriverDashboard } from "@/components/driver-dashboard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "driver");
}

export default async function DriverPage({
  params,
}: PageProps<"/[locale]/driver">) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);

  const user = await getCurrentUser();
  if (!user) redirect(localePath(locale, "/login"));

  if (!user.driver) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-ink-950">
          {dict.driver.apply.title}
        </h1>
        <p className="mt-2 text-ink-500">{dict.driver.apply.subtitle}</p>
        <div className="mt-8 rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8">
          <DriverApplyForm
            dict={{
              carModel: dict.driver.apply.carModel,
              color: dict.driver.apply.color,
              plate: dict.driver.apply.plate,
              submit: dict.driver.apply.submit,
              errorText: dict.common.tryAgain,
            }}
          />
          <p className="mt-4 text-xs text-ink-400">{dict.driver.apply.note}</p>
        </div>
      </div>
    );
  }

  const rides = await listDriverRides(user.driver.id);
  const views: RideView[] = rides.map((ride) => serializeRide(ride, locale));

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayRides = views.filter(
    (ride) =>
      ride.status === "completed" &&
      ride.completedAt !== null &&
      new Date(ride.completedAt) >= startOfDay,
  );
  const earningsToday = todayRides.reduce((sum, ride) => sum + ride.driverPayout, 0);
  const activeRide =
    views.find((ride) => ACTIVE_STATUSES.includes(ride.status as RideStatus)) ?? null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight text-ink-950">
        {dict.driver.dash.title}
      </h1>
      <DriverDashboard
        locale={locale}
        initialOnline={user.driver.online}
        initialActiveRide={activeRide}
        stats={{
          earningsToday,
          ridesToday: todayRides.length,
          rating: user.driver.rating,
        }}
        dict={{
          title: dict.driver.dash.title,
          online: dict.driver.dash.online,
          offline: dict.driver.dash.offline,
          goOnline: dict.driver.dash.goOnline,
          goOffline: dict.driver.dash.goOffline,
          activeRide: dict.driver.dash.activeRide,
          requests: dict.driver.dash.requests,
          noRequests: dict.driver.dash.noRequests,
          accept: dict.driver.dash.accept,
          start: dict.driver.dash.start,
          complete: dict.driver.dash.complete,
          rideStatuses: dict.trips.statuses,
          stats: {
            earnings: dict.driver.dash.stats.earnings,
            rides: dict.driver.dash.stats.rides,
            rating: dict.driver.dash.stats.rating,
          },
          tripStatus: dict.driver.dash.tripStatus,
          viewTrip: dict.trips.viewTrip,
        }}
      />
    </div>
  );
}
