import { DIETS, MEAL_TYPES, type Diet, type MealType } from "@/lib/constants";
import type { MealView, SlotView } from "@/lib/types";

const TOTAL_DAYS = 7;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Pools {
  veg: MealView[];
  nonveg: MealView[];
}

function buildPools(meals: MealView[], type: MealType): Pools {
  const forType = meals.filter((m) => m.mealTypes.includes(type));
  return {
    veg: forType.filter((m) => m.diet === "veg"),
    nonveg: forType.filter((m) => m.diet === "nonveg"),
  };
}

/** Serving the same meal twice is worse than any amount of clustering, so
 *  this dwarfs the spacing penalties below and keeps least-used selection. */
const REUSE_PENALTY = 10_000;
/** How many slots a cuisine keeps pushing back on, and how hard it pushes
 *  from one slot away. */
const CUISINE_WINDOW = 4;
const CUISINE_PENALTY = 30;
/** Cost of serving a diet sooner than its share of the week allows. */
const DIET_SPACING_PENALTY = 150;

/** A cuisine already placed near the slot being filled. `distance` counts
 *  slots in the week's running order, so 1 is the meal right beside it. */
interface NearbyCuisine {
  distance: number;
  cuisine: string;
}

interface SlotContext {
  nearby: NearbyCuisine[];
  /** Cost of each diet here. Omitted when the slot's diet is already fixed. */
  dietCost?: Record<Diet, number>;
}

function cuisineKey(meal: MealView): string {
  return meal.cuisine.trim().toLowerCase();
}

/** Lower is better: reuse dominates, then bunching a diet or a cuisine. */
function scoreMeal(
  meal: MealView,
  usage: Map<string, number>,
  ctx: SlotContext
): number {
  let score = (usage.get(meal.id) ?? 0) * REUSE_PENALTY;
  score += ctx.dietCost?.[meal.diet] ?? 0;
  const cuisine = cuisineKey(meal);
  if (cuisine) {
    for (const n of ctx.nearby) {
      if (n.cuisine === cuisine) {
        score += (CUISINE_WINDOW - n.distance + 1) * CUISINE_PENALTY;
      }
    }
  }
  return score;
}

/**
 * Picks the best-scoring meal from a pool (random among ties) and records the
 * usage so subsequent picks avoid repetition.
 */
function pickMeal(
  pool: MealView[],
  usage: Map<string, number>,
  ctx: SlotContext
): MealView | null {
  if (pool.length === 0) return null;
  const scored = pool.map((meal) => ({
    meal,
    score: scoreMeal(meal, usage, ctx),
  }));
  let best = Infinity;
  for (const s of scored) best = Math.min(best, s.score);
  const chosen = shuffle(scored.filter((s) => s.score === best))[0].meal;
  usage.set(chosen.id, (usage.get(chosen.id) ?? 0) + 1);
  return chosen;
}

/** Cuisines close enough behind `history` to still matter. */
function precedingCuisines(history: (string | null)[]): NearbyCuisine[] {
  const nearby: NearbyCuisine[] = [];
  for (let distance = 1; distance <= CUISINE_WINDOW; distance++) {
    const cuisine = history[history.length - distance];
    if (cuisine) nearby.push({ distance, cuisine });
  }
  return nearby;
}

export interface GenerateOptions {
  meals: MealView[];
  vegPercent: number;
  /** Locked slots to preserve verbatim. */
  locked?: SlotView[];
}

/**
 * Generates a full week (7 days x breakfast/lunch/dinner) honouring locked
 * slots, targeting the requested veg ratio, and maximising variety.
 */
export function generateWeek({
  meals,
  vegPercent,
  locked = [],
}: GenerateOptions): SlotView[] {
  const mealById = new Map(meals.map((m) => [m.id, m]));
  const usage = new Map<string, number>();

  const lockedByKey = new Map<string, SlotView>();
  let lockedVeg = 0;
  for (const slot of locked) {
    if (!slot.mealId) continue;
    const meal = mealById.get(slot.mealId);
    if (!meal) continue;
    lockedByKey.set(`${slot.day}:${slot.mealType}`, {
      ...slot,
      locked: true,
    });
    usage.set(meal.id, (usage.get(meal.id) ?? 0) + 1);
    if (meal.diet === "veg") lockedVeg++;
  }

  // Collect unlocked slots, grouped by meal type.
  const unlockedByType: Record<MealType, number[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
  };
  for (let day = 0; day < TOTAL_DAYS; day++) {
    for (const type of MEAL_TYPES) {
      if (!lockedByKey.has(`${day}:${type}`)) {
        unlockedByType[type].push(day);
      }
    }
  }

  const totalSlots = TOTAL_DAYS * MEAL_TYPES.length;
  const desiredVeg = Math.round((vegPercent / 100) * totalSlots);
  let vegToPlace = Math.max(0, desiredVeg - lockedVeg);

  // Decide veg/nonveg counts per meal type, respecting availability.
  const pools: Record<MealType, Pools> = {
    breakfast: buildPools(meals, "breakfast"),
    lunch: buildPools(meals, "lunch"),
    dinner: buildPools(meals, "dinner"),
  };

  const vegCount: Record<MealType, number> = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
  };

  // Minimum veg per type: if no non-veg options exist for that type, every
  // slot there must be veg (when veg options exist).
  for (const type of MEAL_TYPES) {
    const u = unlockedByType[type].length;
    const { veg, nonveg } = pools[type];
    if (u === 0) continue;
    if (nonveg.length === 0 && veg.length > 0) {
      vegCount[type] = u;
      vegToPlace -= u;
    }
  }
  vegToPlace = Math.max(0, vegToPlace);

  // Distribute remaining veg slots to types that still have capacity.
  const capacityTypes = shuffle(
    MEAL_TYPES.filter((type) => {
      const u = unlockedByType[type].length;
      return pools[type].veg.length > 0 && vegCount[type] < u;
    })
  );
  // Round-robin so veg meals spread across breakfast/lunch/dinner.
  let progress = true;
  while (vegToPlace > 0 && progress) {
    progress = false;
    for (const type of capacityTypes) {
      if (vegToPlace <= 0) break;
      const u = unlockedByType[type].length;
      if (vegCount[type] < u && pools[type].veg.length > 0) {
        vegCount[type]++;
        vegToPlace--;
        progress = true;
      }
    }
  }

  // Remaining veg/non-veg slots per meal type. These sum to that type's
  // unlocked slot count, so the ratio decided above still lands exactly.
  const budget = {} as Record<MealType, { veg: number; nonveg: number }>;
  for (const type of MEAL_TYPES) {
    budget[type] = {
      veg: vegCount[type],
      nonveg: unlockedByType[type].length - vegCount[type],
    };
  }

  // Spread each diet by its share of the week: at 50/50 that alternates every
  // slot, while a 4-in-21 minority is held back to roughly every fifth slot
  // instead of being spent in the first two days.
  const servings: Record<Diet, number> = { veg: lockedVeg, nonveg: 0 };
  for (const type of MEAL_TYPES) servings.veg += vegCount[type];
  servings.nonveg = totalSlots - servings.veg;

  const idealGap: Record<Diet, number> = {
    veg: servings.veg > 0 ? totalSlots / servings.veg : 0,
    nonveg: servings.nonveg > 0 ? totalSlots / servings.nonveg : 0,
  };
  const lastServed: Record<Diet, number> = {
    veg: -Infinity,
    nonveg: -Infinity,
  };

  function dietCostAt(index: number): Record<Diet, number> {
    const cost = { veg: 0, nonveg: 0 };
    for (const diet of DIETS) {
      const ideal = idealGap[diet];
      if (ideal <= 0) continue;
      const gap = index - lastServed[diet];
      cost[diet] = DIET_SPACING_PENALTY * Math.max(0, (ideal - gap) / ideal);
    }
    return cost;
  }

  const result: SlotView[] = [];
  const history: (string | null)[] = [];

  // Fill in the order the week is eaten, so every pick can see the meals it
  // will sit next to and avoid echoing their diet or cuisine.
  for (let day = 0; day < TOTAL_DAYS; day++) {
    for (const type of MEAL_TYPES) {
      const index = history.length;
      const lockedSlot = lockedByKey.get(`${day}:${type}`);
      if (lockedSlot) {
        const lockedMeal = lockedSlot.mealId
          ? mealById.get(lockedSlot.mealId)
          : undefined;
        if (lockedMeal) lastServed[lockedMeal.diet] = index;
        result.push(lockedSlot);
        history.push(lockedMeal ? cuisineKey(lockedMeal) : null);
        continue;
      }

      const left = budget[type];
      const { veg, nonveg } = pools[type];
      // Offer only the diets the ratio still has room for; the scorer then
      // picks whichever of them sits best next to what came before.
      let pool = [
        ...(left.veg > 0 ? veg : []),
        ...(left.nonveg > 0 ? nonveg : []),
      ];
      if (pool.length === 0) pool = [...veg, ...nonveg];

      const meal = pickMeal(pool, usage, {
        nearby: precedingCuisines(history),
        dietCost: dietCostAt(index),
      });
      if (meal) {
        if (meal.diet === "veg") left.veg = Math.max(0, left.veg - 1);
        else left.nonveg = Math.max(0, left.nonveg - 1);
        lastServed[meal.diet] = index;
      }

      history.push(meal ? cuisineKey(meal) : null);
      result.push({
        day,
        mealType: type,
        mealId: meal ? meal.id : null,
        locked: false,
      });
    }
  }

  return sortSlots(result);
}

/** Cuisines on both sides of `index` within the ordered week. */
function surroundingCuisines(
  ordered: SlotView[],
  index: number,
  mealById: Map<string, MealView>
): NearbyCuisine[] {
  if (index < 0) return [];
  const nearby: NearbyCuisine[] = [];
  for (let distance = 1; distance <= CUISINE_WINDOW; distance++) {
    for (const i of [index - distance, index + distance]) {
      if (i < 0 || i >= ordered.length) continue;
      const mealId = ordered[i].mealId;
      const meal = mealId ? mealById.get(mealId) : undefined;
      const cuisine = meal ? cuisineKey(meal) : "";
      if (cuisine) nearby.push({ distance, cuisine });
    }
  }
  return nearby;
}

/**
 * Regenerates a single slot, avoiding meals already used elsewhere in the week
 * where possible.
 */
export function regenerateSlot(
  slots: SlotView[],
  target: { day: number; mealType: MealType },
  meals: MealView[],
  preferDiet?: Diet
): SlotView[] {
  const mealById = new Map(meals.map((m) => [m.id, m]));
  const usage = new Map<string, number>();
  for (const s of slots) {
    if (s.mealId && !(s.day === target.day && s.mealType === target.mealType)) {
      usage.set(s.mealId, (usage.get(s.mealId) ?? 0) + 1);
    }
  }

  const ordered = sortSlots(slots);
  const index = ordered.findIndex(
    (s) => s.day === target.day && s.mealType === target.mealType
  );
  const nearby = surroundingCuisines(ordered, index, mealById);

  const pools = buildPools(meals, target.mealType);
  const current = slots.find(
    (s) => s.day === target.day && s.mealType === target.mealType
  );
  const currentMeal = current?.mealId ? mealById.get(current.mealId) : null;
  const diet = preferDiet ?? currentMeal?.diet;

  let pool =
    diet === "veg" ? pools.veg : diet === "nonveg" ? pools.nonveg : [];
  if (pool.length === 0) pool = [...pools.veg, ...pools.nonveg];

  // Avoid re-picking the exact same meal if there are alternatives.
  if (currentMeal && pool.length > 1) {
    pool = pool.filter((m) => m.id !== currentMeal.id);
  }

  const chosen = pickMeal(pool, usage, { nearby });

  return slots.map((s) =>
    s.day === target.day && s.mealType === target.mealType
      ? { ...s, mealId: chosen ? chosen.id : s.mealId, locked: s.locked }
      : s
  );
}

export function sortSlots(slots: SlotView[]): SlotView[] {
  const order: Record<MealType, number> = {
    breakfast: 0,
    lunch: 1,
    dinner: 2,
  };
  return [...slots].sort(
    (a, b) => a.day - b.day || order[a.mealType] - order[b.mealType]
  );
}
