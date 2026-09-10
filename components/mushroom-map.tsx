"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { HOME } from "@/lib/geo";
import { inMassaBbox, stationSizeOf } from "@/lib/stations";
import { TREE_COLOR, TREE_LABEL } from "@/lib/trees";
import type { StationObservation } from "@/lib/types";
import type { MapZone } from "@/lib/zones";
import "leaflet/dist/leaflet.css";

export type StationFilter = "tutte" | "grandi" | "piccole" | "nessuna";

function zoneBounds(zone: MapZone) {
  return L.latLng(zone.lat, zone.lon).toBounds(zone.radiusM * 2);
}

function FitView({
  zones,
  scope,
}: {
  zones: MapZone[];
  scope: "massa-carrara" | "italia";
}) {
  const map = useMap();
  const key = `${scope}:${zones.length}:${zones[0]?.id ?? ""}`;

  useEffect(() => {
    if (scope === "italia" && zones.length > 8) {
      map.setView([42.5, 12.5], 6);
      return;
    }
    if (zones.length === 0) {
      map.setView([HOME.lat, HOME.lon], 11);
      return;
    }
    const bounds = L.latLngBounds([]);
    for (const zone of zones) {
      bounds.extend(zoneBounds(zone));
    }
    if (!bounds.isValid()) {
      map.setView([HOME.lat, HOME.lon], 11);
      return;
    }
    map.fitBounds(bounds.pad(0.12), {
      maxZoom: zones.length === 1 ? 12 : 11,
      animate: zones.length < 40,
      duration: 0.6,
    });
  }, [key, map, scope, zones]);

  return null;
}

function stationRadii(zoom: number) {
  if (zoom <= 6) return { grande: 7, piccola: 4.5 };
  if (zoom <= 8) return { grande: 7, piccola: 5 };
  return { grande: 8, piccola: 5 };
}

function StationMarkers({ stations }: { stations: StationObservation[] }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on("zoomend", onZoom);
    return () => {
      map.off("zoomend", onZoom);
    };
  }, [map]);

  const radii = stationRadii(zoom);

  return (
    <>
      {stations.map((station) => {
        const grande = stationSizeOf(station) === "grande";
        return (
          <CircleMarker
            key={`st-${station.id}`}
            center={[station.lat, station.lon]}
            radius={grande ? radii.grande : radii.piccola}
            pane="stations"
            bubblingMouseEvents={false}
            pathOptions={{
              color: "#1f2a24",
              weight: grande ? 2 : zoom <= 7 ? 1.5 : 1,
              fillColor: grande ? "#7eb6d9" : "#d4b56a",
              fillOpacity: 1,
            }}
            eventHandlers={{
              click: (event) => {
                L.DomEvent.stopPropagation(event.originalEvent);
              },
            }}
          >
            <Popup>
              <div className="wood-popup-body">
                <p className="wood-popup-title">{station.name}</p>
                <p>
                  {grande ? "Stazione grande" : "Stazione piccola"} · {station.network}
                </p>
                <p>
                  {station.precip7dMm != null ? `Pioggia 7g ${station.precip7dMm} mm` : "Pioggia n/d"}
                  {station.windMaxKmh != null ? ` · vento ${station.windMaxKmh} km/h` : ""}
                  {station.tempC != null ? ` · ${station.tempC} °C` : ""}
                  {station.humidity != null ? ` · umidità ${station.humidity}%` : ""}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

function StationPane() {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane("stations")) {
      const pane = map.createPane("stations");
      pane.style.zIndex = "650";
    }
    if (!map.getPane("woods")) {
      const pane = map.createPane("woods");
      pane.style.zIndex = "450";
    }
    if (!map.getPane("wood-hits")) {
      const pane = map.createPane("wood-hits");
      pane.style.zIndex = "460";
    }
  }, [map]);
  return null;
}

function FlyTo({ zone }: { zone: MapZone | null }) {
  const map = useMap();
  const prev = useRef<string | null>(null);
  useEffect(() => {
    if (!zone) return;
    if (prev.current === zone.id) return;
    prev.current = zone.id;
    map.fitBounds(zoneBounds(zone).pad(0.18), {
      maxZoom: 12,
      animate: true,
      duration: 0.7,
    });
  }, [map, zone]);
  return null;
}

const WoodCircle = memo(function WoodCircle({
  zone,
  selected,
  onInspect,
  onSelect,
}: {
  zone: MapZone;
  selected: boolean;
  onInspect: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const color = TREE_COLOR[zone.treeKind];
  const fill = 0.22 + Math.min(zone.probability, 90) / 180;
  const center = useMemo(() => [zone.lat, zone.lon] as [number, number], [zone.lat, zone.lon]);
  const leaveTimer = useRef<number>(0);

  const paint = useCallback(
    (layer: L.Path, hover: boolean) => {
      layer.setStyle({
        color: hover || selected ? "#f4efe4" : color,
        weight: hover ? 4 : selected ? 3 : 2,
        fillColor: color,
        fillOpacity: hover ? Math.min(fill + 0.22, 0.75) : selected ? Math.min(fill + 0.18, 0.62) : fill,
      });
    },
    [color, fill, selected],
  );

  const eventHandlers = useMemo(
    () => ({
      mouseover: (event: L.LeafletMouseEvent) => {
        window.clearTimeout(leaveTimer.current);
        event.target.bringToFront();
        paint(event.target, true);
        onInspect(zone.id);
      },
      mouseout: (event: L.LeafletMouseEvent) => {
        paint(event.target, false);
        window.clearTimeout(leaveTimer.current);
        leaveTimer.current = window.setTimeout(() => onInspect(null), 80);
      },
      click: (event: L.LeafletMouseEvent) => {
        window.clearTimeout(leaveTimer.current);
        L.DomEvent.stopPropagation(event.originalEvent);
        onInspect(zone.id);
        onSelect(zone.id);
      },
    }),
    [onInspect, onSelect, paint, zone.id],
  );

  const areaStyle = useMemo(
    () => ({
      color: selected ? "#f4efe4" : color,
      weight: selected ? 3 : 2,
      fillColor: color,
      fillOpacity: selected ? Math.min(fill + 0.18, 0.62) : fill,
      className: "wood-circle",
    }),
    [color, fill, selected],
  );

  const hitStyle = useMemo(
    () => ({
      color: "#1f2a24",
      weight: selected ? 2 : 1,
      fillColor: color,
      fillOpacity: 0.95,
      className: "wood-circle",
    }),
    [color, selected],
  );

  return (
    <>
      <Circle
        center={center}
        radius={zone.radiusM}
        pane="woods"
        pathOptions={areaStyle}
        eventHandlers={eventHandlers}
      />
      <CircleMarker
        center={center}
        radius={selected ? 11 : 9}
        pane="wood-hits"
        pathOptions={hitStyle}
        eventHandlers={eventHandlers}
      >
        <Popup className="wood-popup" closeButton>
          <div className="wood-popup-body">
            <p className="wood-popup-title">{zone.frazione}</p>
            <p>
              {TREE_LABEL[zone.treeKind]} · {zone.edge ? "frangente" : "interno"} · {zone.aspect} ·{" "}
              {Math.round(zone.probability)}%
            </p>
            <p>Dettaglio anche nella scheda in alto a sinistra.</p>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
});

export const MushroomMap = memo(function MushroomMap({
  zones,
  selectedId,
  flyToId,
  scope,
  stations,
  stationFilter,
  onInspect,
  onSelect,
}: {
  zones: MapZone[];
  selectedId: string | null;
  flyToId: string | null;
  scope: "massa-carrara" | "italia";
  stations: StationObservation[];
  stationFilter: StationFilter;
  onInspect: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const drawOrder = useMemo(
    () => [...zones].sort((a, b) => a.probability - b.probability),
    [zones],
  );
  const visibleStations = stations.filter((station) => {
    if (stationFilter === "nessuna") return false;
    const size = stationSizeOf(station);
    if (stationFilter === "grandi" && size !== "grande") return false;
    if (stationFilter === "piccole" && size !== "piccola") return false;
    if (scope === "massa-carrara") return inMassaBbox(station.lat, station.lon);
    return true;
  });

  return (
    <MapContainer
      center={[HOME.lat, HOME.lon]}
      zoom={11}
      minZoom={6}
      maxZoom={16}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution="&copy; OpenStreetMap · CARTO · meteo Open-Meteo"
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <CircleMarker
        center={[HOME.lat, HOME.lon]}
        radius={9}
        pathOptions={{ color: "#1f2a24", weight: 2, fillColor: "#f4efe4", fillOpacity: 1 }}
      >
        <Popup>
          <div className="wood-popup-body">
            <p className="wood-popup-title">Massa · casa</p>
          </div>
        </Popup>
      </CircleMarker>
      <StationPane />
      {drawOrder.map((zone) => (
        <WoodCircle
          key={zone.id}
          zone={zone}
          selected={zone.id === selectedId}
          onInspect={onInspect}
          onSelect={onSelect}
        />
      ))}
      <StationMarkers stations={visibleStations} />
      <FitView zones={zones} scope={scope} />
      <FlyTo zone={zones.find((zone) => zone.id === flyToId) ?? null} />
    </MapContainer>
  );
});
