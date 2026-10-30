import type { CardCategory, PtcgType, SearchCategory } from "./types";

export const CATEGORY_LABEL: Record<CardCategory, string> = {
  pokemon: "寶可夢",
  item: "物品",
  tool: "裝備",
  supporter: "支援者",
  stadium: "競技場",
  energy: "能量",
  other: "其他",
};

export const CATEGORY_ORDER: CardCategory[] = [
  "pokemon",
  "item",
  "tool",
  "supporter",
  "stadium",
  "energy",
  "other",
];

export const SEARCH_CATEGORIES: SearchCategory[] = [
  "pokemon",
  "item",
  "tool",
  "supporter",
  "stadium",
  "energy",
];

export const TYPE_LABEL: Record<PtcgType, string> = {
  grass: "草",
  fire: "火",
  water: "水",
  lightning: "雷",
  psychic: "超",
  fighting: "鬥",
  darkness: "惡",
  metal: "鋼",
  fairy: "妖",
  dragon: "龍",
  colorless: "無",
};

export const TYPE_TO_API: Record<PtcgType, string> = {
  grass: "Grass",
  fire: "Fire",
  water: "Water",
  lightning: "Lightning",
  psychic: "Psychic",
  fighting: "Fighting",
  darkness: "Darkness",
  metal: "Metal",
  fairy: "Fairy",
  dragon: "Dragon",
  colorless: "Colorless",
};

export const TYPE_ORDER: PtcgType[] = [
  "grass",
  "fire",
  "water",
  "lightning",
  "psychic",
  "fighting",
  "darkness",
  "metal",
  "fairy",
  "dragon",
  "colorless",
];

const TRAINER_CATEGORIES = new Set<SearchCategory>(["item", "tool", "supporter", "stadium"]);

export function categoryUsesType(category: SearchCategory | ""): boolean {
  return category === "" || category === "pokemon" || category === "energy";
}

export function isTrainerCategory(category: SearchCategory | ""): boolean {
  return category !== "" && TRAINER_CATEGORIES.has(category);
}

export function parseType(value: string): PtcgType | undefined {
  const trimmed = value.trim();
  const byLabel = (Object.keys(TYPE_LABEL) as PtcgType[]).find((key) => TYPE_LABEL[key] === trimmed);
  if (byLabel) return byLabel;
  return (Object.keys(TYPE_TO_API) as PtcgType[]).find(
    (key) => TYPE_TO_API[key].toLowerCase() === trimmed.toLowerCase(),
  );
}

const STAGE_LABEL: Record<string, string> = {
  basic: "基礎",
  stage1: "1階進化",
  stage2: "2階進化",
  restored: "復元",
};

export function formatStage(stage?: string): string | undefined {
  if (!stage) return undefined;
  return STAGE_LABEL[stage.toLowerCase()] ?? stage;
}

const RARITY_LABEL: Record<string, string> = {
  common: "普通",
  uncommon: "非普通",
  rare: "稀有",
  "rare holo": "稀有閃",
  "double rare": "雙稀有",
  "ultra rare": "超稀有",
  "illustration rare": "插畫稀有",
  "special illustration rare": "特別插畫稀有",
  "hyper rare": "極稀有",
  "ace spec rare": "ACE SPEC 稀有",
  "shiny rare": "色違稀有",
  promo: "促銷",
};

export function formatRarity(rarity?: string): string | undefined {
  if (!rarity) return undefined;
  return RARITY_LABEL[rarity.toLowerCase()] ?? rarity;
}

export function formatSuffix(suffix?: string): string | undefined {
  if (!suffix) return undefined;
  if (suffix.toLowerCase() === "ex") return "ex";
  return suffix;
}

const ABILITY_LABEL: Record<string, string> = {
  ability: "特性",
  "pokémon power": "寶可夢力量",
  "pokemon power": "寶可夢力量",
};

export function formatAbilityType(type?: string): string | undefined {
  if (!type) return undefined;
  return ABILITY_LABEL[type.toLowerCase()] ?? type;
}
