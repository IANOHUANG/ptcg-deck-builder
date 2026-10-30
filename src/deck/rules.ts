import type { CardCategory, CardDetails, PtcgType } from "../data/types";

export const DECK_LIMIT = 60;
export const COPY_LIMIT = 4;

export interface DeckCard {
  id: string;
  qty: number;
  name: string;
  category: CardCategory;
  isBasicEnergy: boolean;
  imageLow?: string;
  setId?: string;
  setName?: string;
  localId?: string;
  types: PtcgType[];
  loaded: boolean;
  error?: boolean;
}

export function copyKey(name: string): string {
  const trimmed = name.trim();
  const match = trimmed.match(/^(.+?)[(（][^()（）]*[)）]$/);
  return (match?.[1] ?? trimmed).trim();
}

export function totalQty(cards: Array<{ qty: number }>): number {
  return cards.reduce((sum, card) => sum + card.qty, 0);
}

export function deckCardFromDetails(card: CardDetails, qty: number): DeckCard {
  return {
    id: card.id,
    qty,
    name: card.name,
    category: card.category,
    isBasicEnergy: card.isBasicEnergy,
    imageLow: card.image?.low,
    setId: card.setId,
    setName: card.setName,
    localId: card.localId,
    types: card.types,
    loaded: true,
  };
}

export function maxQtyFor(
  cards: DeckCard[],
  card: Pick<DeckCard, "id" | "name" | "isBasicEnergy">,
): number {
  const current = cards.find((entry) => entry.id === card.id)?.qty ?? 0;
  const deckRoom = DECK_LIMIT - (totalQty(cards) - current);
  if (card.isBasicEnergy) return Math.max(0, deckRoom);
  const key = copyKey(card.name);
  const sameOthers = cards
    .filter((entry) => entry.id !== card.id && !entry.isBasicEnergy && copyKey(entry.name) === key)
    .reduce((sum, entry) => sum + entry.qty, 0);
  return Math.max(0, Math.min(deckRoom, COPY_LIMIT - sameOthers));
}

function limitMessage(
  cards: DeckCard[],
  card: Pick<DeckCard, "id" | "name" | "isBasicEnergy">,
): string {
  const current = cards.find((entry) => entry.id === card.id)?.qty ?? 0;
  const deckRoom = DECK_LIMIT - (totalQty(cards) - current);
  if (!card.isBasicEnergy) {
    const key = copyKey(card.name);
    const sameOthers = cards
      .filter((entry) => entry.id !== card.id && !entry.isBasicEnergy && copyKey(entry.name) === key)
      .reduce((sum, entry) => sum + entry.qty, 0);
    if (COPY_LIMIT - sameOthers < deckRoom) {
      return `「${key}」最多 4 張，不同系列的同名卡會一起計算。`;
    }
  }
  return "牌組最多 60 張。";
}

export function applyQty(
  cards: DeckCard[],
  incoming: Omit<DeckCard, "qty">,
  qty: number,
): { cards: DeckCard[]; message?: string } {
  const requested = Number.isFinite(qty) ? Math.floor(qty) : 0;
  const existing = cards.find((card) => card.id === incoming.id);
  if (!existing && requested <= 0) return { cards };

  const max = maxQtyFor(cards, incoming);
  const nextQty = Math.max(0, Math.min(requested, max));
  const message = requested > max ? limitMessage(cards, incoming) : undefined;
  const without = cards.filter((card) => card.id !== incoming.id);
  if (nextQty <= 0) return { cards: without, message };

  const next: DeckCard = { ...incoming, qty: nextQty };
  if (!existing) return { cards: [...cards, next], message };
  return {
    cards: cards.map((card) => (card.id === incoming.id ? next : card)),
    message,
  };
}

export function deckIssues(cards: DeckCard[]): string[] {
  const issues: string[] = [];
  const total = totalQty(cards);
  if (total > DECK_LIMIT) issues.push(`已超過 60 張上限（目前 ${total} 張）。`);

  const pending = cards.some((card) => !card.loaded && !card.error);
  if (pending) return issues;

  const byName = new Map<string, number>();
  for (const card of cards) {
    if (card.isBasicEnergy) continue;
    const key = copyKey(card.name);
    byName.set(key, (byName.get(key) ?? 0) + card.qty);
  }
  for (const [name, qty] of byName) {
    if (qty > COPY_LIMIT) issues.push(`「${name}」共 ${qty} 張，超過 4 張上限。`);
  }
  return issues;
}
