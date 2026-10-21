import { classNames, formatClock, relativeAge } from '../utils';
import { Icon } from './Icon';

interface HeaderProps {
  vehicleCount: number;
  routeCount: number;
  alertCount: number;
  updatedAt: number | null;
  nowMs: number;
  loading: boolean;
  hasError: boolean;
  onRefresh: () => void;
}

export function Header({
  vehicleCount,
  routeCount,
  alertCount,
  updatedAt,
  nowMs,
  loading,
  hasError,
  onRefresh,
}: HeaderProps) {
  const ageSeconds =
    updatedAt == null ? Number.POSITIVE_INFINITY : Math.max(0, nowMs / 1000 - updatedAt);
  const isStale = ageSeconds > 90;

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">
          <Icon name="bus" size={19} />
        </span>
        <div className="brand-text">
          <h1>
            STM<span>Live</span>
          </h1>
          <p>Montréal transit dashboard</p>
        </div>
      </div>

      <div className="top-stats">
        <div className="top-stat">
          <strong>{vehicleCount}</strong>
          <span>buses live</span>
        </div>
        <span className="top-stat-divider" />
        <div className="top-stat">
          <strong>{routeCount}</strong>
          <span>routes active</span>
        </div>
        <span className="top-stat-divider" />
        <div className="top-stat">
          <strong>{alertCount}</strong>
          <span>route alerts</span>
        </div>
      </div>

      <div className="top-actions">
        <span
          className={classNames('feed-status', isStale && 'is-stale', hasError && 'is-offline')}
          title={hasError ? 'Last refresh failed' : 'STM realtime feed status'}
        >
          <span className={classNames('live-dot', (isStale || hasError) && 'is-stale')} />
          {hasError
            ? 'Feed issue'
            : loading && updatedAt == null
              ? 'Connecting…'
              : `Updated ${relativeAge(updatedAt, nowMs)}`}
        </span>

        <button
          type="button"
          className={classNames('icon-button refresh-button', loading && 'is-spinning')}
          onClick={onRefresh}
          aria-label="Refresh live data"
          title="Refresh live data"
        >
          <Icon name="refresh" size={16} />
        </button>

        <span className="header-clock" title="Current time in Montréal">
          {formatClock(new Date(nowMs))}
          <small>MTL</small>
        </span>
      </div>
    </header>
  );
}
