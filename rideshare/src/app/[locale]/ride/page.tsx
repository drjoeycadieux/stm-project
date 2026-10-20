import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { hasLocale } from "@/lib/i18n-config";
import { pageMetadata } from "@/lib/page-metadata";
import { RideBooking } from "@/components/ride-booking";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "ride");
}

export default async function RidePage({
  params,
  searchParams,
}: PageProps<"/[locale]/ride">) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);
  const user = await getCurrentUser();
  const query = await searchParams;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <RideBooking
        locale={locale}
        isLoggedIn={Boolean(user)}
        initialPickupId={typeof query.from === "string" ? query.from : undefined}
        initialDropoffId={typeof query.to === "string" ? query.to : undefined}
        dict={{
          title: dict.booking.title,
          subtitle: dict.booking.subtitle,
          pickup: dict.booking.pickup,
          dropoff: dict.booking.dropoff,
          search: dict.booking.search,
          chooseTier: dict.booking.chooseTier,
          estimated: dict.booking.estimated,
          fareIncludes: dict.booking.fareIncludes,
          surgeNote: dict.booking.surgeNote,
          airportNote: dict.booking.airportNote,
          confirm: dict.booking.confirm,
          needAccount: dict.booking.needAccount,
          samePlace: dict.booking.samePlace,
          error: dict.booking.error,
          activeExists: dict.booking.activeExists,
          tiers: dict.booking.tiers,
        }}
      />
    </div>
  );
}
