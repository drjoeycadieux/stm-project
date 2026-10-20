import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n";
import { hasLocale } from "@/lib/i18n-config";
import { pageMetadata } from "@/lib/page-metadata";
import { formatCAD, TIER_RATES, type RideTier } from "@/lib/pricing";
import { FareEstimator } from "@/components/fare-estimator";

const TIER_ORDER: RideTier[] = ["economy", "premium", "xl"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "pricing");
}

export default async function PricingPage({
  params,
}: PageProps<"/[locale]/pricing">) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
        {dict.pricing.title}
      </h1>
      <p className="mt-2 max-w-2xl text-ink-500">{dict.pricing.subtitle}</p>

      <div className="mt-10">
        <FareEstimator
          locale={locale}
          dict={{
            pickup: dict.pricing.estimator.pickup,
            dropoff: dict.pricing.estimator.dropoff,
            search: dict.booking.search,
            estimate: dict.pricing.estimator.estimate,
            tripDetails: dict.pricing.estimator.tripDetails,
            fareIncludes: dict.booking.fareIncludes,
            chooseTier: dict.booking.chooseTier,
            tiers: dict.booking.tiers,
          }}
        />
      </div>

      {/* Rates table */}
      <div className="mt-12 rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-ink-950">
          {dict.pricing.table.title}
        </h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[540px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs tracking-wide text-ink-400 uppercase">
                <th className="pb-3 pr-4 font-semibold">{dict.pricing.table.tier}</th>
                <th className="pb-3 pr-4 font-semibold">{dict.pricing.table.base}</th>
                <th className="pb-3 pr-4 font-semibold">{dict.pricing.table.perKm}</th>
                <th className="pb-3 pr-4 font-semibold">{dict.pricing.table.perMin}</th>
                <th className="pb-3 pr-4 font-semibold">{dict.pricing.table.minFare}</th>
                <th className="pb-3 font-semibold">{dict.pricing.table.seats}</th>
              </tr>
            </thead>
            <tbody>
              {TIER_ORDER.map((tier) => {
                const rates = TIER_RATES[tier];
                return (
                  <tr key={tier} className="border-b border-ink-50 last:border-0">
                    <td className="py-3.5 pr-4 font-semibold text-ink-950">
                      {dict.booking.tiers[tier].name}
                    </td>
                    <td className="py-3.5 pr-4 text-ink-700">{formatCAD(rates.base, locale)}</td>
                    <td className="py-3.5 pr-4 text-ink-700">{formatCAD(rates.perKm, locale)}</td>
                    <td className="py-3.5 pr-4 text-ink-700">{formatCAD(rates.perMin, locale)}</td>
                    <td className="py-3.5 pr-4 text-ink-700">{formatCAD(rates.minFare, locale)}</td>
                    <td className="py-3.5 text-ink-700">{rates.seats}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {Object.values(dict.pricing.notes).map((note) => (
          <li
            key={note}
            className="rounded-2xl bg-white p-5 text-sm leading-relaxed text-ink-600 shadow-sm ring-1 ring-ink-100"
          >
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
}
