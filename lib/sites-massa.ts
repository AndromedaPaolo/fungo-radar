import type { LocalRow } from "./sites-massa-a";
import { MASSA_SITES_A } from "./sites-massa-a";
import { MASSA_SITES_B } from "./sites-massa-b";

export type { LocalRow };
export const MASSA_SITES: LocalRow[] = [...MASSA_SITES_A, ...MASSA_SITES_B];
