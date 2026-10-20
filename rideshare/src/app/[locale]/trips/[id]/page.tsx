import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { hasLocale, localePath } from "@/lib/i18n-config";
import { pageMetadata } from "@/lib/page-metadata";
import { getRideById, serializeRide } from "@/lib/rides";
import { TripTracker } from "@/components/trip-tracker";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "trips");
}

export default async function TripDetailPage({
  params,
}: PageProps<"/[locale]/trips/[id]">) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);

  const user = await getCurrentUser();
  if (!user) redirect(localePath(locale, "/login"));

  const ride = await getRideById(id);
  const ownsRide =
    ride &&
    (ride.riderId === user.id || Boolean(user.driver && ride.driverId === user.driver.id));
  if (!ride || !ownsRide) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <TripTracker
        locale={locale}
        initialRide={serializeRide(ride, locale)}
        canCancel={ride.riderId === user.id}
        dict={{
          statuses: dict.trips.statuses,
          timeline: dict.trips.timeline,
          driverCard: dict.trips.driverCard,
          cancel: dict.trips.cancel,
          receipt: dict.trips.receipt,
          rating: dict.trips.rating,
        }}
      />
    </div>
  );
}
