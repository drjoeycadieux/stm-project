"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleDashed,
  Loader2,
  Star,
  XCircle,
} from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { formatCAD } from "@/lib/pricing";
import type { RideStatus, RideView } from "@/lib/types";
import { MontrealMap } from "./montreal-map";

export interface TrackerDict {
  statuses: Record<RideStatus, string>;
  timeline: Record<"requested" | "matched" | "in_progress" | "completed", string>;
  driverCard: { title: string; arriving: string; onTheWay: string; plate: string };
  cancel: { button: string; confirm: string };
  receipt: {
    title: string;
    trip: string;
    distance: string;
    duration: string;
    base: string;
    distanceFare: string;
    timeFare: string;
    airportFee: string;
    subtotal: string;
    taxes: string;
    total: string;
    reference: string;
    paid: string;
  };
  rating: { title: string; thanks: string; done: string };
}

interface TripTrackerProps {
  locale: Locale;
  initialRide: RideView;
  dict: TrackerDict;
  canCancel?: boolean;
}

const ACTIVE: RideStatus[] = ["requested", "matched", "in_progress"];
const STEPS: ("requested" | "matched" | "in_progress" | "completed")[] = [
  "requested",
  "matched",
  "in_progress",
  "completed",
];

const STATUS_STYLES: Record<RideStatus, string> = {
  requested: "bg-amber-50 text-amber-700",
  matched: "bg-brand-50 text-brand-800",
  in_progress: "bg-ink-950 text-white",
  completed: "bg-ink-100 text-ink-700",
  cancelled: "bg-red-50 text-red-700",
};

function stepIndex(status: RideStatus): number {
  if (status === "cancelled") return -1;
  return STEPS.indexOf(status as (typeof STEPS)[number]);
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TripTracker({ locale, initialRide, dict, canCancel = false }: TripTrackerProps) {
  const router = useRouter();
  const [ride, setRide] = useState<RideView>(initialRide);
  const [cancelling, setCancelling] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [justRated, setJustRated] = useState(false);
  const active = ACTIVE.includes(ride.status);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/rides/${ride.id}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setRide((previous) => {
      if (previous.status !== data.ride.status) {
        // Trip state changed — let server-rendered lists catch up too.
        router.refresh();
      }
      return data.ride;
    });
  }, [ride.id, router]);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [active, refresh]);

  async function cancel() {
    if (!window.confirm(dict.cancel.confirm)) return;
    setCancelling(true);
    const response = await fetch(`/api/rides/${ride.id}/cancel`, { method: "POST" });
    if (response.ok) {
      const data = await response.json();
      setRide(data.ride);
      router.refresh();
    }
    setCancelling(false);
  }

  async function rate(value: number) {
    setSubmittingRating(true);
    const response = await fetch(`/api/rides/${ride.id}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: value }),
    });
    if (response.ok) {
      const data = await response.json();
      setRide(data.ride);
      setJustRated(true);
      router.refresh();
    }
    setSubmittingRating(false);
  }

  const currentIndex = stepIndex(ride.status);
  const driverMessage =
    ride.status === "matched" ? dict.driverCard.arriving : dict.driverCard.onTheWay;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-500">
              {ride.pickup.name} → {ride.dropoff.name}
            </p>
            <p className="mt-1 text-xs text-ink-400">
              {ride.distanceKm} km · ~{ride.durationMin} min · {ride.paymentRef}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLES[ride.status]}`}
          >
            {ride.status === "in_progress" && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            {dict.statuses[ride.status]}
          </span>
        </div>

        {/* Timeline */}
        <ol className="mt-6 grid grid-cols-4 gap-2">
          {STEPS.map((step, index) => {
            const done = currentIndex > index || ride.status === "completed";
            const current = currentIndex === index && ride.status !== "completed";
            return (
              <li key={step} className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      done
                        ? "bg-brand-600 text-white"
                        : current
                          ? "bg-ink-950 text-white"
                          : "bg-ink-100 text-ink-400"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <CircleDashed className="h-3.5 w-3.5" />
                    )}
                  </span>
                  {index < STEPS.length - 1 && (
                    <span
                      className={`h-0.5 flex-1 rounded ${done ? "bg-brand-600" : "bg-ink-100"}`}
                    />
                  )}
                </div>
                <p
                  className={`mt-2 truncate text-xs font-medium ${
                    done || current ? "text-ink-950" : "text-ink-400"
                  }`}
                >
                  {dict.timeline[step]}
                </p>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Map + driver */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <MontrealMap
          pickup={ride.pickup}
          dropoff={ride.dropoff}
          driver={ride.driver && ride.status !== "cancelled" ? ride.driver : null}
          travelSeconds={45}
          className="h-72 sm:h-96"
        />

        <div className="space-y-4">
          {ride.driver && ride.status !== "cancelled" && (
            <div className="rounded-3xl border border-ink-100 bg-white p-6">
              <p className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
                {dict.driverCard.title}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-950 text-sm font-bold text-white">
                  {initials(ride.driver.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-950">{ride.driver.name}</p>
                  <p className="flex items-center gap-1 text-sm text-ink-500">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {ride.driver.rating.toFixed(2)}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-ink-500">
                {ride.driver.color} {ride.driver.carModel}
              </p>
              <p className="mt-2 inline-block rounded-lg border-2 border-ink-950 px-3 py-1 font-mono text-sm font-bold tracking-wider text-ink-950">
                {ride.driver.plate}
              </p>
              <p className="mt-4 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800">
                {driverMessage}
              </p>
            </div>
          )}

          {canCancel && (ride.status === "requested" || ride.status === "matched") && (
            <button
              onClick={cancel}
              disabled={cancelling}
              className="w-full rounded-full border border-red-200 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {cancelling ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : dict.cancel.button}
            </button>
          )}
        </div>
      </div>

      {/* Rating */}
      {ride.status === "completed" && !ride.rating && !justRated && (
        <div className="rounded-3xl border border-ink-100 bg-white p-6 text-center">
          <p className="font-semibold text-ink-950">{dict.rating.title}</p>
          <div className="mt-3 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => rate(value)}
                disabled={submittingRating}
                aria-label={`${value}`}
                className="rounded-full p-2 transition-transform hover:scale-110"
              >
                <Star className="h-7 w-7 text-ink-300 hover:fill-amber-400 hover:text-amber-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {ride.status === "completed" && (ride.rating || justRated) && (
        <p className="rounded-2xl bg-brand-50 px-4 py-3 text-center text-sm font-medium text-brand-800">
          {dict.rating.thanks}
        </p>
      )}

      {/* Receipt */}
      {(ride.status === "completed" || ride.status === "cancelled") && (
        <div className="rounded-3xl border border-ink-100 bg-white p-6">
          <p className="font-semibold text-ink-950">{dict.receipt.title}</p>
          <dl className="mt-4 space-y-2.5 text-sm">
            <Row label={`${dict.receipt.base} — ${ride.pickup.name} → ${ride.dropoff.name}`} value={formatCAD(ride.baseFare, locale)} />
            <Row label={`${dict.receipt.distanceFare} (${ride.distanceKm} km)`} value={formatCAD(ride.distanceFare, locale)} />
            <Row label={`${dict.receipt.timeFare} (~${ride.durationMin} min)`} value={formatCAD(ride.timeFare, locale)} />
            {ride.airportFee > 0 && (
              <Row label={dict.receipt.airportFee} value={formatCAD(ride.airportFee, locale)} />
            )}
            <Row label={dict.receipt.subtotal} value={formatCAD(ride.subtotal, locale)} />
            <Row label={dict.receipt.taxes} value={formatCAD(ride.taxes, locale)} />
            <div className="flex justify-between border-t border-ink-100 pt-3 text-base font-semibold text-ink-950">
              <dt>{dict.receipt.total}</dt>
              <dd>{formatCAD(ride.fare, locale)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-ink-400">
            {dict.receipt.reference}: {ride.paymentRef} · {dict.receipt.paid}
          </p>
        </div>
      )}

      {ride.status === "cancelled" && (
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <XCircle className="h-4 w-4" />
          {dict.statuses.cancelled}
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink-500">
      <dt className="min-w-0 pr-4">{label}</dt>
      <dd className="shrink-0 font-medium text-ink-800">{value}</dd>
    </div>
  );
}
