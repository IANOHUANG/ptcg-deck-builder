import { describe, expect, it } from "vitest";
import { decodeDeck, encodeDeck } from "./codec";
import { applyQty, copyKey, deckCardFromDetails, deckIssues, totalQty, type DeckCard } from "./rules";
import type { CardDetails } from "../data/types";

function card(partial: Partial<DeckCard> & Pick<DeckCard, "id" | "name">): DeckCard {
  return {
    qty: 1,
    category: "pokemon",
    isBasicEnergy: false,
    types: [],
    loaded: true,
    ...partial,
  };
}

function details(partial: Partial<CardDetails> & Pick<CardDetails, "id" | "name">): CardDetails {
  return {
    localId: "001",
    setId: "SV7",
    category: "pokemon",
    types: [],
    isBasicEnergy: false,
    attacks: [],
    abilities: [],
    weaknesses: [],
    resistances: [],
    ...partial,
  };
}

describe("copyKey", () => {
  it("strips a trailing illustrator parenthesis", () => {
    expect(copyKey("博士的研究(大木博士)")).toBe("博士的研究");
    expect(copyKey("博士的研究（奧琳博士）")).toBe("博士的研究");
    expect(copyKey("皮卡丘ex")).toBe("皮卡丘ex");
  });
});

describe("deck rules", () => {
  it("stops at 4 copies of the same name across printings", () => {
    const first = card({ id: "SV7-010", name: "博士的研究(大木博士)", category: "supporter", qty: 3 });
    const incoming = card({ id: "SVB-007", name: "博士的研究（奧琳博士）", category: "supporter", qty: 0 });
    const added = applyQty([first], incoming, 2);
    expect(added.cards.find((entry) => entry.id === "SVB-007")?.qty).toBe(1);
    expect(added.message).toMatch("最多 4 張");
    expect(totalQty(added.cards)).toBe(4);
  });

  it("lets basic energy exceed 4 but not 60", () => {
    const energy = card({
      id: "SVD-GRA",
      name: "基本【草】能量",
      category: "energy",
      isBasicEnergy: true,
      qty: 0,
    });
    const added = applyQty([], energy, 16);
    expect(added.cards[0]?.qty).toBe(16);
    expect(added.message).toBeUndefined();

    const full = applyQty([card({ id: "A", name: "皮卡丘", qty: 58 })], energy, 4);
    expect(full.cards.find((entry) => entry.id === "SVD-GRA")?.qty).toBe(2);
    expect(full.message).toMatch("60");
  });

  it("removes a card when quantity drops to zero", () => {
    const next = applyQty([card({ id: "SV7-001", name: "芭瓢蟲", qty: 1 })], card({ id: "SV7-001", name: "芭瓢蟲" }), 0);
    expect(next.cards).toEqual([]);
  });

  it("reports an imported deck that breaks the limits", () => {
    const issues = deckIssues([
      card({ id: "A", name: "皮卡丘", qty: 5 }),
      card({ id: "B", name: "基本【水】能量", category: "energy", isBasicEnergy: true, qty: 56 }),
    ]);
    expect(issues.some((issue) => issue.includes("60"))).toBe(true);
    expect(issues.some((issue) => issue.includes("皮卡丘"))).toBe(true);
  });

  it("builds a deck card from catalog details", () => {
    const snap = deckCardFromDetails(
      details({
        id: "SVC-001",
        name: "皮卡丘ex",
        setName: "皮卡丘特別組合",
        types: ["lightning"],
        image: { low: "low", high: "high" },
      }),
      2,
    );
    expect(snap.qty).toBe(2);
    expect(snap.imageLow).toBe("low");
    expect(snap.loaded).toBe(true);
  });
});

describe("deck codec", () => {
  it("round-trips a share string", () => {
    const encoded = encodeDeck([
      { id: "SV7-001", qty: 4 },
      { id: "SV-P-DAR", qty: 12 },
    ]);
    expect(decodeDeck(encoded)).toEqual([
      { id: "SV7-001", qty: 4 },
      { id: "SV-P-DAR", qty: 12 },
    ]);
  });

  it("decodes an id that contains a star", () => {
    expect(decodeDeck(`${encodeURIComponent("A*B")}*2`)).toEqual([{ id: "A*B", qty: 2 }]);
  });

  it("drops malformed parts", () => {
    expect(decodeDeck("nope~SV7-001*0~*2")).toEqual([]);
  });
});
