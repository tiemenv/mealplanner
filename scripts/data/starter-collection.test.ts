import { describe, expect, it } from "vitest";

import { DIETS, MEAL_TYPES, type Diet, type MealType } from "../../src/lib/constants";
import { generateWeek } from "../../src/lib/generate";
import { BASE_SERVINGS, buildShoppingList, parseIngredient } from "../../src/lib/shopping";
import type { MealView } from "../../src/lib/types";
import {
  STARTER_COLLECTION,
  STARTER_MEALS,
  summarizeStarterMeals,
  type StarterMeal,
} from "./starter-collection";

const TOTAL_SLOTS = 21;
const SLOTS_PER_MEAL_TYPE = 7;

/** The collection as the planner sees it once it has been imported: the import
 *  copies these fields verbatim, so generating against them is the same
 *  exercise a tester's first week is. */
function asMealViews(meals: StarterMeal[] = STARTER_MEALS): MealView[] {
  return meals.map((meal) => ({
    id: meal.key,
    name: meal.name,
    diet: meal.diet,
    mealTypes: meal.mealTypes,
    cuisine: meal.cuisine,
    imageUrl: "",
    ingredients: meal.ingredients,
    recipe: meal.recipe,
    recipeUrl: "",
  }));
}

function repeat(times: number, run: (iteration: number) => void) {
  for (let i = 0; i < times; i++) run(i);
}

/** How often each meal is served across a generated week. */
function usage(slots: { mealId: string | null }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const slot of slots) {
    if (slot.mealId) counts.set(slot.mealId, (counts.get(slot.mealId) ?? 0) + 1);
  }
  return counts;
}

const summary = summarizeStarterMeals(STARTER_MEALS);

describe("starter collection balance", () => {
  it("carries enough meals to be worth importing", () => {
    expect(STARTER_MEALS.length).toBeGreaterThanOrEqual(24);
  });

  it("has at least a week of distinct meals for every meal type", () => {
    for (const type of MEAL_TYPES) {
      expect(summary.byMealType[type]).toBeGreaterThanOrEqual(
        SLOTS_PER_MEAL_TYPE
      );
    }
  });

  it("stocks both diets at every meal type, so the veg slider has somewhere to go", () => {
    for (const type of MEAL_TYPES) {
      for (const diet of DIETS) {
        // Below four, an extreme slider setting starts serving the same dish
        // three times in a week.
        expect(summary.byMealTypeAndDiet[type][diet]).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("keeps the two diets within reach of an even split", () => {
    const share = summary.byDiet.veg / summary.total;
    expect(share).toBeGreaterThan(0.4);
    expect(share).toBeLessThan(0.6);
  });

  it("spreads across cuisines rather than leaning on one", () => {
    const cuisines = Object.entries(summary.byCuisine);
    expect(cuisines.length).toBeGreaterThanOrEqual(8);

    for (const [cuisine, count] of cuisines) {
      expect(cuisine).not.toBe("");
      expect(count / summary.total).toBeLessThanOrEqual(0.25);
    }

    // Variety only reaches the plan if it reaches each pool: the generator
    // spaces cuisines within a four-slot window, which needs options.
    for (const type of MEAL_TYPES) {
      const pool = STARTER_MEALS.filter((meal) => meal.mealTypes.includes(type));
      expect(new Set(pool.map((meal) => meal.cuisine)).size).toBeGreaterThanOrEqual(5);
    }
  });
});

describe("a week generated from the starter collection", () => {
  const meals = asMealViews();

  it("fills every slot at any veg setting", () => {
    for (const vegPercent of [0, 25, 50, 75, 100]) {
      repeat(20, () => {
        const slots = generateWeek({ meals, vegPercent });

        expect(slots).toHaveLength(TOTAL_SLOTS);
        expect(slots.filter((slot) => slot.mealId === null)).toEqual([]);
      });
    }
  });

  it("serves 21 different meals at a balanced setting", () => {
    repeat(20, () => {
      const slots = generateWeek({ meals, vegPercent: 50 });

      expect(usage(slots).size).toBe(TOTAL_SLOTS);
    });
  });

  it("never serves the same dish more than twice, even at the extremes", () => {
    // Pushing the slider all the way narrows the pool to one diet, so some
    // repetition is unavoidable. Twice in a week is the ceiling; a third
    // serving would mean the pool is genuinely too thin.
    for (const vegPercent of [0, 100]) {
      repeat(20, () => {
        const slots = generateWeek({ meals, vegPercent });
        const uses = usage(slots);

        expect(Math.max(...uses.values())).toBeLessThanOrEqual(2);
        expect(uses.size).toBeGreaterThanOrEqual(14);
      });
    }
  });

  it("honours the veg share it is asked for", () => {
    const dietById = new Map(STARTER_MEALS.map((m) => [m.key, m.diet]));
    const served = (vegPercent: number, diet: Diet) =>
      generateWeek({ meals, vegPercent }).filter(
        (slot) => slot.mealId && dietById.get(slot.mealId) === diet
      ).length;

    repeat(10, () => {
      expect(served(100, "veg")).toBe(TOTAL_SLOTS);
      expect(served(0, "nonveg")).toBe(TOTAL_SLOTS);
      // Math.round(0.5 * 21) === 11.
      expect(served(50, "veg")).toBe(11);
    });
  });

  it("puts a meal only in a slot it is tagged for", () => {
    const typesById = new Map<string, MealType[]>(
      STARTER_MEALS.map((m) => [m.key, m.mealTypes])
    );

    repeat(10, () => {
      for (const slot of generateWeek({ meals, vegPercent: 50 })) {
        expect(typesById.get(slot.mealId!)).toContain(slot.mealType);
      }
    });
  });
});

describe("starter collection records", () => {
  it("gives every meal a unique, slug-shaped key", () => {
    for (const meal of STARTER_MEALS) {
      expect(meal.key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
    expect(new Set(STARTER_MEALS.map((m) => m.key)).size).toBe(
      STARTER_MEALS.length
    );
  });

  it("names each dish once, since imports de-dupe on name", () => {
    const names = STARTER_MEALS.map((m) => m.name.trim().toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("satisfies the schema's required fields", () => {
    for (const meal of STARTER_MEALS) {
      expect(meal.name.trim()).not.toBe("");
      expect(DIETS).toContain(meal.diet);
      expect(meal.mealTypes.length).toBeGreaterThan(0);
      for (const type of meal.mealTypes) expect(MEAL_TYPES).toContain(type);
    }
  });

  it("gives every meal a recipe that can actually be cooked from", () => {
    for (const meal of STARTER_MEALS) {
      const steps = meal.recipe.split("\n");
      expect(steps.length).toBeGreaterThanOrEqual(4);
      steps.forEach((step, index) => {
        expect(step).toMatch(new RegExp(`^${index + 1}\\. `));
        expect(step.length).toBeGreaterThan(20);
      });
      expect(meal.ingredients.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("leaves images unset rather than inventing links", () => {
    const withUrls = JSON.stringify(STARTER_MEALS).match(/https?:\/\//g);
    expect(withUrls).toBeNull();
  });

  it("has a stable slug, which is what keeps re-publishing idempotent", () => {
    expect(STARTER_COLLECTION.slug).toBe("everyday-starter-kit");
    expect(STARTER_COLLECTION.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe("starter collection quantities", () => {
  /** Bought once and used to taste; the shopping list prices them that way. */
  const UNMEASURED = new Set(["salt", "black pepper", "water"]);

  it("gives every ingredient a quantity the shopping list can parse", () => {
    for (const meal of STARTER_MEALS) {
      for (const line of meal.ingredients) {
        const parsed = parseIngredient(line);
        expect(parsed.name).not.toBe("");

        if (UNMEASURED.has(parsed.name.toLowerCase())) {
          expect(parsed.quantity).toBeNull();
        } else {
          expect(parsed.quantity, `${meal.name}: "${line}"`).not.toBeNull();
          expect(parsed.quantity!).toBeGreaterThan(0);
        }
      }
    }
  });

  it("writes amounts for two, so scaling to a household multiplies them", () => {
    expect(BASE_SERVINGS).toBe(2);

    const [rice] = STARTER_MEALS.filter((m) => m.key === "chana-masala").map(
      (m) => m
    );
    const view = asMealViews([rice])[0];

    const forTwo = buildShoppingList([view], "metric", 2);
    const forFour = buildShoppingList([view], "metric", 4);

    expect(forTwo.find((i) => i.name === "Chickpeas")?.amount).toBe("400 g");
    expect(forFour.find((i) => i.name === "Chickpeas")?.amount).toBe("800 g");
    expect(forTwo.find((i) => i.name === "Salt")?.amount).toBe("to taste");
  });

  it("produces a sane shopping list for a whole generated week", () => {
    const meals = asMealViews();
    const byId = new Map(meals.map((m) => [m.id, m]));
    const week = generateWeek({ meals, vegPercent: 50 })
      .map((slot) => (slot.mealId ? byId.get(slot.mealId)! : null))
      .filter((meal): meal is MealView => meal !== null);

    const list = buildShoppingList(week, "metric", 4);

    expect(week).toHaveLength(TOTAL_SLOTS);
    expect(list.length).toBeGreaterThan(30);
    for (const item of list) {
      expect(item.name).not.toBe("");
      // "0 g" or "NaN" here would mean a quantity the parser choked on.
      expect(item.amount).toMatch(/^(to taste|×\d+|[\d.]+ (g|kg|ml|L))$/);
    }
  });
});
