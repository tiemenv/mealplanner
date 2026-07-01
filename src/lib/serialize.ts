import type { MealDoc } from "@/models/Meal";
import type { MealPlanDoc } from "@/models/MealPlan";
import type { MealView, MealPlanView } from "@/lib/types";
import type { Diet, MealType } from "@/lib/constants";

export function serializeMeal(doc: MealDoc): MealView {
  return {
    id: doc._id.toString(),
    name: doc.name,
    diet: doc.diet as Diet,
    mealTypes: (doc.mealTypes ?? []) as MealType[],
    cuisine: doc.cuisine ?? "",
    imageUrl: doc.imageUrl ?? "",
    ingredients: doc.ingredients ?? [],
    recipe: doc.recipe ?? "",
    recipeUrl: doc.recipeUrl ?? "",
  };
}

export function serializeMealPlan(doc: MealPlanDoc): MealPlanView {
  return {
    id: doc._id.toString(),
    weekStart: doc.weekStart,
    vegPercent: doc.vegPercent ?? 50,
    slots: (doc.slots ?? []).map((s) => ({
      day: s.day,
      mealType: s.mealType as MealType,
      mealId: s.mealId ? s.mealId.toString() : null,
      locked: !!s.locked,
    })),
  };
}
