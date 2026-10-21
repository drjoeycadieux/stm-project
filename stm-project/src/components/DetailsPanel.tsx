import type {
  Arrival,
  NetworkResponse,
  RouteInfo,
  ServiceAlert,
  StopInfo,
  Tab,
  TripDetail,
  Vehicle,
} from '../types';
import {
  classNames,
  delayLabel,
  etaLabel,
  formatAlertWindow,
  formatTime,
  modeLabel,
  occupancyLabel,
  relativeAge,
  vehicleStatusLabel,
} from '../utils';
import { Icon } from './Icon';
import { RouteBadge } from './RouteBadge';

interface DetailsPanelProps {
  selectedVehicle: Vehicle | null;
  selectedVehicleId: string | null;
  trip: TripDetail | null;
  tripError: string | null;
  selectedStop: StopInfo | null;
  arrivals: Arrival[] | null;
  arrivalsLoading: boolean;
  arrivalsError: string | null;
  selectedRoute: RouteInfo | null;
  vehicles: Vehicle[];
  alerts: ServiceAlert[];
  network: NetworkResponse | null;
  vehiclesUpdatedAt: number | null;
  follow: boolean;
  nowMs: number;
  onToggleFollow: () => void;
  onCloseVehicle: () => void;
  onCloseStop: () => void;
  onSelectRoute: (routeId: string | null) => void;
  onSelectVehicle: (vehicleId: string) => void;
  onTabChange: (tab: Tab) => void;
}

export function DetailsPanel(props: DetailsPanelProps) {
  const { selectedVehicle, selectedVehicleId, selectedStop, follow } = props;

  return (
    <aside className="details" aria-label="Live details">
      {selectedVehicle ? (
        <VehicleDetails {...props} vehicle={selectedVehicle} />
      ) : selectedVehicleId ? (
        <MissingVehicle onClose={props.onCloseVehicle} />
      ) : selectedStop ? (
        <StopDetails {...props} stop={selectedStop} />
      ) : (
        <Overview {...props} follow={follow} />
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Selected bus
// ---------------------------------------------------------------------------

interface VehicleDetailsProps extends DetailsPanelProps {
  vehicle: Vehicle;
}

function VehicleDetails({
  vehicle,
  trip,
  tripError,
  follow,
  nowMs,
  onToggleFollow,
  onCloseVehicle,
  onSelectRoute,
}: VehicleDetailsProps) {
  const nowSeconds = Math.floor(nowMs / 1000);
  const stops = trip?.stops ?? [];
  const upcoming = stops.filter((stop) => !stop.passed && !stop.skipped);
  const nextStop = upcoming.find((stop) => stop.time != null);
  const passed = stops.filter((stop) => stop.passed).length;
  const total = stops.length;
  const progress = total > 1 ? Math.min(100, Math.max(3, Math.round((passed / (total - 1)) * 100))) : 0;

  const route = {
    shortName: vehicle.routeShortName,
    color: vehicle.routeColor,
    textColor: vehicle.routeTextColor,
    mode: vehicle.routeMode,
    type: vehicle.routeMode === 'metro' ? 1 : 3,
  } as const;

  return (
    <div className="detail-body">
      <header className="detail-header vehicle-header">
        <RouteBadge route={route} size="lg" />
        <div className="detail-heading">
          <span className="eyebrow">Route {vehicle.routeShortName} · live</span>
          <h2>{vehicle.headsign || vehicle.routeLongName || 'In service'}</h2>
          <p className="muted">
            {vehicleStatusLabel(vehicle.currentStatus, vehicle.stopName)}
          </p>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onCloseVehicle}
          aria-label="Close vehicle details"
        >
          <Icon name="close" size={16} />
        </button>
      </header>

      <div className="status-strip">
        <span className="live-pill">
          <span className="live-dot" />
          Live
        </span>
        <span className="muted">Updated {relativeAge(vehicle.timestamp, nowMs)}</span>
        <span className="status-separator" />
        <span className="mono">Vehicle #{vehicle.id}</span>
      </div>

      <div className="next-stop-card">
        <div>
          <span className="eyebrow">Next stop</span>
          <strong className="next-stop-name">
            {nextStop?.stopName ?? (trip ? 'End of trip' : 'Loading schedule…')}
          </strong>
        </div>
        <div className="next-stop-eta">
          <strong>{nextStop?.time ? etaLabel(nextStop.time, nowSeconds) : '—'}</strong>
          <span>{formatTime(nextStop?.time)}</span>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <span>Speed</span>
          <strong>{vehicle.speedKmh == null ? '—' : `${vehicle.speedKmh} km/h`}</strong>
        </div>
        <div className="metric">
          <span>Occupancy</span>
          <strong>{occupancyLabel(vehicle.occupancy) ?? 'Unknown'}</strong>
        </div>
        <div className="metric">
          <span>Trip progress</span>
          <strong>{total ? `Stop ${Math.min(passed + 1, total)} / ${total}` : '—'}</strong>
        </div>
        <div className="metric">
          <span>Accessibility</span>
          <strong>
            {vehicle.wheelchair === 'WHEELCHAIR_ACCESSIBLE'
              ? 'Accessible'
              : vehicle.wheelchair === 'WHEELCHAIR_INACCESSIBLE'
                ? 'Not accessible'
                : 'Unknown'}
          </strong>
        </div>
      </div>

      {total > 0 && (
        <div className="progress-block">
          <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="progress-fill" style={{ width: `${progress}%`, backgroundColor: vehicle.routeColor }} />
          </div>
          <div className="progress-caption">
            <span>{passed} stop{passed === 1 ? '' : 's'} passed</span>
            <span>{Math.max(0, total - passed - 1)} remaining</span>
          </div>
        </div>
      )}

      <div className="detail-actions">
        <button
          type="button"
          className={classNames('primary-button', follow && 'is-active')}
          onClick={onToggleFollow}
          aria-pressed={follow}
        >
          <Icon name="locate" size={15} />
          {follow ? 'Following bus' : 'Follow bus'}
        </button>
        {vehicle.routeId && (
          <button
            type="button"
            className="secondary-button"
            onClick={() => onSelectRoute(vehicle.routeId)}
          >
            <Icon name="route" size={15} />
            Route {vehicle.routeShortName}
          </button>
        )}
      </div>

      <section className="panel-section">
        <div className="section-heading">
          <h3>Upcoming stops</h3>
          <span>{trip ? relativeAge(trip.updatedAt, nowMs) : 'live'}</span>
        </div>

        {!trip && !tripError && <SkeletonTimeline />}

        {tripError && (
          <div className="inline-error">
            <Icon name="alert" size={15} />
            <span>{tripError}</span>
          </div>
        )}

        {trip && upcoming.length === 0 && (
          <p className="muted small">This trip is at its final stop.</p>
        )}

        {upcoming.length > 0 && (
          <ol className="timeline">
            {upcoming.slice(0, 14).map((stop) => (
              <li
                className={classNames('timeline-row', stop.skipped && 'is-skipped')}
                key={`${stop.stopId}-${stop.sequence}`}
              >
                <span className="timeline-time">{formatTime(stop.time)}</span>
                <span className="timeline-marker">
                  <span className="timeline-dot" />
                </span>
                <span className="timeline-name">{stop.stopName || 'Stop'}</span>
                <span className="timeline-extra">
                  {stop.skipped ? 'Skipped' : delayLabel(stop.delay) ?? etaLabel(stop.time, nowSeconds)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="data-note">
        Schedule and positions from STM GTFS-Realtime. Times are predicted and may change.
      </p>
    </div>
  );
}

function MissingVehicle({ onClose }: { onClose: () => void }) {
  return (
    <div className="detail-body">
      <div className="empty-panel">
        <Icon name="bus" size={26} />
        <h2>Bus left the feed</h2>
        <p>This vehicle is no longer broadcasting a live position. Pick another bus on the map.</p>
        <button type="button" className="secondary-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selected stop
// ---------------------------------------------------------------------------

interface StopDetailsProps extends DetailsPanelProps {
  stop: StopInfo;
}

function StopDetails({
  stop,
  arrivals,
  arrivalsLoading,
  arrivalsError,
  alerts,
  nowMs,
  onCloseStop,
}: StopDetailsProps) {
  const nowSeconds = Math.floor(nowMs / 1000);
  const stopAlerts = alerts.filter(
    (alert) => alert.level === 'stop' && stop.code && alert.stops.includes(stop.code),
  );

  return (
    <div className="detail-body">
      <header className="detail-header">
        <div className="stop-header-icon">
          <Icon name={stop.isStation ? 'route' : 'stop'} size={18} />
        </div>
        <div className="detail-heading">
          <span className="eyebrow">Stop {stop.code || stop.id}</span>
          <h2>{stop.name}</h2>
          <p className="muted">
            {stop.isStation ? 'Station' : 'Bus stop'}
            {stop.accessible ? ' · Accessible' : ''}
          </p>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onCloseStop}
          aria-label="Close stop details"
        >
          <Icon name="close" size={16} />
        </button>
      </header>

      <div className="section-heading">
        <h3>Next departures</h3>
        <span className="live-pill subtle">
          <span className="live-dot" />
          Live
        </span>
      </div>

      {arrivalsLoading && !arrivals && <SkeletonTimeline rows={6} />}

      {arrivalsError && (
        <div className="inline-error">
          <Icon name="alert" size={15} />
          <span>{arrivalsError}</span>
        </div>
      )}

      {arrivals && arrivals.length === 0 && (
        <div className="empty-panel small">
          <Icon name="clock" size={22} />
          <p>No upcoming buses in the realtime feed for this stop right now.</p>
        </div>
      )}

      {arrivals && arrivals.length > 0 && (
        <div className="arrival-list">
          {arrivals.slice(0, 20).map((arrival) => (
            <div className="arrival-row" key={`${arrival.tripId}-${arrival.stopId}`}>
              <RouteBadge
                route={{
                  shortName: arrival.routeShortName,
                  color: arrival.routeColor,
                  textColor: arrival.routeTextColor,
                  mode: 'bus',
                  type: 3,
                }}
                size="md"
              />
              <div className="arrival-main">
                <span className="arrival-headsign">
                  {arrival.headsign || `Route ${arrival.routeShortName}`}
                </span>
                <span className="arrival-meta">
                  {arrival.delay != null
                    ? delayLabel(arrival.delay) ?? 'Scheduled'
                    : 'Scheduled'}
                  {arrival.vehicleId ? ` · Vehicle #${arrival.vehicleId}` : ''}
                </span>
              </div>
              <div className="arrival-eta">
                <strong>{etaLabel(arrival.time, nowSeconds)}</strong>
                <span>{formatTime(arrival.time)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {stopAlerts.length > 0 && (
        <section className="panel-section">
          <div className="section-heading">
            <h3>Stop notices</h3>
            <span>{stopAlerts.length}</span>
          </div>
          {stopAlerts.slice(0, 4).map((alert) => (
            <div className="stop-alert" key={alert.id}>
              <Icon name="alert" size={15} />
              <div>
                <strong>{alert.header}</strong>
                <p>{alert.description}</p>
                <span className="muted small">
                  {formatAlertWindow(alert.start, alert.end, nowSeconds)}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      <p className="data-note">
        Departures are read from the live STM GTFS-Realtime trip updates for this stop.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default overview
// ---------------------------------------------------------------------------

function Overview({
  selectedRoute,
  vehicles,
  alerts,
  network,
  vehiclesUpdatedAt,
  nowMs,
  onSelectRoute,
  onSelectVehicle,
  onTabChange,
}: DetailsPanelProps) {
  const activeRoutes = new Set(vehicles.map((vehicle) => vehicle.routeId).filter(Boolean));
  const routeAlerts = alerts.filter((alert) => alert.level === 'route');

  const counts = new Map<string, number>();
  for (const vehicle of vehicles) {
    if (!vehicle.routeId) continue;
    counts.set(vehicle.routeId, (counts.get(vehicle.routeId) ?? 0) + 1);
  }

  const topRoutes = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([routeId, count]) => ({
      routeId,
      count,
      sample: vehicles.find((vehicle) => vehicle.routeId === routeId),
    }))
    .filter((entry) => entry.sample);

  const maxCount = topRoutes[0]?.count ?? 1;
  const routeVehicles = selectedRoute
    ? vehicles.filter((vehicle) => vehicle.routeId === selectedRoute.id)
    : [];
  const routeAlertCount = selectedRoute
    ? alerts.filter(
        (alert) =>
          alert.routes.includes(selectedRoute.id) ||
          alert.routes.includes(selectedRoute.shortName),
      ).length
    : 0;
  const visibleAlerts = selectedRoute
    ? routeAlerts.filter(
        (alert) =>
          alert.routes.includes(selectedRoute.id) ||
          alert.routes.includes(selectedRoute.shortName),
      )
    : routeAlerts;

  return (
    <div className="detail-body overview">
      {selectedRoute && (
        <>
          <div className="route-focus">
            <RouteBadge route={selectedRoute} size="lg" />
            <div className="route-focus-text">
              <span className="eyebrow">{modeLabel(selectedRoute.mode, selectedRoute.type)}</span>
              <h2>{selectedRoute.longName || `Route ${selectedRoute.shortName}`}</h2>
              <p className="muted">
                {routeVehicles.length} live vehicle{routeVehicles.length === 1 ? '' : 's'}
                {routeAlertCount > 0 ? ` · ${routeAlertCount} notice${routeAlertCount === 1 ? '' : 's'}` : ''}
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => onSelectRoute(null)}
              aria-label="Clear route filter"
            >
              <Icon name="close" size={16} />
            </button>
          </div>

          {selectedRoute.description && (
            <p className="route-description">{selectedRoute.description}</p>
          )}

          <section className="panel-section">
            <div className="section-heading">
              <h3>Buses on this route</h3>
              <span>{routeVehicles.length} live</span>
            </div>

            {routeVehicles.length === 0 && (
              <p className="muted small">
                No vehicle is currently broadcasting for this route. Métro lines do not
                publish GPS positions in the STM feed.
              </p>
            )}

            {routeVehicles.slice(0, 8).map((vehicle) => (
              <button
                type="button"
                className="bus-list-row"
                key={vehicle.id}
                onClick={() => onSelectVehicle(vehicle.id)}
              >
                <span className="bus-list-status">
                  <span className="live-dot" />
                </span>
                <span className="bus-list-text">
                  <span>{vehicle.headsign || vehicle.routeLongName}</span>
                  <span>
                    Vehicle #{vehicle.id} · {vehicle.speedKmh ?? 0} km/h ·{' '}
                    {relativeAge(vehicle.timestamp, nowMs)}
                  </span>
                </span>
                <Icon name="chevron" size={14} />
              </button>
            ))}
          </section>
        </>
      )}

      {!selectedRoute && (
        <>
          <div className="hero-card">
            <span className="eyebrow">Live network</span>
            <h2>Montréal in motion</h2>
            <p>
              {vehicles.length} bus{vehicles.length === 1 ? '' : 'es'} tracked across{' '}
              {activeRoutes.size} route{activeRoutes.size === 1 ? '' : 's'} right now.
            </p>
            <div className="hero-pulse">
              <span className="live-dot" />
              <span>STM GTFS-Realtime</span>
              <span className="muted">· updated {relativeAge(vehiclesUpdatedAt, nowMs)}</span>
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat">
              <span>Buses live</span>
              <strong>{vehicles.length}</strong>
            </div>
            <div className="stat">
              <span>Routes active</span>
              <strong>{activeRoutes.size}</strong>
            </div>
            <div className="stat">
              <span>Route alerts</span>
              <strong>{routeAlerts.length}</strong>
            </div>
            <div className="stat">
              <span>Stops mapped</span>
              <strong>{network?.counts.stops ? network.counts.stops.toLocaleString('en-CA') : '—'}</strong>
            </div>
          </div>
        </>
      )}

      {!selectedRoute && (
        <section className="panel-section">
          <div className="section-heading">
            <h3>Busiest routes</h3>
            <span>live vehicles</span>
          </div>
          <div className="route-bars">
            {topRoutes.map(({ routeId, count, sample }) => (
              <button
                type="button"
                className="route-bar-row"
                key={routeId}
                onClick={() => sample && onSelectRoute(routeId)}
              >
                <RouteBadge
                  route={{
                    shortName: sample?.routeShortName ?? routeId,
                    color: sample?.routeColor ?? '#2DD4BF',
                    textColor: sample?.routeTextColor ?? '#04121A',
                    mode: sample?.routeMode ?? 'bus',
                    type: sample?.routeMode === 'metro' ? 1 : 3,
                  }}
                  size="sm"
                />
                <span className="route-bar-main">
                  <span className="route-bar-title">
                    {sample?.routeLongName || `Route ${sample?.routeShortName ?? routeId}`}
                  </span>
                  <span className="route-bar-track">
                    <span
                      className="route-bar-fill"
                      style={{
                        width: `${Math.max(8, (count / maxCount) * 100)}%`,
                        backgroundColor: sample?.routeColor ?? '#2DD4BF',
                      }}
                    />
                  </span>
                </span>
                <span className="route-bar-count">{count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="panel-section">
        <div className="section-heading">
          <h3>Service alerts</h3>
          <button type="button" className="link-button" onClick={() => onTabChange('alerts')}>
            View all
            <Icon name="arrow" size={13} />
          </button>
        </div>

        {visibleAlerts.slice(0, 3).map((alert) => (
          <div className="mini-alert" key={alert.id}>
            <Icon name="alert" size={14} />
            <div>
              <strong>{alert.header}</strong>
              <p>{alert.description}</p>
            </div>
          </div>
        ))}

        {visibleAlerts.length === 0 && (
          <p className="muted small">
            {selectedRoute
              ? 'No route-level service alerts for this route right now.'
              : 'No route-level service alerts right now.'}
          </p>
        )}
      </section>

      <section className="panel-section tips">
        <h3>How to use</h3>
        <ul>
          <li>Click any bus marker to see its live trip and upcoming stops.</li>
          <li>Search a stop to open its next-departure board.</li>
          <li>Filter by route to draw the route path and its stops on the map.</li>
        </ul>
      </section>

      <p className="data-note">
        Data: STM GTFS-Realtime &amp; static GTFS · Map tiles © OpenStreetMap, CARTO.
      </p>
    </div>
  );
}

function SkeletonTimeline({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
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
