import type { MealView } from "@/lib/types";

export type UnitSystem = "metric" | "imperial";
type Dimension = "mass" | "volume" | "count";

/** Recipes' ingredient amounts are assumed to serve this many people. */
export const BASE_SERVINGS = 2;

interface UnitDef {
  dim: Dimension;
  /** Factor to the dimension's base unit (grams for mass, ml for volume). */
  toBase: number;
}

// Singular keys; we strip a trailing "s" before lookup.
const UNITS: Record<string, UnitDef> = {
  // mass
  g: { dim: "mass", toBase: 1 },
  gram: { dim: "mass", toBase: 1 },
  gr: { dim: "mass", toBase: 1 },
  kg: { dim: "mass", toBase: 1000 },
  kilogram: { dim: "mass", toBase: 1000 },
  oz: { dim: "mass", toBase: 28.3495 },
  ounce: { dim: "mass", toBase: 28.3495 },
  lb: { dim: "mass", toBase: 453.592 },
  pound: { dim: "mass", toBase: 453.592 },
  // volume
  ml: { dim: "volume", toBase: 1 },
  milliliter: { dim: "volume", toBase: 1 },
  millilitre: { dim: "volume", toBase: 1 },
  l: { dim: "volume", toBase: 1000 },
  liter: { dim: "volume", toBase: 1000 },
  litre: { dim: "volume", toBase: 1000 },
  tsp: { dim: "volume", toBase: 4.92892 },
  teaspoon: { dim: "volume", toBase: 4.92892 },
  tbsp: { dim: "volume", toBase: 14.7868 },
  tablespoon: { dim: "volume", toBase: 14.7868 },
  cup: { dim: "volume", toBase: 236.588 },
  pint: { dim: "volume", toBase: 473.176 },
  quart: { dim: "volume", toBase: 946.353 },
  gallon: { dim: "volume", toBase: 3785.41 },
};

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "¼": 0.25,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
};

// Ingredients that are used "to taste" rather than bought by amount.
const TO_TASTE = new Set([
  "salt",
  "pepper",
  "black pepper",
  "salt & pepper",
  "salt and pepper",
  "water",
]);

export interface ParsedIngredient {
  quantity: number | null;
  unit: string | null;
  name: string;
}

function parseQuantityToken(token: string): number | null {
  if (UNICODE_FRACTIONS[token] !== undefined) return UNICODE_FRACTIONS[token];
  if (/^\d+\/\d+$/.test(token)) {
    const [a, b] = token.split("/").map(Number);
    return b ? a / b : null;
  }
  if (/^\d+(\.\d+)?$/.test(token)) return parseFloat(token);
  return null;
}

export function parseIngredient(raw: string): ParsedIngredient {
  let rest = raw.trim();
  if (!rest) return { quantity: null, unit: null, name: "" };

  // Leading quantity: handle ranges ("1-2"), mixed numbers ("1 1/2"),
  // decimals, fractions and unicode fractions.
  let quantity: number | null = null;
  const rangeMatch = rest.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\b/);
  if (rangeMatch) {
    quantity = (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
    rest = rest.slice(rangeMatch[0].length).trim();
  } else {
    const tokens = rest.split(/\s+/);
    const first = parseQuantityToken(tokens[0]);
    if (first !== null) {
      quantity = first;
      tokens.shift();
      // mixed number e.g. "1 1/2"
      if (tokens[0]) {
        const frac = parseQuantityToken(tokens[0]);
        if (frac !== null && frac < 1) {
          quantity += frac;
          tokens.shift();
        }
      }
      rest = tokens.join(" ");
    }
  }

  // Optional unit immediately after the quantity.
  let unit: string | null = null;
  if (quantity !== null) {
    const tokens = rest.split(/\s+/);
    const head = tokens[0]?.toLowerCase().replace(/\.$/, "");
    const singular = head?.endsWith("s") ? head.slice(0, -1) : head;
    if (head && (UNITS[head] || (singular && UNITS[singular]))) {
      unit = UNITS[head] ? head : singular!;
      tokens.shift();
      rest = tokens.join(" ");
    }
  }

  return { quantity, unit, name: rest.trim() };
}

function dimensionOf(unit: string | null): Dimension {
  if (!unit) return "count";
  const def = UNITS[unit] ?? UNITS[unit.replace(/s$/, "")];
  return def?.dim ?? "count";
}

function toBase(quantity: number, unit: string | null): number {
  if (!unit) return quantity;
  const def = UNITS[unit] ?? UNITS[unit.replace(/s$/, "")];
  return def ? quantity * def.toBase : quantity;
}

function trim(n: number): string {
  return n
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
}

function formatMass(grams: number, system: UnitSystem): string {
  if (system === "imperial") {
    const oz = grams / 28.3495;
    if (oz >= 16) return `${trim(oz / 16)} lb`;
    return `${trim(oz)} oz`;
  }
  if (grams >= 1000) return `${trim(grams / 1000)} kg`;
  return `${trim(grams)} g`;
}

function formatVolume(ml: number, system: UnitSystem): string {
  if (system === "imperial") {
    const cups = ml / 236.588;
    if (cups >= 0.25) return `${trim(cups)} cup${cups >= 2 ? "s" : ""}`;
    return `${trim(ml / 29.5735)} fl oz`;
  }
  if (ml >= 1000) return `${trim(ml / 1000)} L`;
  return `${trim(ml)} ml`;
}

export interface ShoppingItem {
  name: string;
  /** Human-readable quantity, e.g. "1.5 kg", "3 cups", "×4", "to taste". */
  amount: string;
  /** Number of planned dishes that use this ingredient. */
  dishes: number;
}

function titleCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Aggregates ingredients across the given planned meals (pass duplicates for
 * meals scheduled multiple times), scaled from BASE_SERVINGS to householdSize,
 * and formatted in the chosen unit system.
 */
export function buildShoppingList(
  plannedMeals: MealView[],
  system: UnitSystem,
  householdSize: number
): ShoppingItem[] {
  const scale = householdSize / BASE_SERVINGS;

  interface Acc {
    name: string;
    dim: Dimension;
    base: number; // grams / ml / count
    dishes: number;
    toTaste: boolean;
  }
  const map = new Map<string, Acc>();

  for (const meal of plannedMeals) {
    for (const raw of meal.ingredients) {
      const p = parseIngredient(raw);
      if (!p.name) continue;
      const nameKey = p.name.toLowerCase();
      const dim = dimensionOf(p.unit);
      const key = `${nameKey}|${dim}`;
      const qty = (p.quantity ?? 1) * scale;

      const existing = map.get(key);
      if (existing) {
        existing.base += toBase(qty, p.unit);
        existing.dishes += 1;
      } else {
        map.set(key, {
          name: titleCase(p.name),
          dim,
          base: toBase(qty, p.unit),
          dishes: 1,
          toTaste: TO_TASTE.has(nameKey),
        });
      }
    }
  }

  const items: ShoppingItem[] = [...map.values()].map((acc) => {
    let amount: string;
    if (acc.toTaste) {
      amount = "to taste";
    } else if (acc.dim === "mass") {
      amount = formatMass(acc.base, system);
    } else if (acc.dim === "volume") {
      amount = formatVolume(acc.base, system);
    } else {
      amount = `×${Math.max(1, Math.ceil(acc.base))}`;
    }
    return { name: acc.name, amount, dishes: acc.dishes };
  });

  return items.sort((a, b) => a.name.localeCompare(b.name));
}

/** Plain-text version for copying to the clipboard. */
export function shoppingListToText(items: ShoppingItem[]): string {
  return items.map((i) => `- ${i.name}: ${i.amount}`).join("\n");
}
