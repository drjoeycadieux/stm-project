import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import type { RouteInfo, StopInfo, TripDetail, Vehicle } from '../types';
import { classNames, escapeHtml, formatTime } from '../utils';
import { Icon } from './Icon';

interface MapViewProps {
  vehicles: Vehicle[];
  routeStops: StopInfo[];
  trip: TripDetail | null;
  routeShape: [number, number][] | null;
  selectedRoute: RouteInfo | null;
  selectedVehicle: Vehicle | null;
  selectedStop: StopInfo | null;
  follow: boolean;
  loading: boolean;
  onSelectVehicle: (vehicleId: string) => void;
  onSelectStop: (stop: StopInfo) => void;
  onMove: (center: { lat: number; lng: number }) => void;
  onClearRoute: () => void;
}

const MONTREAL: L.LatLngExpression = [45.5088, -73.5878];

interface MarkerMeta {
  selected: boolean;
  color: string;
  headsign: string;
}

function busIcon(vehicle: Vehicle, selected: boolean): L.DivIcon {
  const label = escapeHtml(vehicle.routeShortName.slice(0, 4));
  const size = selected ? 36 : 27;
  const fontSize = label.length >= 4 ? 8 : label.length === 3 ? 9 : 11;
  const bearing =
    typeof vehicle.bearing === 'number' && Number.isFinite(vehicle.bearing)
      ? `<span class="bus-bearing" style="transform: rotate(${Math.round(vehicle.bearing)}deg)"></span>`
      : '';

  return L.divIcon({
    className: 'bus-marker',
    html: `<div class="bus-pin${selected ? ' selected' : ''}" style="--route-color:${vehicle.routeColor};--route-text:${vehicle.routeTextColor};width:${size}px;height:${size}px;font-size:${fontSize}px">${bearing}<span class="bus-label">${label}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function busTooltip(vehicle: Vehicle): string {
  const destination = vehicle.headsign || vehicle.routeLongName || '';
  const next = vehicle.stopName ? `<span class="bus-tooltip-next">→ ${escapeHtml(vehicle.stopName)}</span>` : '';
  return `<div class="bus-tooltip"><strong>${escapeHtml(vehicle.routeShortName)}</strong><span>${escapeHtml(destination)}</span>${next}</div>`;
}

function stopIcon(): L.DivIcon {
  return L.divIcon({
    className: 'stop-marker',
    html: '<span class="stop-pin"></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function MapView({
  vehicles,
  routeStops,
  trip,
  routeShape,
  selectedRoute,
  selectedVehicle,
  selectedStop,
  follow,
  loading,
  onSelectVehicle,
  onSelectStop,
  onMove,
  onClearRoute,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const vehicleLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  const stopLayerRef = useRef<L.LayerGroup | null>(null);
  const shapeLayerRef = useRef<L.LayerGroup | null>(null);
  const tripLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const metaRef = useRef(new WeakMap<L.Marker, MarkerMeta>());
  const callbacksRef = useRef({ onSelectVehicle, onSelectStop, onMove });
  callbacksRef.current = { onSelectVehicle, onSelectStop, onMove };

  const selectedVehicleId = selectedVehicle?.id ?? null;
  const selectedStopId = selectedStop?.id ?? null;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: MONTREAL,
      zoom: 11,
      zoomControl: false,
      preferCanvas: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Data ' +
        '<a href="https://www.stm.info/en/about/developers">STM</a>',
      subdomains: 'abc',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.attributionControl.setPrefix(
      '<a href="https://leafletjs.com" title="Leaflet">Leaflet</a>',
    );

    shapeLayerRef.current = L.layerGroup().addTo(map);
    stopLayerRef.current = L.layerGroup().addTo(map);
    tripLayerRef.current = L.layerGroup().addTo(map);

    const vehicleLayer = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 46,
      disableClusteringAtZoom: 14,
      spiderfyOnMaxZoom: true,
      chunkedLoading: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const size = count >= 100 ? 46 : count >= 30 ? 40 : 34;
        return L.divIcon({
          html: `<span>${count}</span><small>buses</small>`,
          className: 'bus-cluster',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });
    vehicleLayer.addTo(map);
    vehicleLayerRef.current = vehicleLayer;

    map.on('moveend', () => {
      const center = map.getCenter();
      callbacksRef.current.onMove({ lat: center.lat, lng: center.lng });
    });

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);

    mapRef.current = map;

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      vehicleLayerRef.current = null;
      stopLayerRef.current = null;
      shapeLayerRef.current = null;
      tripLayerRef.current = null;
      markersRef.current.clear();
      metaRef.current = new WeakMap();
    };
  }, []);

  // Live vehicles -----------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    const layer = vehicleLayerRef.current;
    if (!map || !layer) return;

    const markers = markersRef.current;
    const seen = new Set<string>();

    for (const vehicle of vehicles) {
      seen.add(vehicle.id);
      const selected = vehicle.id === selectedVehicleId;
      let marker = markers.get(vehicle.id);

      if (!marker) {
        marker = L.marker([vehicle.lat, vehicle.lon], {
          icon: busIcon(vehicle, selected),
          riseOnHover: true,
          keyboard: false,
          zIndexOffset: selected ? 1000 : 0,
          title: `${vehicle.routeShortName} — ${vehicle.headsign}`,
        });

        marker.on('click', () => callbacksRef.current.onSelectVehicle(vehicle.id));
        marker.bindTooltip(busTooltip(vehicle), {
          direction: 'top',
          offset: [0, -14],
          className: 'bus-tooltip-shell',
          opacity: 1,
        });
        layer.addLayer(marker);
        markers.set(vehicle.id, marker);
        metaRef.current.set(marker, {
          selected,
          color: vehicle.routeColor,
          headsign: vehicle.headsign,
        });
      } else {
        const meta = metaRef.current.get(marker) ?? {
          selected: false,
          color: '',
          headsign: '',
        };

        if (selected !== meta.selected || meta.color !== vehicle.routeColor) {
          marker.setIcon(busIcon(vehicle, selected));
          marker.setZIndexOffset(selected ? 1000 : 0);
          meta.selected = selected;
          meta.color = vehicle.routeColor;
        }

        if (meta.headsign !== vehicle.headsign) {
          marker.setTooltipContent(busTooltip(vehicle));
          meta.headsign = vehicle.headsign;
        }

        metaRef.current.set(marker, meta);
        marker.setLatLng([vehicle.lat, vehicle.lon]);
      }
    }

    for (const [id, marker] of markers) {
      if (!seen.has(id)) {
        layer.removeLayer(marker);
        markers.delete(id);
      }
    }
  }, [vehicles, selectedVehicleId]);

  // Route shape -------------------------------------------------------------
  useEffect(() => {
    const layer = shapeLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;

    layer.clearLayers();
    if (!routeShape || routeShape.length < 2) return;

    L.polyline(routeShape, {
      color: '#04121a',
      weight: 9,
      opacity: 0.55,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(layer);

    L.polyline(routeShape, {
      color: selectedRoute?.color ?? '#2DD4BF',
      weight: 5,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(layer);

    if (!selectedVehicleId && selectedRoute) {
      map.fitBounds(L.latLngBounds(routeShape), {
        padding: [42, 42],
        maxZoom: 14,
        animate: true,
      });
    }
  }, [routeShape, selectedRoute, selectedVehicleId]);

  // Selected trip: actual shape + upcoming stops ----------------------------
  useEffect(() => {
    const layer = tripLayerRef.current;
    if (!layer) return;

    layer.clearLayers();
    if (!trip) return;

    const points =
      trip.shape && trip.shape.length > 1
        ? trip.shape
        : trip.stops
            .filter((stop) => stop.lat != null && stop.lon != null)
            .map((stop) => [stop.lat as number, stop.lon as number] as [number, number]);

    if (points.length > 1) {
      L.polyline(points, {
        color: trip.routeColor,
        weight: 6,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layer);
    }

    for (const stop of trip.stops) {
      if (stop.lat == null || stop.lon == null || stop.passed || stop.skipped) continue;

      const dot = L.circleMarker([stop.lat, stop.lon], {
        radius: 4,
        color: '#061019',
        weight: 2,
        fillColor: trip.routeColor,
        fillOpacity: 1,
      });

      dot.bindTooltip(`${escapeHtml(stop.stopName ?? 'Stop')} · ${formatTime(stop.time)}`, {
        direction: 'top',
        offset: [0, -6],
        className: 'stop-tooltip-shell',
      });
      dot.on('click', () => {
        callbacksRef.current.onSelectStop({
          id: stop.stopId ?? `${trip.tripId}-${stop.sequence}`,
          code: '',
          name: stop.stopName ?? 'Stop',
          lat: stop.lat as number,
          lon: stop.lon as number,
        });
      });
      dot.addTo(layer);
    }
  }, [trip]);

  // Stops served by the selected route --------------------------------------
  useEffect(() => {
    const layer = stopLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    for (const stop of routeStops) {
      if (stop.id === selectedStopId) continue;

      const circle = L.circleMarker([stop.lat, stop.lon], {
        radius: 3,
        color: '#67E8F9',
        weight: 1,
        opacity: 0.4,
        fillColor: '#67E8F9',
        fillOpacity: 0.28,
      });

      circle.bindTooltip(escapeHtml(stop.name), {
        direction: 'top',
        offset: [0, -5],
        className: 'stop-tooltip-shell',
      });
      circle.on('click', () => callbacksRef.current.onSelectStop(stop));
      circle.addTo(layer);
    }

    if (selectedStop) {
      const marker = L.marker([selectedStop.lat, selectedStop.lon], {
        icon: stopIcon(),
        zIndexOffset: 900,
        keyboard: false,
      });
      marker.bindTooltip(escapeHtml(selectedStop.name), {
        permanent: true,
        direction: 'top',
        offset: [0, -14],
        className: 'selected-stop-label',
      });
      marker.on('click', () => callbacksRef.current.onSelectStop(selectedStop));
      marker.addTo(layer);
    }
  }, [routeStops, selectedStop, selectedStopId]);

  // Fly to a newly selected stop --------------------------------------------
  useEffect(() => {
    if (!selectedStop || !mapRef.current) return;
    mapRef.current.flyTo([selectedStop.lat, selectedStop.lon], Math.max(mapRef.current.getZoom(), 15), {
      duration: 0.7,
    });
  }, [selectedStop]);

  // Fly to a newly selected vehicle -----------------------------------------
  const lastFocusedVehicle = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedVehicleId) {
      lastFocusedVehicle.current = null;
      return;
    }
    if (lastFocusedVehicle.current === selectedVehicleId || !mapRef.current) return;

    const vehicle = vehicles.find((item) => item.id === selectedVehicleId);
    if (!vehicle) return;

    lastFocusedVehicle.current = selectedVehicleId;
    mapRef.current.flyTo(
      [vehicle.lat, vehicle.lon],
      Math.max(mapRef.current.getZoom(), 14),
      { duration: 0.8 },
    );
  }, [selectedVehicleId, vehicles]);

  // Follow a moving bus ------------------------------------------------------
  useEffect(() => {
    if (!follow || !selectedVehicle || !mapRef.current) return;
    const map = mapRef.current;
    const target = L.latLng(selectedVehicle.lat, selectedVehicle.lon);

    if (map.getZoom() < 13) {
      map.flyTo(target, 14, { duration: 0.8 });
    } else {
      map.panTo(target, { animate: true, duration: 0.5 });
    }
  }, [follow, selectedVehicle]);

  const recenter = () => {
    mapRef.current?.flyTo(MONTREAL, 11, { duration: 0.8 });
  };

  return (
    <section className="map-wrap" aria-label="Live map of Montréal buses">
      <div ref={containerRef} className="map-canvas" />

      <div className="map-overlay">
        <div className="map-badge">
          <span className={classNames('live-dot', loading && 'is-loading')} />
          {vehicles.length} bus{vehicles.length === 1 ? '' : 'es'} shown
        </div>

        {selectedRoute && (
          <div className="map-badge route-chip">
            <span className="route-chip-dot" style={{ backgroundColor: selectedRoute.color }} />
            <span>
              {selectedRoute.shortName} · {selectedRoute.longName || 'Route'}
            </span>
            <button type="button" onClick={onClearRoute} aria-label="Clear route filter">
              <Icon name="close" size={12} />
            </button>
          </div>
        )}

        {follow && selectedVehicle && (
          <div className="map-badge follow-chip">
            <span className="live-dot" />
            Following {selectedVehicle.routeShortName} · {selectedVehicle.id}
          </div>
        )}
      </div>

      <div className="map-actions">
        <button
          type="button"
          className="map-action"
          onClick={recenter}
          title="Recenter on Montréal"
          aria-label="Recenter on Montréal"
        >
          <Icon name="locate" size={17} />
        </button>
      </div>

      {loading && vehicles.length === 0 && (
        <div className="map-loading">
          <span className="spinner" />
          Connecting to STM…
        </div>
      )}
    </section>
  );
}
