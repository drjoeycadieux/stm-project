const TIME_ZONE = 'America/Toronto';

const timeFormatter = new Intl.DateTimeFormat('en-CA', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: TIME_ZONE,
});

const shortDateFormatter = new Intl.DateTimeFormat('en-CA', {
  month: 'short',
  day: 'numeric',
  timeZone: TIME_ZONE,
});

const weekdayFormatter = new Intl.DateTimeFormat('en-CA', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: TIME_ZONE,
});

export function formatTime(unix: number | null | undefined): string {
  if (typeof unix !== 'number' || !Number.isFinite(unix)) return '—';
  return timeFormatter.format(new Date(unix * 1000));
}

export function formatShortDate(unix: number | null | undefined): string {
  if (typeof unix !== 'number' || !Number.isFinite(unix)) return '—';
  return shortDateFormatter.format(new Date(unix * 1000));
}

export function formatClock(date: Date): string {
  return timeFormatter.format(date);
}

export function formatAlertWindow(start: number | null, end: number | null, nowSeconds: number): string {
  const parts: string[] = [];
  if (start) {
    parts.push(start > nowSeconds + 300 ? `Starts ${weekdayFormatter.format(new Date(start * 1000))}` : `Since ${shortDateFormatter.format(new Date(start * 1000))}`);
  }
  if (end) {
    parts.push(`until ${weekdayFormatter.format(new Date(end * 1000))}`);
  }
  return parts.join(' · ') || 'Ongoing';
}

export function relativeAge(updatedAt: number | null | undefined, nowMs: number): string {
  if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt)) return 'waiting';
  const seconds = Math.max(0, Math.floor(nowMs / 1000 - updatedAt));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function etaLabel(time: number | null | undefined, nowSeconds: number): string {
  if (!time) return '—';
  const minutes = Math.round((time - nowSeconds) / 60);
  if (minutes <= 0) return 'Due';
  if (minutes === 1) return '1 min';
  return `${minutes} min`;
}

export function delayLabel(delay: number | null | undefined): string | null {
  if (delay == null || !Number.isFinite(delay)) return null;
  const minutes = Math.round(delay / 60);
  if (minutes === 0) return 'On time';
  return minutes > 0 ? `+${minutes} min` : `${minutes} min`;
}

export function occupancyLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const labels: Record<string, string> = {
    EMPTY: 'Empty',
    MANY_SEATS_AVAILABLE: 'Many seats',
    FEW_SEATS_AVAILABLE: 'Few seats',
    STANDING_ROOM_ONLY: 'Standing room',
    CRUSHED_STANDING_ROOM_ONLY: 'Crush load',
    FULL: 'Full',
    NOT_ACCEPTING_PASSENGERS: 'Not boarding',
    NO_DATA_AVAILABLE: 'No data',
    NOT_BOARDABLE: 'Not boardable',
  };
  return labels[value] ?? value.replaceAll('_', ' ').toLowerCase();
}

export function vehicleStatusLabel(
  status: string | null | undefined,
  stopName: string | null | undefined,
): string {
  if (!stopName) return 'Live position';
  switch (status) {
    case 'STOPPED_AT':
      return `At ${stopName}`;
    case 'INCOMING_AT':
      return `Arriving at ${stopName}`;
    default:
      return `En route to ${stopName}`;
  }
}

export function modeLabel(mode: string, type: number): string {
  if (mode === 'metro') return 'Métro';
  if (mode === 'bus') return 'Bus';
  if (mode === 'tram') return 'Tram';
  if (mode === 'rail') return 'Rail';
  return `Mode ${type}`;
}

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
