import type { CardCategory, PtcgType } from "../data/types";
import { CATEGORY_LABEL, TYPE_ORDER } from "../data/labels";
import type { DeckCard } from "./rules";

const STORAGE_KEY = "ptcg-deck-v1";

const CATEGORIES = new Set(Object.keys(CATEGORY_LABEL));
const TYPES = new Set<string>(TYPE_ORDER);

function isType(value: unknown): value is PtcgType {
  return typeof value === "string" && TYPES.has(value);
}

function isCategory(value: unknown): value is CardCategory {
  return typeof value === "string" && CATEGORIES.has(value);
}

function sanitize(value: unknown): DeckCard[] {
  if (!Array.isArray(value)) return [];
  const cards: DeckCard[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const record = raw as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    const qty = Number(record.qty);
    if (!id || id.length > 80 || id.includes("/") || !Number.isInteger(qty) || qty < 1 || qty > 60) {
      continue;
    }
    const types = Array.isArray(record.types) ? record.types.filter(isType) : [];
    cards.push({
      id,
      qty,
      name: typeof record.name === "string" && record.name ? record.name : id,
      category: isCategory(record.category) ? record.category : "other",
      isBasicEnergy: record.isBasicEnergy === true,
      imageLow: typeof record.imageLow === "string" ? record.imageLow : undefined,
      setId: typeof record.setId === "string" ? record.setId : undefined,
      setName: typeof record.setName === "string" ? record.setName : undefined,
      localId: typeof record.localId === "string" ? record.localId : undefined,
      types,
      loaded: record.loaded === true,
      error: record.error === true,
    });
  }
  return cards;
}

export function loadDeck(): DeckCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { v?: number; cards?: unknown };
    if (parsed.v !== 1) return [];
    return sanitize(parsed.cards);
  } catch {
    return [];
  }
}

export function saveDeck(cards: DeckCard[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, cards }));
  } catch {
    // Private mode or a full quota should not block the in-memory deck.
  }
}
