"use client";

import { useMemo, useState } from "react";
import { Clock, MapPin, Navigation } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { type Place } from "@/lib/places";
import { estimateTrip, formatCAD, type RideTier } from "@/lib/pricing";
import { PlacePicker } from "./place-picker";

export interface EstimatorDict {
  pickup: string;
  dropoff: string;
  search: string;
  estimate: string;
  tripDetails: string;
  fareIncludes: string;
  chooseTier: string;
  tiers: Record<RideTier, { name: string }>;
}

const TIER_ORDER: RideTier[] = ["economy", "premium", "xl"];

export function FareEstimator({ locale, dict }: { locale: Locale; dict: EstimatorDict }) {
  const [pickup, setPickup] = useState<Place | null>(null);
  const [dropoff, setDropoff] = useState<Place | null>(null);
  const [tier, setTier] = useState<RideTier>("economy");

  const estimate = useMemo(() => {
    if (!pickup || !dropoff || pickup.id === dropoff.id) return null;
    return estimateTrip(pickup, dropoff, tier);
  }, [pickup, dropoff, tier]);

  return (
    <div className="grid gap-8 rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8 lg:grid-cols-2">
      <div className="space-y-4">
        <PlacePicker
          locale={locale}
          label={dict.pickup}
          placeholder={dict.search}
          value={pickup}
          onChange={setPickup}
          exclude={dropoff?.id}
        />
        <PlacePicker
          locale={locale}
          label={dict.dropoff}
          placeholder={dict.search}
          value={dropoff}
          onChange={setDropoff}
          exclude={pickup?.id}
        />

        <div className="flex flex-wrap gap-2 pt-1">
          {TIER_ORDER.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTier(option)}
              aria-pressed={option === tier}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                option === tier
                  ? "bg-ink-950 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              }`}
            >
              {dict.tiers[option].name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-ink-50 p-6">
        {estimate ? (
          <>
            <p className="text-sm font-medium text-ink-500">{dict.estimate}</p>
            <p className="mt-1 text-5xl font-semibold tracking-tight text-ink-950">
              {formatCAD(estimate.fare, locale)}
            </p>
            <p className="mt-1 text-sm text-ink-500">{dict.fareIncludes}</p>

            <dl className="mt-6 space-y-3 border-t border-ink-200 pt-5 text-sm">
              <div className="flex items-center gap-2 text-ink-600">
                <MapPin className="h-4 w-4 text-brand-600" />
                <dt className="sr-only">{dict.tripDetails}</dt>
                <dd className="truncate">
                  {pickup?.name[locale]} → {dropoff?.name[locale]}
                </dd>
              </div>
              <div className="flex items-center gap-2 text-ink-600">
                <Navigation className="h-4 w-4 text-ink-400" />
                <dd>{estimate.distanceKm} km</dd>
              </div>
              <div className="flex items-center gap-2 text-ink-600">
                <Clock className="h-4 w-4 text-ink-400" />
                <dd>~{estimate.durationMin} min</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="flex h-full min-h-40 items-center justify-center text-sm text-ink-400">
            {dict.pickup} → {dict.dropoff}
          </p>
        )}
      </div>
    </div>
  );
}
