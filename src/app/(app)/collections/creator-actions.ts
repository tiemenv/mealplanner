"use server";

import { revalidatePath } from "next/cache";
import { dbConnect } from "@/lib/mongoose";
import { Meal } from "@/models/Meal";
import { Collection, type CollectionStatus } from "@/models/Collection";
import { getSession, rejectImpersonators } from "@/lib/workspace";
import { requireCreator } from "@/lib/roles";
import { slugify, uniqueSlug } from "@/lib/collections";
import { type Diet, type MealType } from "@/lib/constants";

export interface CreatorResult {
  ok: boolean;
  error?: string;
  /** Set by createCollection so the caller can navigate to the editor. */
  slug?: string;
  /** Set by addMealsToCollection: meals already in the collection are skipped. */
  added?: number;
}

export interface CollectionDetailsInput {
  title: string;
  description: string;
  cuisine: string;
  coverImageUrl: string;
}

/** Every authoring action starts here: the role decides whether someone may
 *  curate at all, and the Clerk id scopes them to their own collections. */
async function creatorSession() {
  const blocked = await rejectImpersonators();
  if (blocked) return { error: blocked } as const;

  try {
    await requireCreator();
  } catch {
    return { error: "You don't have access to curate collections." } as const;
  }

  const session = await getSession();
  await dbConnect();
  return { session } as const;
}

function validateDetails(input: CollectionDetailsInput): string | null {
  if (!input.title?.trim()) return "Give the collection a title.";
  if (input.title.trim().length > 80) return "Keep the title under 80 characters.";
  if ((input.description ?? "").length > 600) {
    return "Keep the description under 600 characters.";
  }
  return null;
}

/** Refreshes the paths a change to one collection can be seen from. */
function revalidateCollection(slug: string) {
  revalidatePath("/collections");
  revalidatePath("/collections/mine");
  revalidatePath(`/collections/${slug}`);
  revalidatePath(`/collections/${slug}/edit`);
}

export async function createCollection(
  input: CollectionDetailsInput
): Promise<CreatorResult> {
  const gate = await creatorSession();
  if ("error" in gate) return { ok: false, error: gate.error };

  const invalid = validateDetails(input);
  if (invalid) return { ok: false, error: invalid };

  const { session } = gate;
  const slug = await uniqueSlug(input.title);

  await Collection.create({
    slug,
    title: input.title.trim(),
    description: (input.description ?? "").trim(),
    cuisine: (input.cuisine ?? "").trim(),
    coverImageUrl: (input.coverImageUrl ?? "").trim(),
    status: "draft",
    creatorClerkId: session.clerkId,
    creatorName: session.name,
    creatorImageUrl: session.imageUrl,
    meals: [],
  });

  revalidateCollection(slug);
  return { ok: true, slug };
}

export async function updateCollection(
  slug: string,
  input: CollectionDetailsInput
): Promise<CreatorResult> {
  const gate = await creatorSession();
  if ("error" in gate) return { ok: false, error: gate.error };

  const invalid = validateDetails(input);
  if (invalid) return { ok: false, error: invalid };

  // The slug is deliberately left alone: a published collection's link has to
  // survive its title being reworded.
  const result = await Collection.updateOne(
    { slug, creatorClerkId: gate.session.clerkId },
    {
      $set: {
        title: input.title.trim(),
        description: (input.description ?? "").trim(),
        cuisine: (input.cuisine ?? "").trim(),
        coverImageUrl: (input.coverImageUrl ?? "").trim(),
      },
    }
  );

  if (result.matchedCount === 0) {
    return { ok: false, error: "That collection isn't yours to edit." };
  }

  revalidateCollection(slug);
  return { ok: true };
}

/** Keys stay readable, stay stable, and stay unique within one collection. */
function mealKey(name: string, taken: Set<string>): string {
  const base = slugify(name) || "meal";
  let key = base;
  for (let n = 2; taken.has(key); n++) key = `${base}-${n}`;
  taken.add(key);
  return key;
}

/** Copies meals out of the creator's own library into the collection. The
 *  ownerKey filter is what limits a collection to meals they actually have. */
export async function addMealsToCollection(
  slug: string,
  mealIds: string[]
): Promise<CreatorResult> {
  const gate = await creatorSession();
  if ("error" in gate) return { ok: false, error: gate.error };

  const { session } = gate;
  const ids = (mealIds ?? []).filter(Boolean);
  if (ids.length === 0) return { ok: false, error: "Pick at least one meal." };

  const collection = await Collection.findOne({
    slug,
    creatorClerkId: session.clerkId,
  });
  if (!collection) {
    return { ok: false, error: "That collection isn't yours to edit." };
  }

  const meals = (await Meal.find({
    _id: { $in: ids },
    ownerKey: session.workspace.ownerKey,
  }).lean()) as {
    _id: { toString(): string };
    name: string;
    diet: Diet;
    mealTypes: MealType[];
    cuisine?: string;
    imageUrl?: string;
    ingredients?: string[];
    recipe?: string;
    recipeUrl?: string;
  }[];

  if (meals.length === 0) {
    return { ok: false, error: "Those meals aren't in your library." };
  }

  const existing = collection.meals as { key: string; sourceMealId?: unknown }[];
  const taken = new Set(existing.map((meal) => meal.key));
  const present = new Set(
    existing
      .filter((meal) => meal.sourceMealId)
      .map((meal) => String(meal.sourceMealId))
  );

  // Snapshot rather than reference: readers must not see a published
  // collection change when the creator later edits or deletes the meal.
  const fresh = meals
    .filter((meal) => !present.has(meal._id.toString()))
    .map((meal) => ({
      key: mealKey(meal.name, taken),
      name: meal.name,
      diet: meal.diet,
      mealTypes: meal.mealTypes,
      cuisine: meal.cuisine ?? "",
      imageUrl: meal.imageUrl ?? "",
      ingredients: meal.ingredients ?? [],
      recipe: meal.recipe ?? "",
      recipeUrl: meal.recipeUrl ?? "",
      sourceMealId: meal._id,
    }));

  if (fresh.length > 0) {
    collection.meals.push(...fresh);
    await collection.save();
    revalidateCollection(slug);
  }

  return { ok: true, added: fresh.length };
}

export async function removeMealFromCollection(
  slug: string,
  key: string
): Promise<CreatorResult> {
  const gate = await creatorSession();
  if ("error" in gate) return { ok: false, error: gate.error };

  const result = await Collection.updateOne(
    { slug, creatorClerkId: gate.session.clerkId },
    { $pull: { meals: { key } } }
  );

  if (result.matchedCount === 0) {
    return { ok: false, error: "That collection isn't yours to edit." };
  }

  revalidateCollection(slug);
  return { ok: true };
}

/** Persists the order the creator dragged the meals into. Keys not in the
 *  collection are ignored, and any it missed keep their relative order at the
 *  end, so a stale page can never drop a meal. */
export async function reorderCollectionMeals(
  slug: string,
  keys: string[]
): Promise<CreatorResult> {
  const gate = await creatorSession();
  if ("error" in gate) return { ok: false, error: gate.error };

  const collection = await Collection.findOne({
    slug,
    creatorClerkId: gate.session.clerkId,
  });
  if (!collection) {
    return { ok: false, error: "That collection isn't yours to edit." };
  }

  const meals = collection.meals as { key: string }[];
  const order = new Map(keys.map((key, index) => [key, index]));
  collection.meals = [...meals].sort(
    (a, b) =>
      (order.get(a.key) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(b.key) ?? Number.MAX_SAFE_INTEGER)
  );

  await collection.save();
  revalidateCollection(slug);
  return { ok: true };
}

export async function setCollectionStatus(
  slug: string,
  status: CollectionStatus
): Promise<CreatorResult> {
  const gate = await creatorSession();
  if ("error" in gate) return { ok: false, error: gate.error };

  if (status !== "draft" && status !== "published") {
    return { ok: false, error: "Unknown status." };
  }

  const collection = await Collection.findOne({
    slug,
    creatorClerkId: gate.session.clerkId,
  });
  if (!collection) {
    return { ok: false, error: "That collection isn't yours to edit." };
  }

  // An empty collection published is a dead end for whoever opens it.
  if (status === "published" && collection.meals.length === 0) {
    return { ok: false, error: "Add at least one meal before publishing." };
  }

  collection.status = status;
  await collection.save();

  revalidateCollection(slug);
  return { ok: true };
}

export async function deleteCollection(slug: string): Promise<CreatorResult> {
  const gate = await creatorSession();
  if ("error" in gate) return { ok: false, error: gate.error };

  // Meals already imported from it stay in their libraries; only the
  // collection itself goes.
  const result = await Collection.deleteOne({
    slug,
    creatorClerkId: gate.session.clerkId,
  });

  if (result.deletedCount === 0) {
    return { ok: false, error: "That collection isn't yours to delete." };
  }

  revalidateCollection(slug);
  return { ok: true };
}
