import type { SpeciesId, TreeKind } from "./types";
import { SPECIES } from "./species";

export type Taxon = {
  id: string;
  group: SpeciesId;
  commonName: string;
  latinName: string;
  treeKinds: TreeKind[];
  likesEdge?: boolean;
};

const C = "castagno" satisfies TreeKind;
const F = "faggio" satisfies TreeKind;
const A = "abete" satisfies TreeKind;
const P = "pino" satisfies TreeKind;
const R = "roverella" satisfies TreeKind;
const L = "leccio" satisfies TreeKind;
const E = "cerro" satisfies TreeKind;
const M = "misto" satisfies TreeKind;
const K = "macchia" satisfies TreeKind;
const G = "pascolo" satisfies TreeKind;

/** Specie commestibili, sottocategorie dei gruppi chiesti. Niente acre né tossiche. */
export const TAXA: Taxon[] = [
  // Porcini
  {
    id: "b-edulis",
    group: "porcini",
    commonName: "Porcino di faggio",
    latinName: "Boletus edulis",
    treeKinds: [F, A, P, M],
  },
  {
    id: "b-aestivalis",
    group: "porcini",
    commonName: "Porcino estatino",
    latinName: "Boletus aestivalis",
    treeKinds: [C, R, E, F, M],
  },
  {
    id: "b-aereus",
    group: "porcini",
    commonName: "Porcino nero",
    latinName: "Boletus aereus",
    treeKinds: [C, R, E, L, M],
  },
  {
    id: "b-pinophilus",
    group: "porcini",
    commonName: "Porcino dei pini",
    latinName: "Boletus pinophilus",
    treeKinds: [P, A, F],
  },

  // Colombine (Amanita sez. Vaginatae) — commestibili, lookalike mortali
  {
    id: "a-vaginata",
    group: "colombine",
    commonName: "Colombina",
    latinName: "Amanita vaginata",
    treeKinds: [C, F, R, E, M],
  },
  {
    id: "a-fulva",
    group: "colombine",
    commonName: "Colombina fulva",
    latinName: "Amanita fulva",
    treeKinds: [C, F, M],
  },
  {
    id: "a-crocea",
    group: "colombine",
    commonName: "Colombina crocea",
    latinName: "Amanita crocea",
    treeKinds: [R, E, F, M],
  },
  {
    id: "a-ceciliae",
    group: "colombine",
    commonName: "Colombina di Cecilia",
    latinName: "Amanita ceciliae",
    treeKinds: [R, F, M],
  },

  // Russole dolci
  {
    id: "r-cyanoxantha",
    group: "russole",
    commonName: "Colombina verde",
    latinName: "Russula cyanoxantha",
    treeKinds: [C, F, R, E, M],
  },
  {
    id: "r-virescens",
    group: "russole",
    commonName: "Verdone",
    latinName: "Russula virescens",
    treeKinds: [C, R, E, F, M],
  },
  {
    id: "r-vesca",
    group: "russole",
    commonName: "Rossola buona",
    latinName: "Russula vesca",
    treeKinds: [C, F, R, E, M],
  },
  {
    id: "r-aurea",
    group: "russole",
    commonName: "Russula dorata",
    latinName: "Russula aurea",
    treeKinds: [F, R, E, M],
  },
  {
    id: "r-heterophylla",
    group: "russole",
    commonName: "Russula eterofilla",
    latinName: "Russula heterophylla",
    treeKinds: [R, E, M],
  },
  {
    id: "r-romellii",
    group: "russole",
    commonName: "Russula di Romell",
    latinName: "Russula romellii",
    treeKinds: [F],
  },
  {
    id: "r-mustelina",
    group: "russole",
    commonName: "Russula delle abetine",
    latinName: "Russula mustelina",
    treeKinds: [A],
  },
  {
    id: "r-integra",
    group: "russole",
    commonName: "Russula integra",
    latinName: "Russula integra",
    treeKinds: [P, A],
  },

  // Galletti e finferli commestibili
  {
    id: "c-cibarius",
    group: "galletti",
    commonName: "Galletto",
    latinName: "Cantharellus cibarius",
    treeKinds: [F, P, A, R, E, M],
  },
  {
    id: "c-pallens",
    group: "galletti",
    commonName: "Galletto pallido",
    latinName: "Cantharellus pallens",
    treeKinds: [F, R, E, M],
  },
  {
    id: "c-ferruginascens",
    group: "galletti",
    commonName: "Galletto ferruginoso",
    latinName: "Cantharellus ferruginascens",
    treeKinds: [R, E],
  },
  {
    id: "cr-lutescens",
    group: "galletti",
    commonName: "Finferla",
    latinName: "Craterellus lutescens",
    treeKinds: [P, A],
  },
  {
    id: "cr-tubaeformis",
    group: "galletti",
    commonName: "Galletto autunnale",
    latinName: "Craterellus tubaeformis",
    treeKinds: [P, A, F],
  },
  {
    id: "cr-cornucopioides",
    group: "galletti",
    commonName: "Trombetta dei morti",
    latinName: "Craterellus cornucopioides",
    treeKinds: [F, R, E, M],
  },

  // Mazze di tamburo
  {
    id: "m-procera",
    group: "mazze",
    commonName: "Mazza di tamburo",
    latinName: "Macrolepiota procera",
    treeKinds: [G, K, L, R, M],
    likesEdge: true,
  },
  {
    id: "m-mastoidea",
    group: "mazze",
    commonName: "Mazza minore",
    latinName: "Macrolepiota mastoidea",
    treeKinds: [G, K, R, M],
    likesEdge: true,
  },
  {
    id: "m-konradii",
    group: "mazze",
    commonName: "Mazza di Konrad",
    latinName: "Macrolepiota konradii",
    treeKinds: [G, K, M],
    likesEdge: true,
  },
];

export function taxaInTree(tree: TreeKind, group?: SpeciesId | "tutti") {
  return TAXA.filter(
    (taxon) =>
      taxon.treeKinds.includes(tree) &&
      (group == null || group === "tutti" || taxon.group === group),
  );
}

export function taxaInTrees(trees: TreeKind[], group?: SpeciesId | "tutti") {
  const pool = trees.length === 0 ? TAXA : TAXA.filter((taxon) => trees.some((t) => taxon.treeKinds.includes(t)));
  if (group == null || group === "tutti") return pool;
  return pool.filter((taxon) => taxon.group === group);
}

export function taxonById(id: string | null) {
  if (!id) return undefined;
  return TAXA.find((taxon) => taxon.id === id);
}

export function latinLine(tree: TreeKind, group?: SpeciesId | "tutti") {
  return taxaInTree(tree, group)
    .map((taxon) => taxon.latinName)
    .join(" · ");
}

export function groupedTaxa(trees: TreeKind[], group?: SpeciesId | "tutti") {
  const list = taxaInTrees(trees, group);
  const order = (Object.keys(SPECIES) as SpeciesId[]).filter((id) =>
    list.some((taxon) => taxon.group === id),
  );
  return order.map((id) => ({
    group: id,
    label: SPECIES[id].commonName,
    taxa: list.filter((taxon) => taxon.group === id),
  }));
}
