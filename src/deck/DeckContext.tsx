import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import { getCardDataSource } from "../data/source";
import type { CardDetails } from "../data/types";
import { decodeDeck, encodeDeck } from "./codec";
import { applyQty, deckCardFromDetails, deckIssues, totalQty, type DeckCard } from "./rules";
import { loadDeck, saveDeck } from "./storage";

interface DeckContextValue {
  cards: DeckCard[];
  total: number;
  issues: string[];
  notice: string | null;
  qtyOf(id: string): number;
  addCard(card: CardDetails): void;
  setQty(id: string, qty: number): void;
  clear(): void;
  retryFailed(): void;
  flash(message: string): void;
}

const DeckContext = createContext<DeckContextValue | null>(null);

function provisional(id: string, qty: number, previous?: DeckCard): DeckCard {
  if (previous?.loaded) return { ...previous, qty, error: false };
  return {
    id,
    qty,
    name: previous?.name || id,
    category: previous?.category || "other",
    isBasicEnergy: previous?.isBasicEnergy || false,
    imageLow: previous?.imageLow,
    setId: previous?.setId,
    setName: previous?.setName,
    localId: previous?.localId,
    types: previous?.types ?? [],
    loaded: false,
  };
}

function readInitial(encoded: string | null): DeckCard[] {
  const stored = loadDeck();
  if (encoded === null) return stored;
  const decoded = decodeDeck(encoded);
  const storedById = new Map(stored.map((card) => [card.id, card]));
  return decoded.map((entry) => provisional(entry.id, entry.qty, storedById.get(entry.id)));
}

export function DeckProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const [cards, setCards] = useState<DeckCard[]>(() => readInitial(params.get("d")));
  const [notice, setNotice] = useState<string | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const pendingKey = cards
    .filter((card) => !card.loaded && !card.error)
    .map((card) => card.id)
    .join("|");

  useEffect(() => {
    if (!pendingKey) return;
    let cancel = false;
    const ids = pendingKey.split("|");
    getCardDataSource()
      .getCards(ids)
      .then((details) => {
        if (cancel) return;
        const byId = new Map(details.filter((card): card is CardDetails => card !== null).map((card) => [card.id, card]));
        setCards((current) =>
          current.map((card) => {
            if (!ids.includes(card.id) || card.loaded) return card;
            const found = byId.get(card.id);
            if (!found) return { ...card, error: true };
            return deckCardFromDetails(found, card.qty);
          }),
        );
      })
      .catch(() => {
        if (cancel) return;
        setCards((current) =>
          current.map((card) => (ids.includes(card.id) && !card.loaded ? { ...card, error: true } : card)),
        );
      });
    return () => {
      cancel = true;
    };
  }, [pendingKey]);

  useEffect(() => {
    saveDeck(cards);
    const next = encodeDeck([...cards].sort((a, b) => a.id.localeCompare(b.id)));
    const current = paramsRef.current.get("d") ?? "";
    if (next === current) return;
    setParams(
      (previous) => {
        const updated = new URLSearchParams(previous);
        if (next) updated.set("d", next);
        else updated.delete("d");
        return updated;
      },
      { replace: true },
    );
  }, [cards, setParams]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const value = useMemo<DeckContextValue>(() => {
    const flash = (message: string) => setNotice(message);
    return {
      cards,
      total: totalQty(cards),
      issues: deckIssues(cards),
      notice,
      qtyOf(id: string) {
        return cards.find((card) => card.id === id)?.qty ?? 0;
      },
      addCard(card: CardDetails) {
        const current = cards.find((entry) => entry.id === card.id)?.qty ?? 0;
        const result = applyQty(cards, deckCardFromDetails(card, 0), current + 1);
        setCards(result.cards);
        flash(result.message ?? `已加入「${card.name}」`);
      },
      setQty(id: string, qty: number) {
        const current = cards.find((card) => card.id === id);
        if (!current) return;
        if (!current.loaded && qty > current.qty) {
          flash("卡牌資料還在讀取，請稍後再增加張數。");
          return;
        }
        const result = applyQty(cards, { ...current }, qty);
        setCards(result.cards);
        if (result.message) flash(result.message);
      },
      clear() {
        setCards([]);
        flash("已清空牌組");
      },
      retryFailed() {
        setCards((current) => current.map((card) => (card.error ? { ...card, error: false } : card)));
      },
      flash,
    };
  }, [cards, notice]);

  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>;
}

export function useDeck(): DeckContextValue {
  const value = useContext(DeckContext);
  if (!value) throw new Error("useDeck 必須在 DeckProvider 內使用");
  return value;
}
