"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  CloudRain,
  Droplets,
  Leaf,
  MapPin,
  RefreshCw,
  Thermometer,
  Wind,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPECIES, SPECIES_LIST, ediblesInTrees, growsInTree } from "@/lib/species";
import { groupedTaxa, taxaInTree } from "@/lib/taxa";
import { AREAS, kmFromHome, type ZoneId } from "@/lib/geo";
import { daysLabel, formatWhen, probabilityColor, statusLabel } from "@/lib/format";
import { TREE_COLOR, TREE_KINDS, TREE_LABEL, treeKindOf } from "@/lib/trees";
import { isParianaSite } from "@/lib/hotspots";
import { mergeCatalogWithObservations } from "@/lib/stations";
import { ASPECT_LABEL, ASPECTS, clusterZones, type MapZone } from "@/lib/zones";
import type { Aspect, ForecastSnapshot, SpeciesId, TreeKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { StationFilter } from "./mushroom-map";

const MushroomMap = dynamic(
  () => import("./mushroom-map").then((mod) => mod.MushroomMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#e7efe4] text-sm text-[#4d5b52]">
        Carico la carta dei boschi…
      </div>
    ),
  },
);

export function Dashboard({
  initial,
  loadError,
}: {
  initial: ForecastSnapshot | null;
  loadError?: string | null;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [speciesFilter, setSpeciesFilter] = useState<SpeciesId | "tutti">("tutti");
  const [scope, setScope] = useState<"massa-carrara" | "italia">("massa-carrara");
  const [area, setArea] = useState<ZoneId>("tutte");
  const [minProb, setMinProb] = useState(20);
  const [stationFilter, setStationFilter] = useState<StationFilter>("tutte");
  const [treeKinds, setTreeKinds] = useState<TreeKind[]>([]);
  const [aspectFilter, setAspectFilter] = useState<Aspect | "tutti">("tutti");
  const [edgeFilter, setEdgeFilter] = useState<"tutti" | "orlo" | "dentro">("tutti");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [flyToId, setFlyToId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState(loadError ?? null);

  const scoped = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.sites
      .filter((site) => (scope === "italia" ? !site.site.local : site.site.local))
      .filter((site) => {
        if (area === "tutte") return true;
        if (area === "pariana-pasquilio") return isParianaSite(site.site);
        if (area === "hotspot-italia") return site.site.hotspot === "italia";
        return site.site.area === area;
      })
      .filter((site) => {
        if (treeKinds.length === 0) return true;
        return treeKinds.includes(treeKindOf(site.site));
      })
      .filter((site) => {
        if (aspectFilter === "tutti") return true;
        return (site.site.aspect ?? "E") === aspectFilter;
      })
      .filter((site) => {
        if (edgeFilter === "tutti") return true;
        if (edgeFilter === "orlo") return Boolean(site.site.edge);
        return !site.site.edge;
      })
      .filter((site) => {
        if (!query.trim()) return true;
        const kind = treeKindOf(site.site);
        const taxa = taxaInTree(kind)
          .map((taxon) => `${taxon.latinName} ${taxon.commonName}`)
          .join(" ");
        const blob = `${site.site.name} ${site.site.comune ?? ""} ${site.site.habitat} ${kind} ${taxa}`.toLowerCase();
        return blob.includes(query.trim().toLowerCase());
      });
  }, [snapshot, scope, area, query, treeKinds, aspectFilter, edgeFilter]);

  const zones = useMemo(() => {
    return clusterZones(scoped, speciesFilter).filter((zone) => zone.probability >= minProb);
  }, [scoped, speciesFilter, minProb]);

  const mapStations = useMemo(
    () => mergeCatalogWithObservations(snapshot?.stations),
    [snapshot],
  );

  const selected = zones.find((zone) => zone.id === selectedId) ?? null;
  const preview = zones.find((zone) => zone.id === (hoveredId ?? selectedId)) ?? selected;
  const inspectRef = useRef<(id: string | null) => void>(() => {});
  inspectRef.current = setHoveredId;
  const onInspect = useCallback((id: string | null) => {
    inspectRef.current(id);
  }, []);
  const onSelectFromMap = useCallback((id: string) => {
    setSelectedId(id);
    setHoveredId(id);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setMobileOpen(true);
    }
  }, []);

  const possibleEdibles = useMemo(() => ediblesInTrees(treeKinds), [treeKinds]);
  const mapTaxa = useMemo(() => groupedTaxa(treeKinds), [treeKinds]);

  function toggleTreeKind(id: TreeKind) {
    setTreeKinds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      if (next.length > 0) setMinProb(0);
      return next;
    });
  }

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/predictions", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Aggiornamento non riuscito");
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rete non disponibile");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <header className="z-20 border-b border-border/80 bg-[color-mix(in_oklch,var(--background)_88%,var(--primary)_12%)] px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-heading text-[11px] tracking-[0.28em] text-primary uppercase">
              Carta micologica · Massa-Carrara
            </p>
            <h1 className="font-heading text-3xl leading-none text-foreground md:text-4xl">
              Spora
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Un cerchio per frazione, tipo di bosco e versante — senza sovrapposizioni. Il colore
              è il bosco, l’opacità la probabilità.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-right text-xs text-muted-foreground">
            {snapshot ? (
              <>
                <span>Aggiornato {formatWhen(snapshot.generatedAt)}</span>
                <span>Prossimo giro: ogni giorno alle 00:00, ora di Roma</span>
              </>
            ) : (
              <span>Nessuna previsione in cache</span>
            )}
            <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
              {refreshing ? "Aggiorno…" : "Ricalcola ora"}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip
              active={scope === "massa-carrara"}
              onClick={() => {
                setScope("massa-carrara");
                setArea("tutte");
              }}
            >
              Massa-Carrara
            </FilterChip>
            <FilterChip
              active={scope === "italia"}
              onClick={() => {
                setScope("italia");
                setArea("tutte");
              }}
            >
              Tutta Italia
            </FilterChip>
            <Select
              value={area}
              onValueChange={(value) => {
                setArea(value as ZoneId);
                if (value === "pariana-pasquilio" || value === "hotspot-italia") setMinProb(0);
              }}
            >
              <SelectTrigger size="sm" className="min-w-44 bg-background">
                <SelectValue placeholder="Zona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutte">Tutte le zone</SelectItem>
                {scope === "massa-carrara" ? (
                  <>
                    <SelectItem value="pariana-pasquilio">Pariana–Pasquilio</SelectItem>
                    {AREAS.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </>
                ) : (
                  <SelectItem value="hotspot-italia">Boschi d’Italia</SelectItem>
                )}
              </SelectContent>
            </Select>
            <Select
              value={aspectFilter}
              onValueChange={(value) => setAspectFilter(value as Aspect | "tutti")}
            >
              <SelectTrigger size="sm" className="min-w-40 bg-background">
                <SelectValue placeholder="Versante" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti i versanti</SelectItem>
                {ASPECTS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={edgeFilter}
              onValueChange={(value) => setEdgeFilter(value as "tutti" | "orlo" | "dentro")}
            >
              <SelectTrigger size="sm" className="min-w-40 bg-background">
                <SelectValue placeholder="Frangente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Orlo e interno</SelectItem>
                <SelectItem value="orlo">Solo frangenti</SelectItem>
                <SelectItem value="dentro">Dentro il bosco</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={stationFilter}
              onValueChange={(value) => setStationFilter(value as StationFilter)}
            >
              <SelectTrigger size="sm" className="min-w-40 bg-background">
                <SelectValue placeholder="Stazioni" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutte">Stazioni tutte (Italia)</SelectItem>
                <SelectItem value="grandi">Solo grandi (Aeronautica Militare)</SelectItem>
                <SelectItem value="piccole">Solo piccole (crinali ICON-2I)</SelectItem>
                <SelectItem value="nessuna">Nascondi stazioni</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Funghi
            </p>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={speciesFilter === "tutti"}
                onClick={() => setSpeciesFilter("tutti")}
              >
                Tutti i gruppi
              </FilterChip>
              {SPECIES_LIST.map((species) => {
                const available = possibleEdibles.some((item) => item.id === species.id);
                return (
                  <FilterChip
                    key={species.id}
                    active={speciesFilter === species.id}
                    color={species.color}
                    dimmed={treeKinds.length > 0 && !available}
                    onClick={() => setSpeciesFilter(species.id)}
                  >
                    {species.commonName}
                  </FilterChip>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Tipo di bosco
            </p>
            <div className="flex flex-wrap gap-2">
              <FilterChip active={treeKinds.length === 0} onClick={() => setTreeKinds([])}>
                Tutti i boschi
              </FilterChip>
              {TREE_KINDS.map((row) => (
                <FilterChip
                  key={row.id}
                  active={treeKinds.includes(row.id)}
                  color={row.color}
                  onClick={() => toggleTreeKind(row.id)}
                >
                  {row.label}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca bosco, Boletus edulis, Russula cyanoxantha…"
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm md:w-64"
          />
          <div className="flex min-w-48 flex-1 items-center gap-3 md:max-w-sm">
            <span className="text-sm text-muted-foreground">Prob. min {minProb}%</span>
            <Slider
              value={[minProb]}
              min={0}
              max={80}
              step={5}
              onValueChange={(value) => setMinProb(value[0] ?? 20)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {zones.length} boschi
            {snapshot
              ? ` · ${snapshot.summary.sitesScanned} letti · ${mapStations.length} stazioni`
              : null}
          </p>
        </div>
      </header>

      {error ? (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_400px]">
        <section className="relative min-h-[52vh] lg:min-h-0">
          {snapshot ? (
            <>
            <MushroomMap
              zones={zones}
              selectedId={selectedId}
              flyToId={flyToId}
              scope={scope}
              stations={mapStations}
              stationFilter={stationFilter}
              onInspect={onInspect}
              onSelect={onSelectFromMap}
            />
            {preview ? (
              <div className="pointer-events-none absolute top-3 left-3 z-[1100] w-[min(calc(100%-1.5rem),22rem)] rounded-xl border border-border/80 bg-background/95 p-3 text-sm shadow-lg backdrop-blur">
                <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  {hoveredId && hoveredId !== selectedId ? "Sotto il cursore" : "Bosco selezionato"}
                </p>
                <p className="font-heading text-lg leading-tight">{preview.frazione}</p>
                <p className="text-xs text-muted-foreground">
                  {TREE_LABEL[preview.treeKind]} · {preview.edge ? "frangente" : "interno"} ·{" "}
                  {ASPECT_LABEL[preview.aspect]} · {preview.probability}%
                </p>
                <ul className="mt-2 space-y-0.5 text-xs">
                  {groupedTaxa(preview.treeKinds)
                    .slice(0, 5)
                    .map((row) => (
                      <li key={row.group}>
                        <span className="font-medium">{row.label}: </span>
                        <em>{row.taxa.map((taxon) => taxon.latinName).join(", ")}</em>
                      </li>
                    ))}
                </ul>
                <p className="mt-2 text-[11px] text-muted-foreground lg:hidden">
                  Tocca Elenco boschi per pioggia, suolo e giorni alla fuoriuscita.
                </p>
              </div>
            ) : (
              <div className="pointer-events-none absolute top-3 left-3 z-[1100] rounded-xl border border-border/80 bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur">
                Passa sul cerchio o sul puntino, oppure toccalo: qui compaiono frazione, bosco e
                specie.
              </div>
            )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <Leaf className="size-8 text-primary" />
              <p>La prima lettura meteo non è ancora disponibile.</p>
              <Button onClick={refresh}>Prova a scaricare i modelli</Button>
            </div>
          )}
          {treeKinds.length > 0 && mapTaxa.length > 0 ? (
            <div className="pointer-events-auto absolute top-3 right-3 z-[1000] max-h-[min(62vh,28rem)] w-[min(calc(100%-1.5rem),20rem)] overflow-auto rounded-xl border border-border/80 bg-background/95 p-3 text-xs shadow-lg backdrop-blur">
              <p className="mb-1 font-medium">
                Tutte le specie in{" "}
                {treeKinds.map((id) => TREE_LABEL[id].toLowerCase()).join(", ")}
              </p>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Elenco completo del bosco, non solo il gruppo scelto sopra.
              </p>
              <div className="space-y-2">
                {mapTaxa.map((row) => (
                  <div key={row.group}>
                    <p className="flex items-center gap-1.5 font-medium">
                      <i
                        className="inline-block size-2 rounded-full"
                        style={{ background: SPECIES[row.group].color }}
                      />
                      {row.label}
                    </p>
                    <ul className="mt-0.5 space-y-0.5 pl-3">
                      {row.taxa.map((taxon) => (
                        <li key={taxon.id}>
                          <em>{taxon.latinName}</em>
                          <span className="text-muted-foreground"> — {taxon.commonName}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex justify-between gap-2 lg:right-auto">
            <div className="max-w-[min(100%,42rem)] rounded-xl border border-border/80 bg-background/90 px-3 py-2 text-[11px] shadow-sm backdrop-blur">
              <p className="mb-1 font-medium">Colore = tipo di bosco · opacità = probabilità</p>
              <div className="flex flex-wrap gap-2">
                {TREE_KINDS.map((row) => (
                  <span key={row.id} className="flex items-center gap-1">
                    <i
                      className="inline-block size-2.5 rounded-full"
                      style={{ background: row.color }}
                    />
                    {row.label}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <i className="inline-block size-2.5 rounded-full" style={{ background: "#7eb6d9" }} />
                  Grandi · Aeronautica Militare
                </span>
                <span className="flex items-center gap-1">
                  <i className="inline-block size-2 rounded-full" style={{ background: "#d4b56a" }} />
                  Piccole · crinali e boschi ICON-2I
                </span>
              </p>
            </div>
            <Button
              className="pointer-events-auto lg:hidden"
              size="sm"
              onClick={() => setMobileOpen(true)}
            >
              Elenco boschi
            </Button>
          </div>
        </section>

        <aside className="hidden min-h-0 border-l border-border bg-card lg:flex lg:flex-col">
          <SiteColumn
            zones={zones}
            selected={selected}
            speciesFilter={speciesFilter}
            onSelect={(id) => {
              setSelectedId(id);
              setFlyToId(id);
            }}
          />
        </aside>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="bottom"
          className="flex !h-[78vh] max-h-[78vh] flex-col gap-0 overflow-hidden p-0 data-[side=bottom]:!h-[78vh]"
        >
          <SheetHeader className="shrink-0 px-4 pt-4 pb-2">
            <SheetTitle>Boschi e condizioni</SheetTitle>
          </SheetHeader>
          <SiteColumn
            zones={zones}
            selected={selected}
            speciesFilter={speciesFilter}
            onSelect={(id) => {
              setSelectedId(id);
              setFlyToId(id);
            }}
          />
        </SheetContent>
      </Sheet>

      <footer className="border-t border-border bg-background px-4 py-2 text-[11px] text-muted-foreground md:px-6">
        <p className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          Modello euristico, non una certezza. Non mangiare mai un fungo se non sei sicuro al
          cento per cento: le colombine si confondono con Amanita mortali. Rispetta divieti,
          proprietà private e i limiti di raccolta regionali.
        </p>
      </footer>
    </div>
  );
}

function FilterChip({
  active,
  color,
  dimmed,
  children,
  onClick,
}: {
  active: boolean;
  color?: string;
  dimmed?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors inline-flex items-center",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-muted",
        dimmed && !active && "opacity-40",
      )}
    >
      {color ? (
        <span
          className="mr-1.5 inline-block size-2 rounded-full"
          style={{ background: color }}
        />
      ) : null}
      {children}
    </button>
  );
}

function SiteColumn({
  zones,
  selected,
  speciesFilter,
  onSelect,
}: {
  zones: MapZone[];
  selected: MapZone | null;
  speciesFilter: SpeciesId | "tutti";
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ScrollArea className="min-h-40 max-h-[32%] shrink-0 border-b border-border lg:h-52 lg:max-h-none lg:flex-none">
        {zones.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">
            Nessun bosco con questi filtri. Cambia versante, tipo o abbassa la probabilità.
          </p>
        ) : (
          <ul>
            {zones.map((zone) => {
              const active = selected?.id === zone.id;
              return (
                <li key={zone.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(zone.id)}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/70",
                      active && "bg-muted",
                    )}
                  >
                    <span>
                      <span className="block font-medium">{zone.frazione}</span>
                      <span className="text-xs text-muted-foreground">
                        {TREE_LABEL[zone.treeKind]} · {zone.edge ? "frangente" : "interno"} ·{" "}
                        {ASPECT_LABEL[zone.aspect]} · {zone.elevationM} m
                      </span>
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                      style={{ background: probabilityColor(zone.probability) }}
                    >
                      {zone.probability}%
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
      {selected ? <SiteDetail zone={selected} speciesFilter={speciesFilter} /> : (
        <p className="px-4 py-8 text-sm text-muted-foreground">
          Tocca un cerchio sulla mappa, o un bosco in elenco, per vedere le specie e il meteo.
        </p>
      )}
    </div>
  );
}

function SiteDetail({
  zone,
  speciesFilter,
}: {
  zone: MapZone;
  speciesFilter: SpeciesId | "tutti";
}) {
  const site = zone.representative;
  const kinds = zone.treeKinds;
  const native = site.species.filter((row) =>
    kinds.some((kind) => growsInTree(row.speciesId, kind)),
  );
  const focus =
    speciesFilter === "tutti"
      ? [...native].sort((a, b) => b.probability - a.probability)[0] ?? site.species[0]
      : site.species.find((s) => s.speciesId === speciesFilter);
  const localTaxa = groupedTaxa(kinds);
  const woods = [...zone.named].sort((a, b) => b.bestProbability - a.bestProbability).slice(0, 14);

  return (
    <div className="min-h-64 flex-1 overflow-y-auto">
      <div className="space-y-4 p-4">
        <div>
          <p className="flex items-center gap-1 text-xs tracking-wide text-muted-foreground uppercase">
            <MapPin className="size-3.5" />
            Zona · {kmFromHome(zone.lat, zone.lon)} km da Massa
          </p>
          <h2 className="font-heading text-2xl">{zone.frazione}</h2>
          <p className="text-sm text-muted-foreground">
            {TREE_LABEL[zone.treeKind]} · {zone.edge ? "frangente" : "interno"} ·{" "}
            {ASPECT_LABEL[zone.aspect]} · {zone.elevationM} m
            {zone.comune ? ` · ${zone.comune}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge style={{ background: TREE_COLOR[zone.treeKind], color: "#fff" }}>
              {TREE_LABEL[zone.treeKind]}
            </Badge>
            <Badge variant="secondary">{zone.edge ? "Frangente" : "Interno"}</Badge>
            <Badge variant="secondary">{ASPECT_LABEL[zone.aspect]}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {localTaxa.map((row) => (
              <div key={row.group} className="rounded-lg border border-border/70 px-3 py-2">
                <p className="text-xs font-medium tracking-wide uppercase">
                  {row.label}
                  {site.species.find((s) => s.speciesId === row.group)
                    ? ` · ${site.species.find((s) => s.speciesId === row.group)?.probability}%`
                    : ""}
                </p>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {row.taxa.map((taxon) => (
                    <li key={taxon.id}>
                      <em>{taxon.latinName}</em>
                      <span className="text-muted-foreground"> — {taxon.commonName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {localTaxa.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessuna sottocategoria commestibile dell’elenco in questa zona.
              </p>
            ) : null}
          </div>
        </div>

        {woods.length > 0 ? (
          <div>
            <p className="text-xs font-medium tracking-wide uppercase">Frazioni vicine</p>
            <ul className="mt-1 space-y-1 text-sm">
              {woods.map((row) => (
                <li key={row.site.id} className="flex justify-between gap-2">
                  <span>
                    {row.site.name}
                    <span className="text-muted-foreground">
                      {" "}
                      · {TREE_LABEL[treeKindOf(row.site)]}
                    </span>
                  </span>
                  <span className="text-muted-foreground">{row.bestProbability}%</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Stat icon={CloudRain} label="Pioggia 7g" value={`${site.weather.precipConsensusMm} mm`} />
          <Stat icon={Droplets} label="Suolo 0–7 cm" value={site.weather.soilMoisture.toFixed(2)} />
          <Stat icon={Thermometer} label="Suolo" value={`${site.weather.soilTempC} °C`} />
          <Stat icon={Wind} label="Vento 3g" value={`${site.weather.windMax3dKmh} km/h`} />
        </div>
        <p className="text-xs text-muted-foreground">
          Consenso modelli {Math.round(site.weather.modelAgreement * 100)}% · bilancio idrico{" "}
          {site.weather.waterBalance7dMm} mm · umidità aria {site.weather.humidityMean}%
          {site.weather.nearestStationName
            ? ` · stazione ${site.weather.nearestStationName} (${site.weather.nearestStationKm} km)`
            : ""}
        </p>

        <Separator />

        <div className="flex flex-wrap gap-1.5">
          {site.species.map((item) => {
            const grows = kinds.some((kind) => growsInTree(item.speciesId, kind));
            return (
              <Badge
                key={item.speciesId}
                variant={item.speciesId === focus?.speciesId ? "default" : "secondary"}
                className={cn(!grows && "opacity-40")}
              >
                {SPECIES[item.speciesId].commonName} {grows ? `${item.probability}%` : "non nasce qui"}
              </Badge>
            );
          })}
        </div>

        {focus ? (
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground uppercase">{SPECIES[focus.speciesId].latinName}</p>
            <p className="font-heading text-xl">{SPECIES[focus.speciesId].commonName}</p>
            <p className="mt-1 text-sm">
              {statusLabel(focus.status)} · {daysLabel(focus.daysUntil, focus.status)} ·{" "}
              {focus.probability}%
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{SPECIES[focus.speciesId].notes}</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {focus.drivers.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs font-medium tracking-wide uppercase">Per alzare la probabilità</p>
            <ul className="mt-1 space-y-1.5 text-sm">
              {focus.levers.map((line) => (
                <li key={line} className="rounded-lg bg-background px-2 py-1.5">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Fonti: ICON-2I ItaliaMeteo 2 km, ICON, suolo ERA5-Land, stazioni AM di tutta Italia e
          nodi piccoli di crinale in tutte le regioni. Il cerchio è un bosco di una frazione, sul
          versante indicato. Non si sovrappone agli altri. Non è un GPS del fungo.
        </p>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CloudRain;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border px-3 py-2">
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
