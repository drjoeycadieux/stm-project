export type Tab = 'routes' | 'stops' | 'alerts';

export type RouteMode = 'bus' | 'metro' | 'tram' | 'rail' | 'other';

export interface RouteInfo {
  id: string;
  shortName: string;
  longName: string;
  type: number;
  mode: RouteMode;
  color: string;
  textColor: string;
  description: string;
  url: string;
}

export interface StopInfo {
  id: string;
  code: string;
  name: string;
  lat: number;
  lon: number;
  accessible?: boolean;
  isStation?: boolean;
  distance?: number;
}

export type VehicleStatus = 'INCOMING_AT' | 'STOPPED_AT' | 'IN_TRANSIT_TO';

export interface Vehicle {
  id: string;
  label: string | null;
  tripId: string | null;
  routeId: string | null;
  routeShortName: string;
  routeLongName: string;
  routeColor: string;
  routeTextColor: string;
  routeMode: RouteMode;
  headsign: string;
  directionId: number | null;
  lat: number;
  lon: number;
  bearing: number | null;
  speedKmh: number | null;
  stopId: string | null;
  stopName: string | null;
  currentStopSequence: number | null;
  currentStatus: VehicleStatus;
  occupancy: string | null;
  wheelchair: string | null;
  timestamp: number;
  ageSeconds: number;
}

export interface TripStop {
  stopId: string | null;
  stopName: string | null;
  lat: number | null;
  lon: number | null;
  sequence: number | null;
  arrival: number | null;
  departure: number | null;
  time: number | null;
  delay: number | null;
  skipped: boolean;
  relationship: string;
  passed?: boolean;
}

export interface TripDetail {
  tripId: string;
  routeId: string | null;
  routeShortName: string;
  routeColor: string;
  routeTextColor: string;
  headsign: string;
  directionId: number | null;
  startDate: string | null;
  vehicleId: string | null;
  updatedAt: number | null;
  serverTime: number;
  shape: [number, number][] | null;
  vehicle: Vehicle | null;
  stops: TripStop[];
}

export interface Arrival {
  tripId: string;
  routeId: string | null;
  routeShortName: string;
  routeColor: string;
  routeTextColor: string;
  headsign: string;
  directionId: number | null;
  stopId: string;
  stopName: string | null;
  sequence: number | null;
  arrival: number | null;
  departure: number | null;
  time: number;
  delay: number | null;
  skipped: boolean;
  vehicleId: string | null;
  minutes: number;
}

export interface ServiceAlert {
  id: string;
  level: 'route' | 'stop';
  header: string;
  headerFr: string;
  description: string;
  descriptionFr: string;
  routes: string[];
  stops: string[];
  directions: string[];
  start: number | null;
  end: number | null;
}

export interface NetworkResponse {
  ready: boolean;
  loading: boolean;
  error: string | null;
  updatedAt: number | null;
  feedVersion: string | null;
  counts: {
    routes: number;
    stops: number;
    trips: number;
    shapes: number;
  };
  routes: RouteInfo[];
}

export interface VehiclesResponse {
  vehicles: Vehicle[];
  count: number;
  updatedAt: number;
  serverTime: number;
  fetchedAt: number;
}

export interface AlertsResponse {
  alerts: ServiceAlert[];
  count: number;
  routeAlertCount: number;
  stopAlertCount: number;
  updatedAt: number;
  serverTime: number;
}

export interface StopDetailResponse {
  stop: StopInfo | null;
  arrivals: Arrival[];
  serverTime: number;
}

export interface RouteStopsResponse {
  routeId: string;
  stops: StopInfo[];
}

export interface ShapeResponse {
  routeId: string;
  direction: number;
  points: [number, number][];
}
