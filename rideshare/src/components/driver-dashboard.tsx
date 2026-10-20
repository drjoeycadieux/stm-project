"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CarFront, Loader2, MapPin, Navigation } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { localePath } from "@/lib/i18n-config";
import { formatCAD } from "@/lib/pricing";
import type { RideView } from "@/lib/types";

export interface DriverDashDict {
  title: string;
  online: string;
  offline: string;
  goOnline: string;
  goOffline: string;
  activeRide: string;
  requests: string;
  noRequests: string;
  accept: string;
  start: string;
  complete: string;
  rideStatuses: Record<string, string>;
  stats: { earnings: string; rides: string; rating: string };
  tripStatus: { headToPickup: string; tripUnderway: string };
  viewTrip: string;
}

interface DriverDashboardProps {
  locale: Locale;
  dict: DriverDashDict;
  initialOnline: boolean;
  initialActiveRide: RideView | null;
  stats: { earningsToday: number; ridesToday: number; rating: number };
}

export function DriverDashboard({
  locale,
  dict,
  initialOnline,
  initialActiveRide,
  stats,
}: DriverDashboardProps) {
  const router = useRouter();
  const [online, setOnline] = useState(initialOnline);
  const [activeRide, setActiveRide] = useState<RideView | null>(initialActiveRide);
  const [requests, setRequests] = useState<RideView[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const hasActive = activeRide !== null;

  const sync = useCallback(async () => {
    const [activeResponse, openResponse] = await Promise.all([
      fetch(`/api/rides?role=driver`, { cache: "no-store" }),
      fetch(`/api/rides/open`, { cache: "no-store" }),
    ]);

    if (activeResponse.ok) {
      const data = await activeResponse.json();
      const current =
        data.rides.find((ride: RideView) =>
          ["requested", "matched", "in_progress"].includes(ride.status),
        ) ?? null;
      setActiveRide((previous) => {
        if (previous?.status !== current?.status) router.refresh();
        return current;
      });
    }
    if (openResponse.ok) {
      const data = await openResponse.json();
      setRequests(data.rides);
    }
  }, [router]);

  useEffect(() => {
    const timer = setInterval(sync, 3000);
    return () => clearInterval(timer);
  }, [sync]);

  async function toggleOnline() {
    setBusy("toggle");
    const response = await fetch("/api/driver/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ online: !online }),
    });
    if (response.ok) {
      const data = await response.json();
      setOnline(data.driver.online);
      router.refresh();
      sync();
    }
    setBusy(null);
  }

  async function action(rideId: string, name: "accept" | "start" | "complete") {
    setBusy(`${name}:${rideId}`);
    const response = await fetch(`/api/rides/${rideId}/${name}`, { method: "POST" });
    if (response.ok) {
      const data = await response.json();
      setActiveRide(data.ride);
      router.refresh();
      sync();
    }
    setBusy(null);
  }

  const visibleRequests = hasActive
    ? []
    : requests.filter((ride) => ride.status === "requested");

  return (
    <div className="space-y-6">
      {/* Online toggle + stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span
            className={`relative flex h-3 w-3 ${online ? "" : "opacity-40"}`}
          >
            {online && (
              <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-brand-500" />
            )}
            <span
              className={`relative inline-flex h-3 w-3 rounded-full ${online ? "bg-brand-500" : "bg-ink-300"}`}
            />
          </span>
          <div>
            <p className="font-semibold text-ink-950">{online ? dict.online : dict.offline}</p>
          </div>
        </div>

        <button
          onClick={toggleOnline}
          disabled={busy === "toggle"}
          className={`rounded-full px-6 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
            online
              ? "border border-ink-200 text-ink-700 hover:bg-ink-50"
              : "bg-brand-600 text-white hover:bg-brand-700"
          }`}
        >
          {busy === "toggle" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : online ? (
            dict.goOffline
          ) : (
            dict.goOnline
          )}
        </button>
      </div>

      {/* Active ride */}
      {activeRide ? (
        <div className="rounded-3xl border border-ink-950 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-ink-950">{dict.activeRide}</h2>
            <span className="rounded-full bg-ink-950 px-3 py-1 text-xs font-semibold text-white">
              {dict.rideStatuses[activeRide.status]}
            </span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-ink-50 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-ink-950">
                <MapPin className="h-4 w-4 text-brand-600" />
                {activeRide.pickup.name}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm font-medium text-ink-950">
                <Navigation className="h-4 w-4 text-ink-950" />
                {activeRide.dropoff.name}
              </p>
              <p className="mt-3 text-xs text-ink-500">
                {activeRide.distanceKm} km · ~{activeRide.durationMin} min
              </p>
            </div>
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-sm font-semibold text-brand-900">
                {formatCAD(activeRide.fare, locale)}
              </p>
              <p className="mt-1 text-xs text-brand-800">
                {formatCAD(activeRide.driverPayout, locale)} payout
              </p>
              <p className="mt-3 text-xs text-brand-800">
                {activeRide.status === "matched"
                  ? dict.tripStatus.headToPickup
                  : dict.tripStatus.tripUnderway}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {activeRide.status === "matched" && (
              <button
                onClick={() => action(activeRide.id, "start")}
                disabled={busy === `start:${activeRide.id}`}
                className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {dict.start}
              </button>
            )}
            {activeRide.status === "in_progress" && (
              <button
                onClick={() => action(activeRide.id, "complete")}
                disabled={busy === `complete:${activeRide.id}`}
                className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {dict.complete}
              </button>
            )}
            <Link
              href={localePath(locale, `/trips/${activeRide.id}`)}
              className="rounded-full border border-ink-200 px-6 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
            >
              {dict.viewTrip}
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-ink-950">{dict.requests}</h2>
          {visibleRequests.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">
              {online ? dict.noRequests : dict.offline}
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {visibleRequests.map((ride) => (
                <li
                  key={ride.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink-100 p-4"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-ink-950">
                      <CarFront className="h-4 w-4 shrink-0 text-brand-600" />
                      {ride.pickup.name} → {ride.dropoff.name}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      {ride.distanceKm} km · {formatCAD(ride.fare, locale)}
                    </p>
                  </div>
                  <button
                    onClick={() => action(ride.id, "accept")}
                    disabled={busy === `accept:${ride.id}` || !online}
                    className="rounded-full bg-ink-950 px-5 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-40"
                  >
                    {busy === `accept:${ride.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      dict.accept
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={dict.stats.earnings} value={formatCAD(stats.earningsToday, locale)} />
        <Stat label={dict.stats.rides} value={String(stats.ridesToday)} />
        <Stat label={dict.stats.rating} value={stats.rating.toFixed(2)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-ink-100 bg-white p-5">
      <p className="text-sm text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink-950">{value}</p>
    </div>
  );
}
