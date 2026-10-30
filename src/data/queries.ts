import { TYPE_LABEL, TYPE_TO_API } from "./labels";
import type { SearchParams } from "./types";

export const TEXT_FIELDS = ["name", "effect", "description"] as const;

export interface SearchRequest {
  params: Record<string, string>;
  /** Keep briefs whose name contains every string. */
  nameIncludesAll?: string[];
  /** Resolved from the basic-energy query; omitted on later pages so results are not repeated. */
  basicEnergy?: boolean;
}

const TRAINER_API: Record<"item" | "tool" | "supporter" | "stadium", string> = {
  item: "Item",
  tool: "Tool",
  supporter: "Supporter",
  stadium: "Stadium",
};

function baseParams(params: SearchParams): Record<string, string> {
  const query: Record<string, string> = {};
  const setId = params.setId?.trim();
  if (setId) query["set.id"] = `eq:${setId}`;
  return query;
}

function energyRequests(base: Record<string, string>, typeChar?: string): SearchRequest[] {
  const special: Record<string, string> = { ...base, energyType: "eq:Special" };
  if (typeChar) special.name = typeChar;
  return [
    {
      basicEnergy: true,
      params: { ...base, category: "eq:Energy", name: "基本" },
      nameIncludesAll: typeChar ? [typeChar] : undefined,
    },
    {
      params: special,
      nameIncludesAll: typeChar ? [typeChar] : undefined,
    },
  ];
}

function seedsFor(params: SearchParams): SearchRequest[] {
  const base = baseParams(params);
  const typeChar = params.type ? TYPE_LABEL[params.type] : undefined;
  const typeApi = params.type ? TYPE_TO_API[params.type] : undefined;

  switch (params.category) {
    case "pokemon": {
      const query: Record<string, string> = { ...base, category: "eq:Pokemon" };
      if (typeApi) query.types = `eq:${typeApi}`;
      return [{ params: query }];
    }
    case "item":
    case "tool":
    case "supporter":
    case "stadium":
      return [
        {
          params: {
            ...base,
            category: "eq:Trainer",
            trainerType: `eq:${TRAINER_API[params.category]}`,
          },
        },
      ];
    case "energy":
      return energyRequests(base, typeChar);
    default:
      if (params.type && typeApi) {
        return [{ params: { ...base, types: `eq:${typeApi}` } }, ...energyRequests(base, typeChar)];
      }
      return [{ params: base }];
  }
}

function mergeIncludes(current: string[] | undefined, extra: string): string[] {
  const next = [...(current ?? [])];
  if (!next.includes(extra)) next.push(extra);
  return next;
}

function requestKey(request: SearchRequest): string {
  const params = Object.keys(request.params)
    .sort()
    .map((key) => `${key}=${request.params[key]}`)
    .join("&");
  return `${params}|${request.basicEnergy ? "basic" : ""}|${(request.nameIncludesAll ?? []).join(",")}`;
}

export function buildSearchRequests(params: SearchParams): SearchRequest[] {
  const text = params.text?.trim() ?? "";
  const setId = params.setId?.trim() ?? "";
  if (!text && !setId && !params.category && !params.type) return [];

  const seeds = seedsFor(params);
  if (!text) return seeds;

  const expanded: SearchRequest[] = [];
  const seen = new Set<string>();
  const push = (request: SearchRequest) => {
    const key = requestKey(request);
    if (seen.has(key)) return;
    seen.add(key);
    expanded.push(request);
  };

  for (const seed of seeds) {
    if (seed.basicEnergy || seed.params.name) {
      push({
        ...seed,
        nameIncludesAll: mergeIncludes(seed.nameIncludesAll, text),
      });
    }
    for (const field of TEXT_FIELDS) {
      if (field === "name" && (seed.basicEnergy || seed.params.name)) continue;
      push({
        basicEnergy: seed.basicEnergy,
        params: { ...seed.params, [field]: text },
        nameIncludesAll: seed.nameIncludesAll,
      });
    }
  }
  return expanded;
}
