import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { useLiveQuery, useNow } from './hooks';
import type {
  AlertsResponse,
  NetworkResponse,
  RouteStopsResponse,
  ShapeResponse,
  StopDetailResponse,
  StopInfo,
  Tab,
  TripDetail,
  VehiclesResponse,
} from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';
import { DetailsPanel } from './components/DetailsPanel';
import { Icon } from './components/Icon';

const MONTREAL_CENTER = { lat: 45.5088, lng: -73.5878 };

export default function App() {
  const [tab, setTab] = useState<Tab>('routes');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedStop, setSelectedStop] = useState<StopInfo | null>(null);
  const [follow, setFollow] = useState(false);
  const [mapCenter, setMapCenter] = useState(MONTREAL_CENTER);
  const [networkReady, setNetworkReady] = useState(false);

  const nowMs = useNow(1000);

  const networkQuery = useLiveQuery<NetworkResponse>(
    'network',
    api.network,
    networkReady ? 60_000 : 4_000,
  );

  const vehiclesQuery = useLiveQuery<VehiclesResponse>('vehicles', api.vehicles, 10_000);
  const alertsQuery = useLiveQuery<AlertsResponse>('alerts', api.alerts, 60_000);

  useEffect(() => {
    if (networkQuery.data?.ready) setNetworkReady(true);
  }, [networkQuery.data]);

  const routes = networkQuery.data?.routes ?? [];
  const vehicles = useMemo(
    () => vehiclesQuery.data?.vehicles ?? [],
    [vehiclesQuery.data],
  );
  const alerts = alertsQuery.data?.alerts ?? [];

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? null,
    [routes, selectedRouteId],
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  );

  const visibleVehicles = useMemo(
    () =>
      selectedRouteId
        ? vehicles.filter((vehicle) => vehicle.routeId === selectedRouteId)
        : vehicles,
    [vehicles, selectedRouteId],
  );

  const tripKey = selectedVehicle?.tripId ?? null;
  const tripQuery = useLiveQuery<TripDetail>(
    tripKey ? `trip:${tripKey}` : null,
    (signal) => api.trip(tripKey as string, signal),
    15_000,
  );

  const stopKey = selectedStop?.id ?? null;
  const stopQuery = useLiveQuery<StopDetailResponse>(
    stopKey ? `stop:${stopKey}` : null,
    (signal) => api.stop(stopKey as string, signal),
    15_000,
  );

  const routeStopsQuery = useLiveQuery<RouteStopsResponse>(
    selectedRouteId ? `route-stops:${selectedRouteId}` : null,
    (signal) => api.routeStops(selectedRouteId as string, signal),
    30_000,
  );

  const shapeQuery = useLiveQuery<ShapeResponse>(
    selectedRouteId ? `route-shape:${selectedRouteId}` : null,
    (signal) => api.routeShape(selectedRouteId as string, signal),
    300_000,
  );

  // Drop a bus selection when the vehicle stops broadcasting.
  useEffect(() => {
    if (
      selectedVehicleId &&
      vehicles.length > 0 &&
      !vehicles.some((vehicle) => vehicle.id === selectedVehicleId)
    ) {
      setSelectedVehicleId(null);
      setFollow(false);
    }
  }, [vehicles, selectedVehicleId]);

  const selectRoute = (routeId: string | null) => {
    setSelectedRouteId(routeId);
    setSelectedVehicleId(null);
    setSelectedStop(null);
    setFollow(false);
  };

  const selectVehicle = (vehicleId: string) => {
    const vehicle = vehicles.find((item) => item.id === vehicleId);
    if (vehicle?.routeId) setSelectedRouteId(vehicle.routeId);
    setSelectedVehicleId(vehicleId);
    setSelectedStop(null);
  };

  const selectStop = (stop: StopInfo) => {
    setSelectedStop(stop);
    setSelectedVehicleId(null);
    setFollow(false);
  };

  const closeVehicle = () => {
    setSelectedVehicleId(null);
    setFollow(false);
  };

  const closeStop = () => {
    setSelectedStop(null);
  };

  const refreshAll = () => {
    networkQuery.refresh();
    vehiclesQuery.refresh();
    alertsQuery.refresh();
    tripQuery.refresh();
    stopQuery.refresh();
  };

  const liveError = vehiclesQuery.error ?? alertsQuery.error ?? null;
  const hasData = vehiclesQuery.data != null;
  const alertCount = alertsQuery.data?.routeAlertCount ?? 0;
  const routeCount = new Set(vehicles.map((vehicle) => vehicle.routeId).filter(Boolean)).size;

  return (
    <div className="app">
      <Header
        vehicleCount={vehicles.length}
        routeCount={routeCount}
        alertCount={alertCount}
        updatedAt={vehiclesQuery.data?.updatedAt ?? null}
        nowMs={nowMs}
        loading={vehiclesQuery.loading}
        hasError={Boolean(liveError)}
        onRefresh={refreshAll}
      />

      {liveError && (
        <div className="banner" role="status">
          <Icon name="alert" size={15} />
          <span>
            {liveError}
            {hasData ? ' — showing the last successful update.' : ''}
          </span>
          <button type="button" onClick={refreshAll}>
            Retry
          </button>
        </div>
      )}

      <main className="layout">
        <Sidebar
          tab={tab}
          onTabChange={setTab}
          routes={routes}
          networkReady={networkReady}
          vehicles={vehicles}
          alerts={alerts}
          selectedRouteId={selectedRouteId}
          selectedStopId={selectedStop?.id ?? null}
          routeStops={routeStopsQuery.data?.stops ?? []}
          mapCenter={mapCenter}
          onSelectRoute={selectRoute}
          onSelectStop={selectStop}
        />

        <MapView
          vehicles={visibleVehicles}
          routeStops={routeStopsQuery.data?.stops ?? []}
          trip={tripQuery.data}
          routeShape={selectedVehicle ? null : shapeQuery.data?.points ?? null}
          selectedRoute={selectedRoute}
          selectedVehicle={selectedVehicle}
          selectedStop={selectedStop}
          follow={follow}
          loading={(vehiclesQuery.loading || !hasData) && !liveError}
          onSelectVehicle={selectVehicle}
          onSelectStop={selectStop}
          onMove={setMapCenter}
          onClearRoute={() => selectRoute(null)}
        />

        <DetailsPanel
          selectedVehicle={selectedVehicle}
          selectedVehicleId={selectedVehicleId}
          trip={tripQuery.data}
          tripError={tripQuery.error}
          selectedStop={selectedStop}
          arrivals={stopQuery.data?.arrivals ?? null}
          arrivalsLoading={stopQuery.loading}
          arrivalsError={stopQuery.error}
          selectedRoute={selectedRoute}
          vehicles={vehicles}
          alerts={alerts}
          network={networkQuery.data}
          vehiclesUpdatedAt={vehiclesQuery.data?.updatedAt ?? null}
          follow={follow}
          nowMs={nowMs}
          onToggleFollow={() => setFollow((value) => !value)}
          onCloseVehicle={closeVehicle}
          onCloseStop={closeStop}
          onSelectRoute={selectRoute}
          onSelectVehicle={selectVehicle}
          onTabChange={setTab}
        />
      </main>
    </div>
  );
}
