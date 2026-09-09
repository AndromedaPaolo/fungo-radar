"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { HOME } from "@/lib/geo";
import { inMassaBbox, stationSizeOf } from "@/lib/stations";
import { groupedTaxa } from "@/lib/taxa";
import { SPECIES } from "@/lib/species";
import { TREE_COLOR, TREE_LABEL } from "@/lib/trees";
import type { SpeciesId, StationObservation } from "@/lib/types";
import type { MapZone } from "@/lib/zones";
import "leaflet/dist/leaflet.css";

export type StationFilter = "tutte" | "grandi" | "piccole" | "nessuna";

function zoneBounds(zone: MapZone) {
  const southWest = L.latLng(zone.lat, zone.lon).toBounds(zone.radiusM * 2);
  return southWest;
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

function StationPane() {
  const map = useMap();
  useEffect(() => {
    if (map.getPane("stations")) return;
    const pane = map.createPane("stations");
    pane.style.zIndex = "650";
  }, [map]);
  return null;
}

function FlyTo({ zone }: { zone: MapZone | null }) {
  const map = useMap();
  const prev = useRef<string | null>(null);
  useEffect(() => {
    if (!zone) return;
    if (prev.current === null) {
      prev.current = zone.id;
      return;
    }
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

export function MushroomMap({
  zones,
  selectedId,
  speciesFilter,
  scope,
  stations,
  stationFilter,
  onSelect,
}: {
  zones: MapZone[];
  selectedId: string | null;
  speciesFilter: SpeciesId | "tutti";
  scope: "massa-carrara" | "italia";
  stations: StationObservation[];
  stationFilter: StationFilter;
  onSelect: (id: string) => void;
}) {
  const drawOrder = [...zones].sort((a, b) => a.probability - b.probability);
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
      preferCanvas
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
        <Tooltip direction="right">Massa · casa</Tooltip>
      </CircleMarker>
      <StationPane />
      {drawOrder.map((zone) => {
        const color = TREE_COLOR[zone.treeKind];
        const selected = zone.id === selectedId;
        const taxa = groupedTaxa(zone.treeKinds, speciesFilter === "tutti" ? "tutti" : speciesFilter);
        const woods = groupedTaxa(zone.treeKinds);
        const fill = 0.16 + Math.min(zone.probability, 90) / 220;
        return (
          <Circle
            key={zone.id}
            center={[zone.lat, zone.lon]}
            radius={zone.radiusM}
            pathOptions={{
              color: selected ? "#1f2a24" : color,
              weight: selected ? 3 : 1.6,
              fillColor: color,
              fillOpacity: selected ? Math.min(fill + 0.12, 0.55) : fill,
            }}
            eventHandlers={{ click: () => onSelect(zone.id) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <div className="max-w-56">
                <div className="font-medium">{zone.frazione}</div>
                <span className="block text-xs opacity-80">
                  {TREE_LABEL[zone.treeKind]} · {zone.edge ? "frangente" : "interno"} ·{" "}
                  {zone.aspect} · {Math.round(zone.probability)}%
                </span>
                {woods.slice(0, 3).map((row) => (
                  <p key={row.group} className="mt-0.5 text-[11px] leading-snug">
                    <span className="opacity-70">{row.label}: </span>
                    {row.taxa.map((taxon) => taxon.latinName).join(", ")}
                  </p>
                ))}
              </div>
            </Tooltip>
            <Popup>
              <div className="max-h-64 overflow-auto text-sm">
                <p className="font-medium">{zone.frazione}</p>
                <p className="text-xs opacity-80">
                  {TREE_LABEL[zone.treeKind]} · {zone.edge ? "frangente" : "interno bosco"} ·{" "}
                  {zone.aspect} · {Math.round(zone.probability)}% · {zone.elevationM} m
                </p>
                {(speciesFilter === "tutti" ? woods : taxa).map((row) => (
                  <div key={row.group} className="mt-1.5">
                    <p className="text-xs font-medium" style={{ color: SPECIES[row.group].color }}>
                      {row.label}
                    </p>
                    <ul className="text-xs">
                      {row.taxa.map((taxon) => (
                        <li key={taxon.id}>
                          <em>{taxon.latinName}</em> — {taxon.commonName}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Popup>
          </Circle>
        );
      })}
      {visibleStations.map((station) => {
        const grande = stationSizeOf(station) === "grande";
        return (
          <CircleMarker
            key={`st-${station.id}`}
            center={[station.lat, station.lon]}
            radius={grande ? 8 : 5}
            pane="stations"
            bubblingMouseEvents={false}
            pathOptions={{
              color: "#1f2a24",
              weight: grande ? 2 : 1,
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
              <div className="text-sm">
                <p className="font-medium">{station.name}</p>
                <p className="text-xs opacity-80">
                  {grande ? "Stazione grande" : "Stazione piccola"} · {station.network}
                </p>
                <p className="mt-1 text-xs">
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
      <FitView zones={zones} scope={scope} />
      <FlyTo zone={zones.find((zone) => zone.id === selectedId) ?? null} />
    </MapContainer>
  );
}
