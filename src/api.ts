import type {
  AlertsResponse,
  NetworkResponse,
  RouteStopsResponse,
  ShapeResponse,
  StopDetailResponse,
  StopInfo,
  TripDetail,
  VehiclesResponse,
} from './types';

const BASE = '/api';

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    signal,
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    let message = `Request failed (HTTP ${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // Keep the generic HTTP message.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export const api = {
  network: (signal?: AbortSignal) => getJson<NetworkResponse>('/network', signal),
  vehicles: (signal?: AbortSignal) => getJson<VehiclesResponse>('/vehicles', signal),
  alerts: (signal?: AbortSignal) => getJson<AlertsResponse>('/alerts', signal),
  trip: (tripId: string, signal?: AbortSignal) =>
    getJson<TripDetail>(`/trips/${encodeURIComponent(tripId)}`, signal),
  stop: (stopId: string, signal?: AbortSignal) =>
    getJson<StopDetailResponse>(`/stops/${encodeURIComponent(stopId)}`, signal),
  stopSearch: (query: string, signal?: AbortSignal) =>
    getJson<{ stops: StopInfo[] }>(
      `/stops/search?q=${encodeURIComponent(query)}&limit=30`,
      signal,
    ),
  nearbyStops: (lat: number, lon: number, signal?: AbortSignal) =>
    getJson<{ stops: StopInfo[] }>(
      `/stops/nearby?lat=${lat}&lon=${lon}&limit=12&radius=1500`,
      signal,
    ),
  routeStops: (routeId: string, signal?: AbortSignal) =>
    getJson<RouteStopsResponse>(`/routes/${encodeURIComponent(routeId)}/stops`, signal),
  routeShape: (routeId: string, signal?: AbortSignal) =>
    getJson<ShapeResponse>(`/routes/${encodeURIComponent(routeId)}/shape?direction=0`, signal),
};
