"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Car, Loader2, Users } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { localePath } from "@/lib/i18n-config";
import { getPlace, type Place } from "@/lib/places";
import { estimateTrip, formatCAD, TIER_RATES, type RideTier } from "@/lib/pricing";
import { MontrealMap } from "./montreal-map";
import { PlacePicker } from "./place-picker";

export interface BookingDict {
  title: string;
  subtitle: string;
  pickup: string;
  dropoff: string;
  search: string;
  chooseTier: string;
  estimated: string;
  fareIncludes: string;
  surgeNote: string;
  airportNote: string;
  confirm: string;
  needAccount: string;
  samePlace: string;
  error: string;
  activeExists: string;
  tiers: Record<RideTier, { name: string; description: string }>;
}

interface RideBookingProps {
  locale: Locale;
  isLoggedIn: boolean;
  dict: BookingDict;
  initialPickupId?: string;
  initialDropoffId?: string;
}

const TIER_ORDER: RideTier[] = ["economy", "premium", "xl"];

const ERROR_MESSAGES: Record<string, "samePlace" | "activeExists"> = {
  same_place: "samePlace",
  active_ride: "activeExists",
};

export function RideBooking({
  locale,
  isLoggedIn,
  dict,
  initialPickupId,
  initialDropoffId,
}: RideBookingProps) {
  const router = useRouter();
  const [pickup, setPickup] = useState<Place | null>(() => getPlace(initialPickupId ?? "") ?? null);
  const [dropoff, setDropoff] = useState<Place | null>(() => getPlace(initialDropoffId ?? "") ?? null);
  const [tier, setTier] = useState<RideTier>("economy");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimate = useMemo(() => {
    if (!pickup || !dropoff || pickup.id === dropoff.id) return null;
    return estimateTrip(pickup, dropoff, tier);
  }, [pickup, dropoff, tier]);

  const samePlace = Boolean(pickup && dropoff && pickup.id === dropoff.id);

  async function confirm() {
    if (!pickup || !dropoff || samePlace || submitting) return;
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/rides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickupId: pickup.id, dropoffId: dropoff.id, tier }),
    });

    if (response.status === 401) {
      const next = `${localePath(locale, "/ride")}?from=${pickup.id}&to=${dropoff.id}`;
      router.push(`${localePath(locale, "/login")}?next=${encodeURIComponent(next)}`);
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const key = ERROR_MESSAGES[data.error];
      setError(key ? dict[key] : dict.error);
      setSubmitting(false);
      return;
    }

    router.push(`${localePath(locale, "/trips")}/${data.ride.id}`);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">
          {dict.title}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-500">{dict.subtitle}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <PlacePicker
            locale={locale}
            label={dict.pickup}
            placeholder={dict.search}
            value={pickup}
            onChange={(place) => {
              setPickup(place);
              setError(null);
            }}
            exclude={dropoff?.id}
          />
          <PlacePicker
            locale={locale}
            label={dict.dropoff}
            placeholder={dict.search}
            value={dropoff}
            onChange={(place) => {
              setDropoff(place);
              setError(null);
            }}
            exclude={pickup?.id}
          />
        </div>

        <h2 className="mt-8 text-sm font-semibold tracking-wide text-ink-500 uppercase">
          {dict.chooseTier}
        </h2>
        <div className="mt-3 grid gap-3">
          {TIER_ORDER.map((option) => {
            const active = option === tier;
            const price = pickup && dropoff && !samePlace
              ? estimateTrip(pickup, dropoff, option).fare
              : null;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setTier(option)}
                aria-pressed={active}
                className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                  active
                    ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100"
                    : "border-ink-200 bg-white hover:border-ink-300"
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    active ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500"
                  }`}
                >
                  <Car className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-ink-950">
                      {dict.tiers[option].name}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-ink-400">
                      <Users className="h-3 w-3" />
                      {TIER_RATES[option].seats}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-ink-500">
                    {dict.tiers[option].description}
                  </span>
                </span>
                {price !== null && (
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold text-ink-950">
                      {formatCAD(price, locale)}
                    </span>
                    <span className="block text-xs text-ink-400">{dict.fareIncludes}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {estimate && (
          <div className="mt-6 space-y-1.5 rounded-2xl bg-ink-50 p-4 text-sm text-ink-500">
            <p>
              {estimate.distanceKm} km · ~{estimate.durationMin} min
            </p>
            <p>{dict.surgeNote}</p>
            {estimate.airportFee > 0 && <p>{dict.airportNote}</p>}
          </div>
        )}

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={confirm}
            disabled={!estimate || submitting}
            className="flex items-center justify-center gap-2 rounded-full bg-brand-600 px-8 py-3.5 font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-200"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {dict.confirm}
            {estimate && ` · ${formatCAD(estimate.fare, locale)}`}
          </button>
          {!isLoggedIn && (
            <p className="text-sm text-ink-500">{dict.needAccount}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {pickup && dropoff && !samePlace ? (
          <MontrealMap
            pickup={pickup}
            dropoff={dropoff}
            animateCar
            travelSeconds={estimate?.durationMin ?? 20}
            className="h-64 lg:h-80"
          />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white lg:h-80">
            <span className="text-sm text-ink-400">
              {pickup ? dict.dropoff : dict.pickup}
            </span>
          </div>
        )}

        {estimate && (
          <div className="rounded-3xl border border-ink-100 bg-white p-6">
            <p className="text-sm font-medium text-ink-500">{dict.estimated}</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-ink-950">
              {formatCAD(estimate.fare, locale)}
            </p>
            <dl className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
              <div className="flex justify-between text-ink-500">
                <dt>{dict.pickup}</dt>
                <dd className="max-w-[55%] truncate text-right font-medium text-ink-800">
                  {pickup?.name[locale]}
                </dd>
              </div>
              <div className="flex justify-between text-ink-500">
                <dt>{dict.dropoff}</dt>
                <dd className="max-w-[55%] truncate text-right font-medium text-ink-800">
                  {dropoff?.name[locale]}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
