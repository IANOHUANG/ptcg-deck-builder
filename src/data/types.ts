export type CardCategory =
  | "pokemon"
  | "item"
  | "tool"
  | "supporter"
  | "stadium"
  | "energy"
  | "other";

export type SearchCategory = Exclude<CardCategory, "other">;

export type PtcgType =
  | "grass"
  | "fire"
  | "water"
  | "lightning"
  | "psychic"
  | "fighting"
  | "darkness"
  | "metal"
  | "fairy"
  | "dragon"
  | "colorless";

export interface CardImage {
  low: string;
  high: string;
}

export interface CardSummary {
  id: string;
  localId: string;
  name: string;
  setId: string;
  setName?: string;
  image?: CardImage;
}

export interface CardAttack {
  name: string;
  damage?: string;
  effect?: string;
  cost: PtcgType[];
}

export interface CardAbility {
  type?: string;
  name: string;
  effect?: string;
}

export interface CardModifier {
  type?: PtcgType;
  rawType: string;
  value: string;
}

export interface CardDetails extends CardSummary {
  category: CardCategory;
  types: PtcgType[];
  isBasicEnergy: boolean;
  energyKind?: "basic" | "special";
  hp?: number;
  stage?: string;
  suffix?: string;
  evolveFrom?: string;
  rarity?: string;
  illustrator?: string;
  regulationMark?: string;
  retreat?: number;
  effect?: string;
  description?: string;
  attacks: CardAttack[];
  abilities: CardAbility[];
  weaknesses: CardModifier[];
  resistances: CardModifier[];
  legal?: {
    standard?: boolean;
    expanded?: boolean;
  };
}

export interface CardSetInfo {
  id: string;
  name: string;
  total: number;
}

export interface SerieGroup {
  id: string;
  name: string;
  sets: CardSetInfo[];
}

export interface SearchParams {
  text?: string;
  setId?: string;
  category?: SearchCategory;
  type?: PtcgType;
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  cards: CardSummary[];
  hasMore: boolean;
  partial: boolean;
}

/**
 * Swappable card catalog. A future Traditional Chinese dataset should
 * implement this and register itself in `createCardDataSource`.
 */
export interface CardDataSource {
  readonly id: string;
  readonly attribution: string;
  listSeries(): Promise<SerieGroup[]>;
  search(params: SearchParams): Promise<SearchResult>;
  getCard(id: string): Promise<CardDetails>;
  getCards(ids: string[]): Promise<Array<CardDetails | null>>;
}
