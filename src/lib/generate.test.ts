import { describe, expect, it } from "vitest";
import { generateWeek, regenerateSlot, sortSlots } from "@/lib/generate";
import { MEAL_TYPES, type Diet, type MealType } from "@/lib/constants";
import type { MealView, SlotView } from "@/lib/types";

const TOTAL_SLOTS = 21;

function meal(
  id: string,
  diet: Diet,
  mealTypes: MealType[] = [...MEAL_TYPES],
  cuisine = ""
): MealView {
  return {
    id,
    name: id,
    diet,
    mealTypes,
    cuisine,
    imageUrl: "",
    ingredients: [],
    recipe: "",
    recipeUrl: "",
  };
}

/** `count` meals per diet, each servable at any meal type. */
function library(count: number): MealView[] {
  const meals: MealView[] = [];
  for (let i = 0; i < count; i++) {
    meals.push(meal(`veg-${i}`, "veg"));
    meals.push(meal(`nonveg-${i}`, "nonveg"));
  }
  return meals;
}

function dietOf(slots: SlotView[], meals: MealView[]): Diet[] {
  const byId = new Map(meals.map((m) => [m.id, m]));
  return slots.flatMap((s) => {
    const m = s.mealId ? byId.get(s.mealId) : null;
    return m ? [m.diet] : [];
  });
}

function countDiet(slots: SlotView[], meals: MealView[], diet: Diet): number {
  return dietOf(slots, meals).filter((d) => d === diet).length;
}

function slot(
  day: number,
  mealType: MealType,
  overrides: Partial<SlotView> = {}
): SlotView {
  return {
    day,
    mealType,
    mealId: null,
    locked: false,
    wildcard: false,
    ...overrides,
  };
}

/** The generator shuffles, so invariants are checked over several runs. */
function repeat(times: number, run: (iteration: number) => void) {
  for (let i = 0; i < times; i++) run(i);
}

describe("generateWeek", () => {
  it("returns every day and meal type exactly once, in week order", () => {
    const meals = library(12);
    const slots = generateWeek({ meals, vegPercent: 50 });

    expect(slots).toHaveLength(TOTAL_SLOTS);
    expect(slots).toEqual(sortSlots(slots));

    const keys = slots.map((s) => `${s.day}:${s.mealType}`);
    expect(new Set(keys).size).toBe(TOTAL_SLOTS);
    expect(slots.every((s) => s.day >= 0 && s.day <= 6)).toBe(true);
  });

  it("leaves every slot empty when the library is empty", () => {
    const slots = generateWeek({ meals: [], vegPercent: 50 });

    expect(slots).toHaveLength(TOTAL_SLOTS);
    expect(slots.every((s) => s.mealId === null)).toBe(true);
  });

  it("only places a meal in a slot it is tagged for", () => {
    const meals = [
      meal("b-veg", "veg", ["breakfast"]),
      meal("b-non", "nonveg", ["breakfast"]),
      meal("l-veg", "veg", ["lunch"]),
      meal("l-non", "nonveg", ["lunch"]),
      meal("d-veg", "veg", ["dinner"]),
      meal("d-non", "nonveg", ["dinner"]),
    ];
    const byId = new Map(meals.map((m) => [m.id, m]));

    repeat(10, () => {
      const slots = generateWeek({ meals, vegPercent: 50 });
      for (const s of slots) {
        if (!s.mealId) continue;
        expect(byId.get(s.mealId)!.mealTypes).toContain(s.mealType);
      }
    });
  });

  it("fills the week with veg at 100% and non-veg at 0%", () => {
    const meals = library(12);

    const allVeg = generateWeek({ meals, vegPercent: 100 });
    expect(countDiet(allVeg, meals, "veg")).toBe(TOTAL_SLOTS);

    const allNonVeg = generateWeek({ meals, vegPercent: 0 });
    expect(countDiet(allNonVeg, meals, "nonveg")).toBe(TOTAL_SLOTS);
  });

  it("hits the requested veg share of the week", () => {
    const meals = library(12);

    repeat(10, () => {
      const slots = generateWeek({ meals, vegPercent: 50 });
      // Math.round(0.5 * 21) === 11.
      expect(countDiet(slots, meals, "veg")).toBe(11);
      expect(countDiet(slots, meals, "nonveg")).toBe(10);
    });
  });

  it("serves a meal type entirely veg when it has no non-veg option", () => {
    const meals = [
      meal("b-veg-1", "veg", ["breakfast"]),
      meal("b-veg-2", "veg", ["breakfast"]),
      meal("d-non", "nonveg", ["lunch", "dinner"]),
    ];

    // Asking for no veg at all cannot override breakfast having only veg meals.
    const slots = generateWeek({ meals, vegPercent: 0 });
    const breakfasts = slots.filter((s) => s.mealType === "breakfast");

    expect(breakfasts).toHaveLength(7);
    expect(breakfasts.every((s) => s.mealId?.startsWith("b-veg"))).toBe(true);
  });

  it("preserves locked slots verbatim", () => {
    const meals = library(12);
    const locked = [
      slot(0, "breakfast", { mealId: "veg-0", locked: true }),
      slot(3, "dinner", { mealId: "nonveg-1", locked: true }),
    ];

    const slots = generateWeek({ meals, vegPercent: 50, locked });

    expect(slots).toContainEqual(
      slot(0, "breakfast", { mealId: "veg-0", locked: true })
    );
    expect(slots).toContainEqual(
      slot(3, "dinner", { mealId: "nonveg-1", locked: true })
    );
  });

  it("ignores a locked slot whose meal no longer exists", () => {
    const meals = library(12);
    const locked = [slot(1, "lunch", { mealId: "deleted", locked: true })];

    const slots = generateWeek({ meals, vegPercent: 50, locked });
    const target = slots.find((s) => s.day === 1 && s.mealType === "lunch")!;

    expect(target.locked).toBe(false);
    expect(target.mealId).not.toBe("deleted");
  });

  it("keeps wildcard slots empty and marked", () => {
    const meals = library(12);
    const wildcards = [slot(2, "lunch", { wildcard: true })];

    const slots = generateWeek({ meals, vegPercent: 50, wildcards });
    const target = slots.find((s) => s.day === 2 && s.mealType === "lunch")!;

    expect(target).toEqual(slot(2, "lunch", { wildcard: true }));
  });

  it("excludes wildcards from the veg ratio", () => {
    const meals = library(12);
    // Blank out every dinner, leaving 14 plannable slots.
    const wildcards = Array.from({ length: 7 }, (_, day) =>
      slot(day, "dinner", { wildcard: true })
    );

    repeat(10, () => {
      const slots = generateWeek({ meals, vegPercent: 50, wildcards });
      const filled = slots.filter((s) => s.mealId);

      expect(filled).toHaveLength(14);
      // Math.round(0.5 * 14) === 7.
      expect(countDiet(slots, meals, "veg")).toBe(7);
    });
  });

  it("counts locked veg meals toward the veg target", () => {
    const meals = library(12);
    const locked = Array.from({ length: 4 }, (_, day) =>
      slot(day, "breakfast", { mealId: `veg-${day}`, locked: true })
    );

    repeat(10, () => {
      const slots = generateWeek({ meals, vegPercent: 50, locked });
      // The 4 locked veg meals are part of the 11, not extra.
      expect(countDiet(slots, meals, "veg")).toBe(11);
    });
  });

  it("does not repeat a meal when the library can fill the week", () => {
    const meals = library(12);

    repeat(10, () => {
      const slots = generateWeek({ meals, vegPercent: 50 });
      const ids = slots.map((s) => s.mealId).filter(Boolean);

      expect(ids).toHaveLength(TOTAL_SLOTS);
      expect(new Set(ids).size).toBe(TOTAL_SLOTS);
    });
  });

  it("spreads reuse evenly when the library is smaller than the week", () => {
    const meals = [
      meal("veg-a", "veg"),
      meal("veg-b", "veg"),
      meal("veg-c", "veg"),
    ];

    repeat(5, () => {
      const slots = generateWeek({ meals, vegPercent: 100 });
      const uses = new Map<string, number>();
      for (const s of slots) {
        if (s.mealId) uses.set(s.mealId, (uses.get(s.mealId) ?? 0) + 1);
      }

      expect([...uses.values()]).toEqual([7, 7, 7]);
    });
  });

  it("never serves the same cuisine in adjacent slots", () => {
    // Each cuisine is stocked with both diets, so honouring the veg ratio never
    // forces the generator's hand on cuisine.
    const cuisines = ["Italian", "Indian", "Thai"];
    const meals = cuisines.flatMap((cuisine, c) =>
      Array.from({ length: 4 }, (_, i) => [
        meal(`c${c}-veg-${i}`, "veg", [...MEAL_TYPES], cuisine),
        meal(`c${c}-non-${i}`, "nonveg", [...MEAL_TYPES], cuisine),
      ]).flat()
    );
    const byId = new Map(meals.map((m) => [m.id, m]));

    repeat(25, () => {
      const slots = generateWeek({ meals, vegPercent: 50 });
      const served = slots.map((s) =>
        s.mealId ? byId.get(s.mealId)!.cuisine : ""
      );

      for (let i = 1; i < served.length; i++) {
        expect(served[i]).not.toBe(served[i - 1]);
      }
    });
  });
});

describe("regenerateSlot", () => {
  const meals = library(12);
  const target = { day: 2, mealType: "lunch" as MealType };

  function weekWith(mealId: string | null, overrides: Partial<SlotView> = {}) {
    return sortSlots(
      Array.from({ length: 7 }, (_, day) =>
        MEAL_TYPES.map((type) =>
          day === target.day && type === target.mealType
            ? slot(day, type, { mealId, ...overrides })
            : slot(day, type)
        )
      ).flat()
    );
  }

  it("changes only the target slot", () => {
    const before = weekWith("veg-0");
    const after = regenerateSlot(before, target, meals);

    expect(after).toHaveLength(before.length);
    for (let i = 0; i < before.length; i++) {
      const isTarget =
        before[i].day === target.day && before[i].mealType === target.mealType;
      if (!isTarget) expect(after[i]).toEqual(before[i]);
    }
  });

  it("keeps the current meal's diet by default", () => {
    const byId = new Map(meals.map((m) => [m.id, m]));

    repeat(10, () => {
      const after = regenerateSlot(weekWith("veg-0"), target, meals);
      const replaced = after.find(
        (s) => s.day === target.day && s.mealType === target.mealType
      )!;

      expect(byId.get(replaced.mealId!)!.diet).toBe("veg");
    });
  });

  it("honours an explicit diet preference", () => {
    const byId = new Map(meals.map((m) => [m.id, m]));

    repeat(10, () => {
      const after = regenerateSlot(weekWith("veg-0"), target, meals, "nonveg");
      const replaced = after.find(
        (s) => s.day === target.day && s.mealType === target.mealType
      )!;

      expect(byId.get(replaced.mealId!)!.diet).toBe("nonveg");
    });
  });

  it("picks a different meal when alternatives exist", () => {
    repeat(20, () => {
      const after = regenerateSlot(weekWith("veg-0"), target, meals);
      const replaced = after.find(
        (s) => s.day === target.day && s.mealType === target.mealType
      )!;

      expect(replaced.mealId).not.toBe("veg-0");
    });
  });

  it("keeps the meal when it is the only one for that slot", () => {
    const only = [meal("solo", "veg", ["lunch"])];
    const after = regenerateSlot(weekWith("solo"), target, only);
    const replaced = after.find(
      (s) => s.day === target.day && s.mealType === target.mealType
    )!;

    expect(replaced.mealId).toBe("solo");
  });

  it("leaves the slot untouched when nothing can fill it", () => {
    const after = regenerateSlot(weekWith("veg-0"), target, []);
    const replaced = after.find(
      (s) => s.day === target.day && s.mealType === target.mealType
    )!;

    expect(replaced.mealId).toBe("veg-0");
  });

  it("preserves the locked flag", () => {
    const after = regenerateSlot(
      weekWith("veg-0", { locked: true }),
      target,
      meals
    );
    const replaced = after.find(
      (s) => s.day === target.day && s.mealType === target.mealType
    )!;

    expect(replaced.locked).toBe(true);
  });

  it("only picks a meal tagged for the slot's meal type", () => {
    const typed = [
      meal("lunch-a", "veg", ["lunch"]),
      meal("lunch-b", "veg", ["lunch"]),
      meal("dinner-only", "veg", ["dinner"]),
    ];

    repeat(10, () => {
      const after = regenerateSlot(weekWith("lunch-a"), target, typed);
      const replaced = after.find(
        (s) => s.day === target.day && s.mealType === target.mealType
      )!;

      expect(replaced.mealId).toBe("lunch-b");
    });
  });

  it("prefers a meal not already used elsewhere in the week", () => {
    const three = [
      meal("a", "veg", ["lunch"]),
      meal("b", "veg", ["lunch"]),
      meal("c", "veg", ["lunch"]),
    ];
    // "b" is already eaten on another day, so regenerating should reach for "c".
    const week = weekWith("a").map((s) =>
      s.day === 5 && s.mealType === "lunch" ? { ...s, mealId: "b" } : s
    );

    repeat(10, () => {
      const after = regenerateSlot(week, target, three);
      const replaced = after.find(
        (s) => s.day === target.day && s.mealType === target.mealType
      )!;

      expect(replaced.mealId).toBe("c");
    });
  });
});

describe("sortSlots", () => {
  it("orders by day, then breakfast, lunch, dinner", () => {
    const shuffled = [
      slot(1, "dinner"),
      slot(0, "lunch"),
      slot(1, "breakfast"),
      slot(0, "dinner"),
      slot(0, "breakfast"),
      slot(1, "lunch"),
    ];

    expect(sortSlots(shuffled).map((s) => `${s.day}:${s.mealType}`)).toEqual([
      "0:breakfast",
      "0:lunch",
      "0:dinner",
      "1:breakfast",
      "1:lunch",
      "1:dinner",
    ]);
  });

  it("does not mutate the input", () => {
    const input = [slot(1, "breakfast"), slot(0, "breakfast")];
    const copy = [...input];

    sortSlots(input);

    expect(input).toEqual(copy);
  });
});
