"use server";

import { revalidatePath } from "next/cache";
import { dbConnect } from "@/lib/mongoose";
import { Meal } from "@/models/Meal";
import { getSession, rejectImpersonators } from "@/lib/workspace";
import {
  alreadyOwned,
  getVisibleCollection,
  ownedMeals,
  type CollectionMeal,
} from "@/lib/collections";

export interface ImportResult {
  ok: boolean;
  error?: string;
  /** How many meals landed in the library. */
  added?: number;
  /** Meals left alone because the library already had them. */
  skipped?: number;
}

function toDoc(
  meal: CollectionMeal,
  collectionId: string,
  ownerKey: string,
  clerkId: string
) {
  return {
    ownerKey,
    name: meal.name,
    diet: meal.diet,
    mealTypes: meal.mealTypes,
    cuisine: meal.cuisine,
    imageUrl: meal.imageUrl,
    ingredients: meal.ingredients,
    recipe: meal.recipe,
    recipeUrl: meal.recipeUrl,
    // The id, not the slug: a creator can reword a title, and provenance that
    // shifts underneath existing meals would strand their badges.
    sourceCollection: collectionId,
    sourceMealKey: meal.key,
    createdByClerkId: clerkId,
  };
}

/** Adds every meal in a collection that the library does not already have. */
export async function importCollection(slug: string): Promise<ImportResult> {
  const blocked = await rejectImpersonators();
  if (blocked) return { ok: false, error: blocked };

  const session = await getSession();
  const collection = await getVisibleCollection(slug, session.clerkId);
  if (!collection) return { ok: false, error: "That collection doesn't exist." };

  await dbConnect();

  const owned = await ownedMeals(session.workspace.ownerKey);
  const fresh = collection.meals.filter(
    (meal) => !alreadyOwned(collection.id, meal, owned)
  );

  if (fresh.length > 0) {
    await Meal.insertMany(
      fresh.map((meal) =>
        toDoc(
          meal,
          collection.id,
          session.workspace.ownerKey,
          session.clerkId
        )
      )
    );
    revalidatePath("/library");
    revalidatePath("/planner");
    revalidatePath("/collections");
  }

  return {
    ok: true,
    added: fresh.length,
    skipped: collection.meals.length - fresh.length,
  };
}

/** Adds a single meal from a collection. */
export async function importCollectionMeal(
  slug: string,
  key: string
): Promise<ImportResult> {
  const blocked = await rejectImpersonators();
  if (blocked) return { ok: false, error: blocked };

  const session = await getSession();
  const collection = await getVisibleCollection(slug, session.clerkId);
  const meal = collection?.meals.find((m) => m.key === key);
  if (!collection || !meal) {
    return { ok: false, error: "That meal is no longer in the collection." };
  }

  await dbConnect();

  const owned = await ownedMeals(session.workspace.ownerKey);
  if (alreadyOwned(collection.id, meal, owned)) {
    return { ok: true, added: 0, skipped: 1 };
  }

  await Meal.create(
    toDoc(meal, collection.id, session.workspace.ownerKey, session.clerkId)
  );

  revalidatePath("/library");
  revalidatePath("/planner");
  revalidatePath("/collections");
  return { ok: true, added: 1, skipped: 0 };
}
