import { describe, expect, it } from "vitest";
import { detectBasicEnergy, mapCategory, mapTcgdexCard, setIdFromBrief, type TcgdexCard } from "./mapCard";

describe("setIdFromBrief", () => {
  it("keeps hyphens that belong to the set id", () => {
    expect(setIdFromBrief({ id: "SV-P-001", localId: "001" })).toBe("SV-P");
    expect(setIdFromBrief({ id: "SV7-001", localId: "001" })).toBe("SV7");
    expect(setIdFromBrief({ id: "SVD-GRA", localId: "GRA" })).toBe("SVD");
  });
});

describe("mapCategory", () => {
  it("prefers trainer type when the energy category is wrong", () => {
    expect(mapCategory({ category: "Energy", trainerType: "Item" })).toBe("item");
    expect(mapCategory({ category: "Trainer", trainerType: "Tool" })).toBe("tool");
    expect(mapCategory({ category: "Trainer", trainerType: "Supporter" })).toBe("supporter");
    expect(mapCategory({ category: "Trainer", trainerType: "Stadium" })).toBe("stadium");
  });

  it("maps pokemon and energy", () => {
    expect(mapCategory({ category: "Pokemon" })).toBe("pokemon");
    expect(mapCategory({ category: "Energy" })).toBe("energy");
  });
});

describe("detectBasicEnergy", () => {
  it("treats 基本 energies as basic even when energyType is Normal", () => {
    expect(
      detectBasicEnergy({ name: "基本【草】能量", category: "energy", energyType: "Normal" }),
    ).toBe(true);
    expect(detectBasicEnergy({ name: "基本草能量", category: "energy", energyType: "Normal" })).toBe(true);
  });

  it("does not treat special energy or trainer cards as basic", () => {
    expect(
      detectBasicEnergy({ name: "雙重渦輪能量", category: "energy", energyType: "Special" }),
    ).toBe(false);
    expect(detectBasicEnergy({ name: "巢穴球", category: "item", energyType: "Normal" })).toBe(false);
  });
});

describe("mapTcgdexCard", () => {
  it("maps a Traditional Chinese Pokémon card", () => {
    const raw: TcgdexCard = {
      id: "SV7-001",
      localId: "001",
      name: "芭瓢蟲",
      image: "https://assets.tcgdex.net/zh-tw/SV/SV7/001",
      category: "Pokemon",
      hp: 60,
      types: ["Grass"],
      stage: "Basic",
      set: { id: "SV7", name: "星晶奇跡" },
      attacks: [{ name: "魯芽頭擊", cost: ["Colorless", "Colorless"], damage: 30 }],
      weaknesses: [{ type: "Fire", value: "×2" }],
      retreat: 1,
    };
    const card = mapTcgdexCard(raw);
    expect(card.setName).toBe("星晶奇跡");
    expect(card.category).toBe("pokemon");
    expect(card.types).toEqual(["grass"]);
    expect(card.image?.low).toBe("https://assets.tcgdex.net/zh-tw/SV/SV7/001/low.webp");
    expect(card.attacks[0]?.cost).toEqual(["colorless", "colorless"]);
    expect(card.weaknesses[0]?.type).toBe("fire");
    expect(card.isBasicEnergy).toBe(false);
  });

  it("reclassifies an item that TCGdex filed under Energy", () => {
    const card = mapTcgdexCard({
      id: "SVAL-012",
      localId: "012",
      name: "巢穴球",
      category: "Energy",
      trainerType: "Item",
      energyType: "Normal",
      effect: "從自己的牌庫選擇1張【基礎】寶可夢卡。",
    });
    expect(card.category).toBe("item");
    expect(card.isBasicEnergy).toBe(false);
    expect(card.energyKind).toBeUndefined();
  });
});
