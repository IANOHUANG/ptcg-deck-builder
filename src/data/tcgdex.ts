import { mapTcgdexBrief, mapTcgdexCard, type TcgdexBrief, type TcgdexCard } from "./mapCard";
import { buildSearchRequests, type SearchRequest } from "./queries";
import type {
  CardDataSource,
  CardDetails,
  CardSummary,
  SearchParams,
  SearchResult,
  SerieGroup,
} from "./types";

const DEFAULT_PAGE_SIZE = 24;

interface SerieBrief {
  id: string;
  name: string;
}

interface SetBrief {
  id: string;
  name: string;
  cardCount?: { total?: number; official?: number };
}

interface SerieFull extends SerieBrief {
  sets?: SetBrief[];
}

async function tcgdexGet<T>(language: string, path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`https://api.tcgdex.net/v2/${language}/${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) {
    throw new Error(`TCGdex ${response.status}`);
  }
  return (await response.json()) as T;
}

function localRank(localId: string): number {
  const numeric = /^(\d+)/.exec(localId);
  return numeric ? Number(numeric[1]) : Number.MAX_SAFE_INTEGER;
}

function sortCards(cards: CardSummary[], params: SearchParams): CardSummary[] {
  const copy = [...cards];
  if (params.setId?.trim() && !params.text?.trim()) {
    copy.sort(
      (a, b) => localRank(a.localId) - localRank(b.localId) || a.localId.localeCompare(b.localId, "en"),
    );
  } else {
    copy.sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  }
  return copy;
}

function nameMatches(name: string, includes: string[] | undefined): boolean {
  if (!includes?.length) return true;
  const haystack = name.toLocaleLowerCase("zh-Hant");
  return includes.every((needle) => haystack.includes(needle.toLocaleLowerCase("zh-Hant")));
}

export class TcgdexSource implements CardDataSource {
  readonly id = "tcgdex";
  readonly attribution =
    "卡牌文字與圖片來自 TCGdex 繁體中文（zh-tw），由瀏覽器即時讀取，本站不代管卡圖。";

  private readonly language: string;
  private readonly cache = new Map<string, Promise<CardDetails>>();
  private seriesPromise: Promise<SerieGroup[]> | null = null;

  constructor(language = "zh-tw") {
    this.language = language;
  }

  listSeries(): Promise<SerieGroup[]> {
    if (!this.seriesPromise) {
      this.seriesPromise = this.loadSeries().catch((error) => {
        this.seriesPromise = null;
        throw error;
      });
    }
    return this.seriesPromise;
  }

  async search(params: SearchParams): Promise<SearchResult> {
    const requests = buildSearchRequests(params);
    if (requests.length === 0) return { cards: [], hasMore: false, partial: false };

    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : DEFAULT_PAGE_SIZE;
    const settled = await Promise.all(
      requests.map(async (request) => {
        try {
          const loaded = await this.runRequest(request, page, pageSize);
          return { ok: true as const, ...loaded };
        } catch {
          return { ok: false as const, cards: [] as CardSummary[], hasMore: false };
        }
      }),
    );

    if (settled.every((result) => !result.ok)) {
      throw new Error("TCGdex search failed");
    }

    const seen = new Set<string>();
    const cards: CardSummary[] = [];
    for (const result of settled) {
      for (const card of result.cards) {
        if (seen.has(card.id)) continue;
        seen.add(card.id);
        cards.push(card);
      }
    }

    return {
      cards: sortCards(cards, params),
      hasMore: settled.some((result) => result.ok && result.hasMore),
      partial: settled.some((result) => !result.ok),
    };
  }

  getCard(id: string): Promise<CardDetails> {
    const cached = this.cache.get(id);
    if (cached) return cached;
    const pending = this.fetchCard(id).catch((error) => {
      this.cache.delete(id);
      throw error;
    });
    this.cache.set(id, pending);
    return pending;
  }

  async getCards(ids: string[]): Promise<Array<CardDetails | null>> {
    const unique = [...new Set(ids)];
    const queue = [...unique];
    const found = new Map<string, CardDetails | null>();
    const workers = Array.from({ length: Math.min(6, unique.length) }, async () => {
      while (queue.length > 0) {
        const id = queue.shift();
        if (!id) return;
        try {
          found.set(id, await this.getCard(id));
        } catch {
          found.set(id, null);
        }
      }
    });
    await Promise.all(workers);
    return ids.map((id) => found.get(id) ?? null);
  }

  private async fetchCard(id: string): Promise<CardDetails> {
    const raw = await tcgdexGet<TcgdexCard>(this.language, `cards/${encodeURIComponent(id)}`);
    if (!raw || typeof raw !== "object" || !("id" in raw)) {
      throw new Error("TCGdex card payload missing");
    }
    return mapTcgdexCard(raw);
  }

  private async runRequest(
    request: SearchRequest,
    page: number,
    pageSize: number,
  ): Promise<{ cards: CardSummary[]; hasMore: boolean }> {
    if (request.basicEnergy && page > 1) return { cards: [], hasMore: false };
    const params = {
      ...request.params,
      "pagination:page": String(request.basicEnergy ? 1 : page),
      "pagination:itemsPerPage": String(request.basicEnergy ? 100 : pageSize),
    };
    const raw = await tcgdexGet<TcgdexBrief[]>(this.language, "cards", params);
    if (!Array.isArray(raw)) throw new Error("TCGdex list payload missing");
    const cards = raw.filter((card) => nameMatches(card.name, request.nameIncludesAll)).map(mapTcgdexBrief);
    return {
      cards,
      hasMore: request.basicEnergy ? false : raw.length === pageSize,
    };
  }

  private async loadSeries(): Promise<SerieGroup[]> {
    const [seriesList, sets] = await Promise.all([
      tcgdexGet<SerieBrief[]>(this.language, "series"),
      tcgdexGet<SetBrief[]>(this.language, "sets", {
        "sort:field": "releaseDate",
        "sort:order": "DESC",
      }),
    ]);
    const order = new Map(sets.map((set, index) => [set.id, index]));
    const groups = await Promise.all(
      seriesList.map(async (serie) => {
        const full = await tcgdexGet<SerieFull>(this.language, `series/${encodeURIComponent(serie.id)}`);
        const serieSets = (full.sets ?? [])
          .map((set) => ({
            id: set.id,
            name: set.name,
            total: set.cardCount?.total ?? set.cardCount?.official ?? 0,
          }))
          .sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
        return { id: full.id, name: full.name, sets: serieSets };
      }),
    );
    groups.sort((a, b) => {
      const aRank = a.sets[0] ? (order.get(a.sets[0].id) ?? 9999) : 9999;
      const bRank = b.sets[0] ? (order.get(b.sets[0].id) ?? 9999) : 9999;
      return aRank - bRank;
    });
    return groups;
  }
}
