import type { CSSProperties } from "react";

interface MapPoint {
  lat: number;
  lng: number;
}

interface MontrealMapProps {
  pickup: MapPoint;
  dropoff: MapPoint;
  /** Live driver position; rendered as a moving marker. */
  driver?: MapPoint | null;
  /** CSS-driven travel along the route, used for static previews. */
  animateCar?: boolean;
  travelSeconds?: number;
  className?: string;
}

/** Viewport covering the island of Montreal, Laval, and the South Shore. */
const BOUNDS = { latMin: 45.4, latMax: 45.62, lngMin: -73.86, lngMax: -73.44 };
const W = 1000;
const H = 560;

function project(point: MapPoint): { x: number; y: number } {
  return {
    x: ((point.lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * W,
    y: ((BOUNDS.latMax - point.lat) / (BOUNDS.latMax - BOUNDS.latMin)) * H,
  };
}

/** [lng, lat] pairs traced loosely around Montreal's landmasses. */
const ISLAND: [number, number][] = [
  [-73.83, 45.47],
  [-73.79, 45.53],
  [-73.72, 45.55],
  [-73.65, 45.56],
  [-73.58, 45.575],
  [-73.52, 45.56],
  [-73.49, 45.53],
  [-73.52, 45.5],
  [-73.545, 45.47],
  [-73.575, 45.45],
  [-73.65, 45.44],
  [-73.72, 45.445],
  [-73.79, 45.45],
];

const LAVAL: [number, number][] = [
  [-73.78, 45.58],
  [-73.68, 45.615],
  [-73.55, 45.62],
  [-73.5, 45.6],
  [-73.54, 45.565],
  [-73.65, 45.565],
  [-73.73, 45.555],
];

const SOUTH_SHORE: [number, number][] = [
  [-73.86, 45.42],
  [-73.75, 45.4],
  [-73.6, 45.4],
  [-73.44, 45.42],
  [-73.44, 45.3],
  [-73.86, 45.3],
];

const SMALL_ISLANDS: [number, number][][] = [
  // Nuns' Island
  [
    [-73.56, 45.44],
    [-73.53, 45.455],
    [-73.52, 45.44],
    [-73.545, 45.432],
  ],
  // Sainte-Hélène + Jean-Drapeau
  [
    [-73.535, 45.505],
    [-73.515, 45.52],
    [-73.5, 45.512],
    [-73.52, 45.497],
  ],
  // Bizard
  [
    [-73.73, 45.585],
    [-73.69, 45.6],
    [-73.67, 45.585],
    [-73.7, 45.572],
  ],
];

function polygonPath(coords: [number, number][]): string {
  return (
    coords
      .map(([lng, lat], index) => {
        const { x, y } = project({ lat, lng });
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ") + " Z"
  );
}

/**
 * An illustrative map of Montreal used for trip previews and live tracking.
 * Decorative only — it is not a navigational map.
 */
export function MontrealMap({
  pickup,
  dropoff,
  driver,
  animateCar = false,
  travelSeconds = 45,
  className = "",
}: MontrealMapProps) {
  const start = project(pickup);
  const end = project(dropoff);
  const car = driver ? project(driver) : null;
  const routePath = `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-ink-100 bg-ice-50 ${className}`}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full"
        role="img"
        aria-label="Map of Montreal"
      >
        <defs>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d8e8f7" />
            <stop offset="100%" stopColor="#c5dcf2" />
          </linearGradient>
          <linearGradient id="land" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#eef2f6" />
            <stop offset="100%" stopColor="#e3e9f0" />
          </linearGradient>
        </defs>

        <rect width={W} height={H} fill="url(#water)" />

        <path d={polygonPath(SOUTH_SHORE)} fill="url(#land)" opacity="0.85" />
        <path d={polygonPath(LAVAL)} fill="url(#land)" opacity="0.9" />
        <path d={polygonPath(ISLAND)} fill="url(#land)" />
        {SMALL_ISLANDS.map((island, index) => (
          <path key={index} d={polygonPath(island)} fill="url(#land)" />
        ))}

        {/* Major roads: the 40, the 20, and Saint-Laurent */}
        <g stroke="#cfd8e4" strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M 95 250 C 300 205, 520 195, 900 235" />
          <path d="M 120 385 C 330 420, 560 400, 880 320" />
          <path d="M 470 120 C 455 240, 430 330, 400 470" />
        </g>
        <g stroke="#dbe3ed" strokeWidth="1.5" fill="none">
          <path d="M 200 300 L 760 285" />
          <path d="M 300 160 L 350 450" />
          <path d="M 600 150 L 640 430" />
          <path d="M 700 200 L 500 430" />
        </g>

        {/* Route */}
        <path
          d={routePath}
          stroke="var(--color-brand-500)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="14 12"
          fill="none"
          opacity="0.9"
        />

        {/* Pickup */}
        <g>
          <circle
            cx={start.x}
            cy={start.y}
            r="14"
            fill="var(--color-brand-500)"
            opacity="0.25"
            className="pulse-ring"
          />
          <circle
            cx={start.x}
            cy={start.y}
            r="8"
            fill="white"
            stroke="var(--color-brand-600)"
            strokeWidth="4"
          />
        </g>

        {/* Drop-off */}
        <g>
          <path
            d={`M ${end.x} ${end.y - 26} c -8 0 -14 6 -14 14 0 10 14 22 14 22 s 14 -12 14 -22 c 0 -8 -6 -14 -14 -14 Z`}
            fill="var(--color-ink-950)"
          />
          <circle cx={end.x} cy={end.y - 12} r="4.5" fill="white" />
        </g>

        {/* Driver */}
        {car && !animateCar && (
          <g transform={`translate(${car.x - 13}, ${car.y - 13})`}>
            <circle cx="13" cy="13" r="13" fill="var(--color-ink-950)" opacity="0.92" />
            <circle cx="13" cy="13" r="5" fill="var(--color-brand-400)" />
          </g>
        )}
      </svg>

      {animateCar && (
        <div
          className="car-marker absolute top-0 left-0 h-6 w-6"
          style={
            {
              "--route-path": `path("${routePath}")`,
              "--travel-duration": `${travelSeconds}s`,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 drop-shadow">
            <circle cx="12" cy="12" r="11" fill="var(--color-ink-950)" opacity="0.92" />
            <circle cx="12" cy="12" r="4.5" fill="var(--color-brand-400)" />
          </svg>
        </div>
      )}
    </div>
  );
}
