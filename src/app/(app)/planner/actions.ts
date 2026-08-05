"use server";

import { dbConnect } from "@/lib/mongoose";
import { getSession } from "@/lib/workspace";
import { Meal, type MealDoc } from "@/models/Meal";
import { MealPlan, type MealPlanDoc } from "@/models/MealPlan";
import { serializeMeal, serializeMealPlan } from "@/lib/serialize";
import { generateWeek, regenerateSlot, sortSlots } from "@/lib/generate";
import type { MealPlanView, MealView, SlotView } from "@/lib/types";
import type { MealType } from "@/lib/constants";

export interface PlanResult {
  ok: boolean;
  error?: string;
  plan?: MealPlanView;
}

async function loadMeals(ownerKey: string) {
  const docs = (await Meal.find({ ownerKey }).lean()) as unknown as MealDoc[];
  return docs.map(serializeMeal);
}

function toStoredSlots(slots: SlotView[]) {
  return slots.map((s) => ({
    day: s.day,
    mealType: s.mealType,
    mealId: s.mealId ?? null,
    locked: !!s.locked,
    // A slot holding a meal is never a wildcard, whatever the caller passed.
    wildcard: !s.mealId && !!s.wildcard,
  }));
}

export async function generatePlan(
  weekStart: string,
  vegPercent: number
): Promise<PlanResult> {
  const session = await getSession();
  await dbConnect();
  const ownerKey = session.workspace.ownerKey;

  const [meals, existing] = await Promise.all([
    loadMeals(ownerKey),
    MealPlan.findOne({ ownerKey, weekStart }).lean() as Promise<MealPlanDoc | null>,
  ]);
  if (meals.length === 0) {
    return { ok: false, error: "Add some meals to your library first." };
  }

  const previous: SlotView[] = existing
    ? serializeMealPlan(existing).slots
    : [];

  const slots = generateWeek({
    meals,
    vegPercent,
    locked: previous.filter((s) => s.locked && s.mealId),
    wildcards: previous.filter((s) => s.wildcard),
  });

  const doc = (await MealPlan.findOneAndUpdate(
    { ownerKey, weekStart },
    {
      $set: {
        vegPercent,
        slots: toStoredSlots(slots),
        createdByClerkId: session.clerkId,
      },
      $setOnInsert: { ownerKey, weekStart },
    },
    { upsert: true, returnDocument: "after" }
  ).lean()) as MealPlanDoc;

  return { ok: true, plan: serializeMealPlan(doc) };
}

/**
 * Every plan edit returns the saved plan and the client renders that, so none of
 * these actions revalidate /planner. Revalidating would re-run the layout and
 * page on the server just to produce a plan the client already has, and it also
 * marks every other visited page stale.
 */
async function mutatePlan(
  weekStart: string,
  mutate: (slots: SlotView[], meals: MealView[]) => SlotView[],
  /** Only slot regeneration picks a new meal; the rest just move ids around. */
  options: { withMeals?: boolean } = {}
): Promise<PlanResult> {
  const session = await getSession();
  await dbConnect();
  const ownerKey = session.workspace.ownerKey;

  const [existing, meals] = await Promise.all([
    MealPlan.findOne({ ownerKey, weekStart }).lean() as Promise<MealPlanDoc | null>,
    options.withMeals ? loadMeals(ownerKey) : Promise.resolve([]),
  ]);
  if (!existing) {
    return { ok: false, error: "Generate a plan first." };
  }

  const slots = mutate(serializeMealPlan(existing).slots, meals);

  const doc = (await MealPlan.findOneAndUpdate(
    { ownerKey, weekStart },
    { $set: { slots: toStoredSlots(sortSlots(slots)) } },
    { returnDocument: "after" }
  ).lean()) as MealPlanDoc;

  return { ok: true, plan: serializeMealPlan(doc) };
}

export async function regenerateOneSlot(
  weekStart: string,
  day: number,
  mealType: MealType
): Promise<PlanResult> {
  return mutatePlan(
    weekStart,
    (slots, meals) => {
      const slot = slots.find((s) => s.day === day && s.mealType === mealType);
      // Locked and wildcard slots are both deliberate choices; leave them be.
      if (slot?.locked || slot?.wildcard) return slots;
      return regenerateSlot(slots, { day, mealType }, meals);
    },
    { withMeals: true }
  );
}

export async function setSlotMeal(
  weekStart: string,
  day: number,
  mealType: MealType,
  mealId: string | null
): Promise<PlanResult> {
  return mutatePlan(weekStart, (slots) =>
    slots.map((s) =>
      s.day === day && s.mealType === mealType
        ? { ...s, mealId, wildcard: false }
        : s
    )
  );
}

/** Marks a slot as deliberately open, so the generator plans around it. */
export async function setSlotWildcard(
  weekStart: string,
  day: number,
  mealType: MealType
): Promise<PlanResult> {
  return mutatePlan(weekStart, (slots) =>
    slots.map((s) =>
      s.day === day && s.mealType === mealType
        ? { ...s, mealId: null, wildcard: true }
        : s
    )
  );
}

/**
 * Moves/swaps the meal from one slot to another (drag & drop). If the target
 * slot has a meal, the two are swapped; otherwise the meal is moved and the
 * source becomes empty. Locked slots are not affected.
 */
export async function moveSlot(
  weekStart: string,
  source: { day: number; mealType: MealType },
  target: { day: number; mealType: MealType }
): Promise<PlanResult> {
  if (source.day === target.day && source.mealType === target.mealType) {
    return mutatePlan(weekStart, (slots) => slots);
  }
  return mutatePlan(weekStart, (slots) => {
    const s = slots.find(
      (x) => x.day === source.day && x.mealType === source.mealType
    );
    const t = slots.find(
      (x) => x.day === target.day && x.mealType === target.mealType
    );
    if (!s || !t || s.locked || t.locked) return slots;
    const sMeal = s.mealId;
    const tMeal = t.mealId;
    return slots.map((x) => {
      if (x.day === source.day && x.mealType === source.mealType) {
        return { ...x, mealId: tMeal, wildcard: tMeal ? false : x.wildcard };
      }
      if (x.day === target.day && x.mealType === target.mealType) {
        return { ...x, mealId: sMeal, wildcard: sMeal ? false : x.wildcard };
      }
      return x;
    });
  });
}

export async function toggleSlotLock(
  weekStart: string,
  day: number,
  mealType: MealType
): Promise<PlanResult> {
  return mutatePlan(weekStart, (slots) =>
    slots.map((s) =>
      s.day === day && s.mealType === mealType
        ? { ...s, locked: !s.locked }
        : s
    )
  );
}

export async function clearSlot(
  weekStart: string,
  day: number,
  mealType: MealType
): Promise<PlanResult> {
  return mutatePlan(weekStart, (slots) =>
    slots.map((s) =>
      s.day === day && s.mealType === mealType
        ? { ...s, mealId: null, locked: false, wildcard: false }
        : s
    )
  );
}
