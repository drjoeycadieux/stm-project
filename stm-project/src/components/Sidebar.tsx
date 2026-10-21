import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { RouteInfo, ServiceAlert, StopInfo, Tab, Vehicle } from '../types';
import {
  classNames,
  formatAlertWindow,
  modeLabel,
  normalizeText,
} from '../utils';
import { useNow } from '../hooks';
import { Icon } from './Icon';
import { RouteBadge } from './RouteBadge';

interface SidebarProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  routes: RouteInfo[];
  networkReady: boolean;
  vehicles: Vehicle[];
  alerts: ServiceAlert[];
  selectedRouteId: string | null;
  selectedStopId: string | null;
  routeStops: StopInfo[];
  mapCenter: { lat: number; lng: number };
  onSelectRoute: (routeId: string | null) => void;
  onSelectStop: (stop: StopInfo) => void;
}

export function Sidebar({
  tab,
  onTabChange,
  routes,
  networkReady,
  vehicles,
  alerts,
  selectedRouteId,
  selectedStopId,
  routeStops,
  mapCenter,
  onSelectRoute,
  onSelectStop,
}: SidebarProps) {
  const [routeQuery, setRouteQuery] = useState('');
  const [stopQuery, setStopQuery] = useState('');
  const [stopResults, setStopResults] = useState<StopInfo[] | null>(null);
  const [stopSearchLoading, setStopSearchLoading] = useState(false);
  const [stopSearchError, setStopSearchError] = useState<string | null>(null);
  const [nearbyStops, setNearbyStops] = useState<StopInfo[] | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [alertScope, setAlertScope] = useState<'route' | 'all'>('route');
  const [alertLimit, setAlertLimit] = useState(40);

  const now = useNow(60_000);
  const nowSeconds = Math.floor(now / 1000);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? null,
    [routes, selectedRouteId],
  );

  const vehicleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const vehicle of vehicles) {
      if (!vehicle.routeId) continue;
      counts.set(vehicle.routeId, (counts.get(vehicle.routeId) ?? 0) + 1);
    }
    return counts;
  }, [vehicles]);

  const routeAlertCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const alert of alerts) {
      if (alert.level !== 'route') continue;
      for (const route of alert.routes) {
        counts.set(route, (counts.get(route) ?? 0) + 1);
      }
    }
    return counts;
  }, [alerts]);

  const filteredRoutes = useMemo(() => {
    const query = normalizeText(routeQuery);
    if (!query) return routes;
    return routes.filter((route) =>
      normalizeText(
        `${route.shortName} ${route.longName} ${route.mode} ${modeLabel(route.mode, route.type)}`,
      ).includes(query),
    );
  }, [routes, routeQuery]);

  const filteredAlerts = useMemo(() => {
    let list = alerts;
    if (selectedRouteId) {
      const shortName = selectedRoute?.shortName;
      list = list.filter(
        (alert) =>
          alert.routes.includes(selectedRouteId) ||
          (shortName ? alert.routes.includes(shortName) : false),
      );
    }
    if (alertScope === 'route') {
      list = list.filter((alert) => alert.level === 'route');
    }
    return list;
  }, [alerts, selectedRouteId, selectedRoute, alertScope]);

  useEffect(() => {
    setAlertScope(selectedRouteId ? 'all' : 'route');
    setAlertLimit(40);
  }, [selectedRouteId]);

  useEffect(() => {
    const query = stopQuery.trim();
    if (query.length < 2) {
      setStopResults(null);
      setStopSearchError(null);
      setStopSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    setStopSearchLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const response = await api.stopSearch(query, controller.signal);
        setStopResults(response.stops);
        setStopSearchError(null);
      } catch (error) {
        if (!controller.signal.aborted) {
          setStopSearchError(error instanceof Error ? error.message : 'Search failed');
        }
      } finally {
        if (!controller.signal.aborted) setStopSearchLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [stopQuery]);

  const findNearby = async () => {
    setNearbyLoading(true);
    setNearbyError(null);
    setStopQuery('');
    try {
      const response = await api.nearbyStops(mapCenter.lat, mapCenter.lng);
      setNearbyStops(response.stops);
    } catch (error) {
      setNearbyError(error instanceof Error ? error.message : 'Unable to find stops');
    } finally {
      setNearbyLoading(false);
    }
  };

  const stopList = stopQuery.trim().length >= 2
    ? stopResults ?? []
    : selectedRouteId
      ? routeStops
      : nearbyStops ?? [];

  const stopListTitle = stopQuery.trim().length >= 2
    ? 'Search results'
    : selectedRouteId
      ? `Stops on route ${selectedRoute?.shortName ?? ''}`
      : 'Nearby stops';

  return (
    <aside className="sidebar" aria-label="Network explorer">
      <div className="sidebar-tabs" role="tablist" aria-label="Explorer sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'routes'}
          className={classNames('sidebar-tab', tab === 'routes' && 'active')}
          onClick={() => onTabChange('routes')}
        >
          Routes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'stops'}
          className={classNames('sidebar-tab', tab === 'stops' && 'active')}
          onClick={() => onTabChange('stops')}
        >
          Stops
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'alerts'}
          className={classNames('sidebar-tab', tab === 'alerts' && 'active')}
          onClick={() => onTabChange('alerts')}
        >
          Alerts
          {alerts.length > 0 && <span className="tab-count">{filteredAlerts.length}</span>}
        </button>
      </div>

      {!networkReady && (
        <div className="loading-note">
          <span className="spinner small" />
          Loading STM network data…
        </div>
      )}

      {tab === 'routes' && (
        <div className="tab-body">
          <div className="search-field">
            <Icon name="search" size={15} />
            <input
              type="search"
              value={routeQuery}
              onChange={(event) => setRouteQuery(event.target.value)}
              placeholder="Search routes — 51, 747, métro…"
              aria-label="Search routes"
              spellCheck={false}
            />
            {routeQuery && (
              <button
                type="button"
                className="field-clear"
                onClick={() => setRouteQuery('')}
                aria-label="Clear route search"
              >
                <Icon name="close" size={13} />
              </button>
            )}
          </div>

          <div className="list-scroll">
            <button
              type="button"
              className={classNames('route-row', 'all-routes-row', !selectedRouteId && 'active')}
              onClick={() => onSelectRoute(null)}
            >
              <span className="all-routes-icon">
                <Icon name="route" size={16} />
              </span>
              <span className="route-row-text">
                <span className="route-row-title">All routes</span>
                <span className="route-row-sub">{vehicles.length} vehicles live</span>
              </span>
            </button>

            {!networkReady && <SkeletonRows count={7} />}

            {networkReady && filteredRoutes.length === 0 && (
              <div className="empty-state">
                <Icon name="search" size={20} />
                <p>No routes match “{routeQuery}”.</p>
              </div>
            )}

            {filteredRoutes.map((route) => {
              const live = vehicleCounts.get(route.id) ?? 0;
              const alertCount =
                (routeAlertCounts.get(route.id) ?? 0) ||
                (routeAlertCounts.get(route.shortName) ?? 0);

              return (
                <button
                  type="button"
                  key={route.id}
                  className={classNames('route-row', selectedRouteId === route.id && 'active')}
                  onClick={() => onSelectRoute(route.id)}
                  title={route.longName || route.shortName}
                >
                  <RouteBadge route={route} />
                  <span className="route-row-text">
                    <span className="route-row-title">
                      {route.longName || `Route ${route.shortName}`}
                    </span>
                    <span className="route-row-sub">
                      {modeLabel(route.mode, route.type)}
                      {live > 0 ? ` · ${live} live` : ''}
                      {alertCount > 0 && (
                        <span className="alert-dot" title={`${alertCount} service alerts`} />
                      )}
                    </span>
                  </span>
                  {live > 0 && <span className="route-count">{live}</span>}
                </button>
              );
            })}
          </div>

          <div className="sidebar-footer">
            {routes.length} routes · {vehicles.length} vehicles tracked
          </div>
        </div>
      )}

      {tab === 'stops' && (
        <div className="tab-body">
          <div className="search-field">
            <Icon name="search" size={15} />
            <input
              type="search"
              value={stopQuery}
              onChange={(event) => setStopQuery(event.target.value)}
              placeholder="Search a stop name or code"
              aria-label="Search stops"
              spellCheck={false}
            />
            {stopQuery && (
              <button
                type="button"
                className="field-clear"
                onClick={() => setStopQuery('')}
                aria-label="Clear stop search"
              >
                <Icon name="close" size={13} />
              </button>
            )}
          </div>

          <div className="stops-toolbar">
            <span className="list-title">{stopListTitle}</span>
            <button
              type="button"
              className="ghost-button"
              onClick={findNearby}
              disabled={nearbyLoading || !networkReady}
            >
              <Icon name="locate" size={14} />
              {nearbyLoading ? 'Locating…' : 'Near map center'}
            </button>
          </div>

          <div className="list-scroll">
            {stopSearchLoading && <SkeletonRows count={5} />}

            {stopSearchError && (
              <div className="inline-error">
                <Icon name="alert" size={15} />
                <span>{stopSearchError}</span>
              </div>
            )}

            {nearbyError && (
              <div className="inline-error">
                <Icon name="alert" size={15} />
                <span>{nearbyError}</span>
              </div>
            )}

            {stopList.map((stop) => (
              <button
                type="button"
                key={stop.id}
                className={classNames('stop-row', selectedStopId === stop.id && 'active')}
                onClick={() => onSelectStop(stop)}
                title={stop.name}
              >
                <span className="stop-row-icon">
                  <Icon name={stop.isStation ? 'route' : 'stop'} size={15} />
                </span>
                <span className="stop-row-text">
                  <span className="stop-row-name">{stop.name}</span>
                  <span className="stop-row-meta">
                    Stop {stop.code || stop.id}
                    {stop.isStation ? ' · Station' : ''}
                    {typeof stop.distance === 'number' ? ` · ${stop.distance} m` : ''}
                  </span>
                </span>
                <Icon name="chevron" size={13} className="row-chevron" />
              </button>
            ))}

            {!stopSearchLoading && !stopSearchError && stopQuery.trim().length < 2 && stopList.length === 0 && (
              <div className="empty-state">
                <Icon name="stop" size={22} />
                <p>
                  {selectedRouteId
                    ? 'No stops reported for this route in the live feed yet.'
                    : 'Search for a stop, or use “Near map center” to see what is around the map.'}
                </p>
              </div>
            )}

            {stopQuery.trim().length >= 2 && !stopSearchLoading && stopList.length === 0 && (
              <div className="empty-state">
                <Icon name="search" size={20} />
                <p>No stops found for “{stopQuery}”.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'alerts' && (
        <div className="tab-body">
          <div className="alerts-toolbar">
            <span className="list-title">
              {filteredAlerts.length} notice{filteredAlerts.length === 1 ? '' : 's'}
              {selectedRoute ? ` · route ${selectedRoute.shortName}` : ''}
            </span>
            <div className="scope-toggle" role="group" aria-label="Alert scope">
              <button
                type="button"
                className={classNames(alertScope === 'route' && 'active')}
                onClick={() => setAlertScope('route')}
              >
                Route
              </button>
              <button
                type="button"
                className={classNames(alertScope === 'all' && 'active')}
                onClick={() => setAlertScope('all')}
              >
                All
              </button>
            </div>
          </div>

          <div className="alerts-scroll">
            {selectedRoute && (
              <div className="filter-note">
                Filtered to route {selectedRoute.shortName}
                <button type="button" onClick={() => onSelectRoute(null)}>
                  Clear
                </button>
              </div>
            )}

            {filteredAlerts.length === 0 && (
              <div className="empty-state">
                <Icon name="alert" size={20} />
                <p>No service notices match this filter.</p>
              </div>
            )}

            {filteredAlerts.slice(0, alertLimit).map((alert) => (
              <details className="alert-card" key={alert.id}>
                <summary>
                  <div className="alert-summary-top">
                    <span className={classNames('alert-level', alert.level)}>
                      {alert.level === 'stop' ? 'Stop notice' : 'Route notice'}
                    </span>
                    <span className="alert-routes">
                      {alert.routes.slice(0, 4).map((route) => (
                        <span className="mini-route" key={route}>
                          {route}
                        </span>
                      ))}
                      {alert.routes.length > 4 && (
                        <span className="mini-route">+{alert.routes.length - 4}</span>
                      )}
                    </span>
                  </div>
                  <span className="alert-title">{alert.header}</span>
                  <span className="alert-snippet">{alert.description}</span>
                </summary>
                <p className="alert-body">{alert.description}</p>
                <div className="alert-footer">
                  <span>
                    <Icon name="clock" size={12} />
                    {formatAlertWindow(alert.start, alert.end, nowSeconds)}
                  </span>
                  {alert.stops.length > 0 && (
                    <span>
                      {alert.stops.length} stop{alert.stops.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </details>
            ))}

            {filteredAlerts.length > alertLimit && (
              <button
                type="button"
                className="load-more"
                onClick={() => setAlertLimit((value) => value + 40)}
              >
                Show more notices
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-row" key={index}>
          <span className="skeleton-badge" />
          <span className="skeleton-lines">
            <span className="skeleton-line wide" />
            <span className="skeleton-line" />
          </span>
        </div>
      ))}
    </div>
  );
}
