import { parseType } from "./labels";
import type { CardAbility, CardAttack, CardCategory, CardDetails, CardModifier, CardSummary, PtcgType } from "./types";

export interface TcgdexBrief {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

export interface TcgdexCard extends TcgdexBrief {
  category?: string;
  illustrator?: string;
  rarity?: string;
  set?: { id?: string; name?: string };
  hp?: number;
  types?: string[];
  description?: string;
  effect?: string;
  stage?: string;
  suffix?: string;
  evolveFrom?: string;
  trainerType?: string | null;
  energyType?: string | null;
  regulationMark?: string;
  retreat?: number;
  legal?: { standard?: boolean; expanded?: boolean };
  attacks?: Array<{
    name?: string;
    damage?: string | number | null;
    effect?: string;
    cost?: string[];
  }>;
  abilities?: Array<{ type?: string; name?: string; effect?: string }>;
  weaknesses?: Array<{ type?: string; value?: string }>;
  resistances?: Array<{ type?: string; value?: string }>;
}

const TRAINER_TYPES: Record<string, CardCategory> = {
  item: "item",
  tool: "tool",
  "pokémon tool": "tool",
  "pokemon tool": "tool",
  supporter: "supporter",
  stadium: "stadium",
};

export function setIdFromBrief(card: { id: string; localId: string }): string {
  const suffix = `-${card.localId}`;
  if (card.id.endsWith(suffix)) return card.id.slice(0, -suffix.length);
  const dash = card.id.lastIndexOf("-");
  return dash > 0 ? card.id.slice(0, dash) : card.id;
}

export function mapCategory(raw: { category?: string | null; trainerType?: string | null }): CardCategory {
  const trainerKey = raw.trainerType?.trim().toLowerCase() ?? "";
  const trainer = TRAINER_TYPES[trainerKey];
  if (trainer) return trainer;
  const category = raw.category?.trim().toLowerCase();
  if (category === "pokemon" || category === "pokémon") return "pokemon";
  if (category === "energy") return "energy";
  if (category === "trainer") return "other";
  return "other";
}

/** Basic Energy is exempt from the 4-copy rule. TCGdex marks these as energyType "Normal". */
export function detectBasicEnergy(input: {
  name: string;
  category: CardCategory;
  energyType?: string | null;
}): boolean {
  if (input.category !== "energy") return false;
  const energyType = input.energyType?.trim().toLowerCase();
  if (energyType === "special") return false;
  if (energyType === "basic") return true;
  const name = input.name.trim();
  if (name.startsWith("基本")) return true;
  return /^basic\b/i.test(name) && /energy/i.test(name);
}

export function tcgdexImage(base?: string): CardSummary["image"] {
  if (!base) return undefined;
  return {
    low: `${base}/low.webp`,
    high: `${base}/high.webp`,
  };
}

function mapTypeList(values: string[] | undefined, unique: boolean): PtcgType[] {
  if (!values) return [];
  const types: PtcgType[] = [];
  for (const value of values) {
    const parsed = parseType(value);
    if (!parsed) continue;
    if (unique && types.includes(parsed)) continue;
    types.push(parsed);
  }
  return types;
}

function mapAttacks(raw: TcgdexCard["attacks"]): CardAttack[] {
  if (!raw) return [];
  return raw
    .map((attack) => ({
      name: attack.name?.trim() ?? "",
      damage: attack.damage === undefined || attack.damage === null ? undefined : String(attack.damage),
      effect: attack.effect?.trim() || undefined,
      cost: mapTypeList(attack.cost, false),
    }))
    .filter((attack) => attack.name || attack.effect || attack.cost.length > 0);
}

function mapAbilities(raw: TcgdexCard["abilities"]): CardAbility[] {
  if (!raw) return [];
  return raw
    .map((ability) => ({
      type: ability.type?.trim() || undefined,
      name: ability.name?.trim() ?? "",
      effect: ability.effect?.trim() || undefined,
    }))
    .filter((ability) => ability.name || ability.effect);
}

function mapModifiers(raw?: Array<{ type?: string; value?: string }>): CardModifier[] {
  if (!raw) return [];
  return raw
    .filter((entry) => entry.type || entry.value)
    .map((entry) => ({
      type: entry.type ? parseType(entry.type) : undefined,
      rawType: entry.type?.trim() ?? "",
      value: entry.value?.trim() ?? "",
    }));
}

export function mapTcgdexBrief(raw: TcgdexBrief): CardSummary {
  return {
    id: raw.id,
    localId: raw.localId,
    name: raw.name,
    setId: setIdFromBrief(raw),
    image: tcgdexImage(raw.image),
  };
}

export function mapTcgdexCard(raw: TcgdexCard): CardDetails {
  const category = mapCategory(raw);
  const isBasicEnergy = detectBasicEnergy({
    name: raw.name,
    category,
    energyType: raw.energyType,
  });
  const summary = mapTcgdexBrief(raw);
  return {
    ...summary,
    setId: raw.set?.id || summary.setId,
    setName: raw.set?.name,
    category,
    types: mapTypeList(raw.types, true),
    isBasicEnergy,
    energyKind: category === "energy" ? (isBasicEnergy ? "basic" : "special") : undefined,
    hp: typeof raw.hp === "number" ? raw.hp : undefined,
    stage: raw.stage,
    suffix: raw.suffix,
    evolveFrom: raw.evolveFrom,
    rarity: raw.rarity,
    illustrator: raw.illustrator,
    regulationMark: raw.regulationMark,
    retreat: typeof raw.retreat === "number" ? raw.retreat : undefined,
    effect: raw.effect?.trim() || undefined,
    description: raw.description?.trim() || undefined,
    attacks: mapAttacks(raw.attacks),
    abilities: mapAbilities(raw.abilities),
    weaknesses: mapModifiers(raw.weaknesses),
    resistances: mapModifiers(raw.resistances),
    legal: raw.legal,
  };
}
