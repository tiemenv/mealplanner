import { MEAL_TYPES, type Diet, type MealType } from "@/lib/constants";
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

/**
 * Picks the least-used meal from a pool (random among ties) to maximise
 * variety, and records the usage so subsequent picks avoid repetition.
 */
function pickLeastUsed(
  pool: MealView[],
  usage: Map<string, number>
): MealView | null {
  if (pool.length === 0) return null;
  let min = Infinity;
  for (const m of pool) min = Math.min(min, usage.get(m.id) ?? 0);
  const candidates = shuffle(pool.filter((m) => (usage.get(m.id) ?? 0) === min));
  const chosen = candidates[0];
  usage.set(chosen.id, (usage.get(chosen.id) ?? 0) + 1);
  return chosen;
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

  const result: SlotView[] = [];
  // Re-add locked slots.
  for (const slot of lockedByKey.values()) result.push(slot);

  for (const type of MEAL_TYPES) {
    const days = shuffle(unlockedByType[type]);
    const { veg, nonveg } = pools[type];
    let vegLeft = vegCount[type];

    for (const day of days) {
      let meal: MealView | null = null;
      if (vegLeft > 0 && veg.length > 0) {
        meal = pickLeastUsed(veg, usage);
        vegLeft--;
      } else if (nonveg.length > 0) {
        meal = pickLeastUsed(nonveg, usage);
      } else if (veg.length > 0) {
        meal = pickLeastUsed(veg, usage);
      }
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

  const chosen = pickLeastUsed(pool, usage);

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
