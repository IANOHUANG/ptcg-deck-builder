import { describe, expect, it } from "vitest";
import { buildSearchRequests } from "./queries";

describe("buildSearchRequests", () => {
  it("does not query the whole catalog when nothing is selected", () => {
    expect(buildSearchRequests({})).toEqual([]);
  });

  it("filters a set on its own", () => {
    expect(buildSearchRequests({ setId: "SV7" })).toEqual([
      { params: { "set.id": "eq:SV7" } },
    ]);
  });

  it("maps pokemon type and trainer category onto TCGdex fields", () => {
    expect(buildSearchRequests({ category: "pokemon", type: "grass" })).toEqual([
      { params: { category: "eq:Pokemon", types: "eq:Grass" } },
    ]);
    expect(buildSearchRequests({ category: "supporter" })).toEqual([
      { params: { category: "eq:Trainer", trainerType: "eq:Supporter" } },
    ]);
  });

  it("splits energy into basic names and special energies", () => {
    const requests = buildSearchRequests({ category: "energy", type: "fire" });
    expect(requests).toEqual([
      {
        basicEnergy: true,
        params: { category: "eq:Energy", name: "基本" },
        nameIncludesAll: ["火"],
      },
      {
        params: { energyType: "eq:Special", name: "火" },
        nameIncludesAll: ["火"],
      },
    ]);
  });

  it("searches name, effect, and description text", () => {
    const fields = buildSearchRequests({ text: "皮卡丘" }).map((request) => request.params);
    expect(fields).toEqual([{ name: "皮卡丘" }, { effect: "皮卡丘" }, { description: "皮卡丘" }]);
  });

  it("keeps a type character on energy text queries instead of replacing it", () => {
    const requests = buildSearchRequests({ category: "energy", type: "water", text: "渦輪" });
    const specialEffect = requests.find(
      (request) => request.params.energyType === "eq:Special" && request.params.effect === "渦輪",
    );
    expect(specialEffect?.params.name).toBe("水");
    expect(specialEffect?.nameIncludesAll).toEqual(["水"]);
  });
});
