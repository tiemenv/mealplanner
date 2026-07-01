"use server";

import { revalidatePath } from "next/cache";
import { dbConnect } from "@/lib/mongoose";
import { getSession } from "@/lib/workspace";
import { Meal, type MealDoc } from "@/models/Meal";
import { MealPlan, type MealPlanDoc } from "@/models/MealPlan";
import { serializeMeal, serializeMealPlan } from "@/lib/serialize";
import { generateWeek, regenerateSlot, sortSlots } from "@/lib/generate";
import type { MealPlanView, SlotView } from "@/lib/types";
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
  }));
}

export async function generatePlan(
  weekStart: string,
  vegPercent: number
): Promise<PlanResult> {
  const session = await getSession();
  await dbConnect();
  const ownerKey = session.workspace.ownerKey;

  const meals = await loadMeals(ownerKey);
  if (meals.length === 0) {
    return { ok: false, error: "Add some meals to your library first." };
  }

  const existing = (await MealPlan.findOne({
    ownerKey,
    weekStart,
  }).lean()) as MealPlanDoc | null;

  const locked: SlotView[] = existing
    ? serializeMealPlan(existing).slots.filter((s) => s.locked && s.mealId)
    : [];

  const slots = generateWeek({ meals, vegPercent, locked });

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
    { upsert: true, new: true }
  ).lean()) as MealPlanDoc;

  revalidatePath("/dashboard");
  return { ok: true, plan: serializeMealPlan(doc) };
}

async function mutatePlan(
  weekStart: string,
  mutate: (slots: SlotView[], meals: ReturnType<typeof serializeMeal>[]) => SlotView[]
): Promise<PlanResult> {
  const session = await getSession();
  await dbConnect();
  const ownerKey = session.workspace.ownerKey;

  const existing = (await MealPlan.findOne({
    ownerKey,
    weekStart,
  }).lean()) as MealPlanDoc | null;
  if (!existing) {
    return { ok: false, error: "Generate a plan first." };
  }

  const meals = await loadMeals(ownerKey);
  const slots = mutate(serializeMealPlan(existing).slots, meals);

  const doc = (await MealPlan.findOneAndUpdate(
    { ownerKey, weekStart },
    { $set: { slots: toStoredSlots(sortSlots(slots)) } },
    { new: true }
  ).lean()) as MealPlanDoc;

  revalidatePath("/dashboard");
  return { ok: true, plan: serializeMealPlan(doc) };
}

export async function regenerateOneSlot(
  weekStart: string,
  day: number,
  mealType: MealType
): Promise<PlanResult> {
  return mutatePlan(weekStart, (slots, meals) => {
    const slot = slots.find((s) => s.day === day && s.mealType === mealType);
    if (slot?.locked) return slots; // don't touch locked slots
    return regenerateSlot(slots, { day, mealType }, meals);
  });
}

export async function setSlotMeal(
  weekStart: string,
  day: number,
  mealType: MealType,
  mealId: string | null
): Promise<PlanResult> {
  return mutatePlan(weekStart, (slots) =>
    slots.map((s) =>
      s.day === day && s.mealType === mealType ? { ...s, mealId } : s
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
        return { ...x, mealId: tMeal };
      }
      if (x.day === target.day && x.mealType === target.mealType) {
        return { ...x, mealId: sMeal };
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
        ? { ...s, mealId: null, locked: false }
        : s
    )
  );
}
