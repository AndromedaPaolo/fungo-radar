import type { Habitat, SpeciesId, TreeKind } from "./types";

export type SpeciesProfile = {
  id: SpeciesId;
  commonName: string;
  latinName: string;
  color: string;
  seasonMonths: number[];
  habitats: Habitat[];
  /** Boschi in cui la specie nasce davvero. Solo commestibili in questo elenco. */
  treeKinds: TreeKind[];
  likesEdge: boolean;
  elevation: [number, number];
  /** Giorni tipici dalla pioggia-innesco alla fruttificazione */
  lagDays: [number, number];
  soilTemp: [number, number];
  airTemp: [number, number];
  /** Pioggia 7 giorni ottimale (mm) */
  rain7d: [number, number];
  /** Umidità volumetrica suolo 0-7 cm */
  soilMoisture: [number, number];
  windPenaltyKmh: number;
  notes: string;
};

export const SPECIES: Record<SpeciesId, SpeciesProfile> = {
  porcini: {
    id: "porcini",
    commonName: "Porcini",
    latinName: "Boletus edulis / aestivalis",
    color: "#c45c26",
    seasonMonths: [5, 6, 8, 9, 10, 11],
    habitats: ["faggio", "quercia", "castagno", "conifera", "misto"],
    treeKinds: ["castagno", "faggio", "abete", "pino", "roverella", "cerro", "misto"],
    likesEdge: false,
    elevation: [350, 1800],
    lagDays: [6, 12],
    soilTemp: [11, 19],
    airTemp: [10, 22],
    rain7d: [18, 55],
    soilMoisture: [0.22, 0.36],
    windPenaltyKmh: 32,
    notes:
      "Micorrizico. Cerca la pioggia-innesco (20–40 mm) dopo un periodo più asciutto, poi 2–4 giorni più miti senza vento forte.",
  },
  colombine: {
    id: "colombine",
    commonName: "Colombine",
    latinName: "Amanita vaginata",
    color: "#d9d2c5",
    seasonMonths: [6, 7, 8, 9, 10],
    habitats: ["faggio", "quercia", "misto", "castagno"],
    treeKinds: ["castagno", "faggio", "roverella", "cerro", "misto"],
    likesEdge: false,
    elevation: [200, 1600],
    lagDays: [5, 10],
    soilTemp: [12, 22],
    airTemp: [12, 24],
    rain7d: [15, 50],
    soilMoisture: [0.2, 0.35],
    windPenaltyKmh: 36,
    notes:
      "Commestibile, ma si confonde con Amanita mortali. Raccogli solo esemplari adulti e certi.",
  },
  russole: {
    id: "russole",
    commonName: "Russole",
    latinName: "Russula spp. commestibili (cyanoxantha, virescens, vesca…)",
    color: "#e25c6a",
    seasonMonths: [6, 7, 8, 9, 10, 11],
    habitats: ["faggio", "quercia", "castagno", "conifera", "misto"],
    treeKinds: ["castagno", "faggio", "abete", "pino", "roverella", "cerro", "misto"],
    likesEdge: false,
    elevation: [150, 1700],
    lagDays: [3, 7],
    soilTemp: [10, 24],
    airTemp: [10, 26],
    rain7d: [12, 60],
    soilMoisture: [0.2, 0.38],
    windPenaltyKmh: 40,
    notes:
      "Solo le specie dolci: assaggia un frammento e scarta se piccante. Le acre non sono da tavola.",
  },
  galletti: {
    id: "galletti",
    commonName: "Galletti",
    latinName: "Cantharellus cibarius",
    color: "#e8a317",
    seasonMonths: [6, 7, 8, 9, 10],
    habitats: ["faggio", "quercia", "conifera", "misto"],
    treeKinds: ["faggio", "abete", "pino", "roverella", "cerro", "misto"],
    likesEdge: false,
    elevation: [400, 1600],
    lagDays: [10, 18],
    soilTemp: [12, 20],
    airTemp: [12, 22],
    rain7d: [20, 70],
    soilMoisture: [0.24, 0.38],
    windPenaltyKmh: 30,
    notes:
      "Vogliono umidità continua, non un temporale isolato. Muschio, faggio e aghifoglie su suoli non saturi.",
  },
  mazze: {
    id: "mazze",
    commonName: "Mazze di tamburo",
    latinName: "Macrolepiota procera",
    color: "#8b5a2b",
    seasonMonths: [7, 8, 9, 10],
    habitats: ["pascolo", "misto", "quercia", "macchia"],
    treeKinds: ["pascolo", "macchia", "leccio", "roverella", "misto"],
    likesEdge: true,
    elevation: [0, 1200],
    lagDays: [4, 9],
    soilTemp: [15, 26],
    airTemp: [16, 27],
    rain7d: [10, 40],
    soilMoisture: [0.16, 0.3],
    windPenaltyKmh: 38,
    notes:
      "Prati, radure e orli del bosco. Non amano il ristagno: dopo il temporale servono un paio di giornate asciutte.",
  },
};

export const SPECIES_LIST = Object.values(SPECIES);

export function growsInTree(speciesId: SpeciesId, tree: TreeKind) {
  return SPECIES[speciesId].treeKinds.includes(tree);
}

export function ediblesInTree(tree: TreeKind) {
  return SPECIES_LIST.filter((species) => species.treeKinds.includes(tree));
}

export function ediblesInTrees(trees: TreeKind[]) {
  if (trees.length === 0) return SPECIES_LIST;
  return SPECIES_LIST.filter((species) =>
    trees.some((tree) => species.treeKinds.includes(tree)),
  );
}

export function edibleNamesForTree(tree: TreeKind) {
  return ediblesInTree(tree)
    .map((species) => species.commonName)
    .join(" · ");
}
