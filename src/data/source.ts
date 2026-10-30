import { TcgdexSource } from "./tcgdex";
import type { CardDataSource } from "./types";

let singleton: CardDataSource | null = null;

/**
 * Build the active catalog.
 *
 * To plug in another Traditional Chinese dataset later:
 * 1. Implement `CardDataSource` (search, card details, series list).
 * 2. Map that dataset onto `CardDetails`, including `category` and `isBasicEnergy`.
 * 3. Register it in this switch and select it with `VITE_CARD_SOURCE`.
 */
export function createCardDataSource(kind = import.meta.env.VITE_CARD_SOURCE ?? "tcgdex"): CardDataSource {
  switch (kind) {
    case "tcgdex":
      return new TcgdexSource("zh-tw");
    default:
      throw new Error(
        `未知的卡牌資料來源「${kind}」。請在 src/data/source.ts 註冊新的 CardDataSource。`,
      );
  }
}

export function getCardDataSource(): CardDataSource {
  if (!singleton) singleton = createCardDataSource();
  return singleton;
}
