import "server-only";
import { dbConnect } from "@/lib/mongoose";
import { Collection } from "@/models/Collection";
import { Meal } from "@/models/Meal";
import {
  MEAL_TYPES,
  type Diet,
  type MealType,
} from "@/lib/constants";
import type { CollectionStatus } from "@/models/Collection";

export type { CollectionStatus };

/** A meal as it exists inside a collection: a snapshot taken when the creator
 *  added it, not a live view of their library. */
export interface CollectionMeal {
  /** Stable within the collection; survives renames, used for de-duping. */
  key: string;
  name: string;
  diet: Diet;
  mealTypes: MealType[];
  cuisine: string;
  imageUrl: string;
  ingredients: string[];
  recipe: string;
  recipeUrl: string;
  /** The library meal it was copied from, if it still exists. */
  sourceMealId: string | null;
}

export interface MealCollection {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** Set when the collection is built around one cuisine. */
  cuisine: string;
  coverImageUrl: string;
  status: CollectionStatus;
  creator: { clerkId: string; name: string; imageUrl: string };
  meals: CollectionMeal[];
}

/** Shape of a lean Collection document, before it is made serializable. */
interface RawCollection {
  _id: { toString(): string };
  slug: string;
  title: string;
  description?: string;
  cuisine?: string;
  coverImageUrl?: string;
  status?: CollectionStatus;
  creatorClerkId: string;
  creatorName?: string;
  creatorImageUrl?: string;
  meals?: {
    key: string;
    name: string;
    diet: Diet;
    mealTypes: MealType[];
    cuisine?: string;
    imageUrl?: string;
    ingredients?: string[];
    recipe?: string;
    recipeUrl?: string;
    sourceMealId?: { toString(): string } | null;
  }[];
}

/** Server components hand these to client components, so every ObjectId has to
 *  become a string on the way out. */
function toPlain(doc: RawCollection): MealCollection {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    title: doc.title,
    description: doc.description ?? "",
    cuisine: doc.cuisine ?? "",
    coverImageUrl: doc.coverImageUrl ?? "",
    status: doc.status ?? "draft",
    creator: {
      clerkId: doc.creatorClerkId,
      name: doc.creatorName ?? "",
      imageUrl: doc.creatorImageUrl ?? "",
    },
    meals: (doc.meals ?? []).map((meal) => ({
      key: meal.key,
      name: meal.name,
      diet: meal.diet,
      mealTypes: meal.mealTypes,
      cuisine: meal.cuisine ?? "",
      imageUrl: meal.imageUrl ?? "",
      ingredients: meal.ingredients ?? [],
      recipe: meal.recipe ?? "",
      recipeUrl: meal.recipeUrl ?? "",
      sourceMealId: meal.sourceMealId?.toString() ?? null,
    })),
  };
}

/** What the browse page shows: everything published, plus the viewer's own
 *  drafts so a creator can find work in progress where they left it. */
export async function listCollections(
  clerkId?: string
): Promise<MealCollection[]> {
  await dbConnect();

  const docs = (await Collection.find(
    clerkId
      ? { $or: [{ status: "published" }, { creatorClerkId: clerkId }] }
      : { status: "published" }
  )
    .sort({ status: 1, updatedAt: -1 })
    .lean()) as unknown as RawCollection[];

  return docs.map(toPlain);
}

/** Every collection one creator owns, drafts included. */
export async function listCollectionsByCreator(
  clerkId: string
): Promise<MealCollection[]> {
  await dbConnect();

  const docs = (await Collection.find({ creatorClerkId: clerkId })
    .sort({ updatedAt: -1 })
    .lean()) as unknown as RawCollection[];

  return docs.map(toPlain);
}

/** A collection by slug, whatever its status. Callers are responsible for
 *  hiding drafts; prefer getVisibleCollection unless you already know the
 *  viewer owns it. */
export async function getCollection(
  slug: string
): Promise<MealCollection | null> {
  await dbConnect();

  const doc = (await Collection.findOne({
    slug,
  }).lean()) as unknown as RawCollection | null;

  return doc ? toPlain(doc) : null;
}

/** A collection the viewer is allowed to see: published, or their own draft. */
export async function getVisibleCollection(
  slug: string,
  clerkId: string
): Promise<MealCollection | null> {
  const collection = await getCollection(slug);
  if (!collection) return null;
  if (
    collection.status === "draft" &&
    collection.creator.clerkId !== clerkId
  ) {
    return null;
  }
  return collection;
}

/** Collections rarely get a hand-picked cover, so the first meal's photo
 *  stands in and the cards never look broken. */
export function coverFor(collection: MealCollection): string {
  return (
    collection.coverImageUrl ||
    collection.meals.find((meal) => meal.imageUrl)?.imageUrl ||
    ""
  );
}

export interface CollectionSummary {
  total: number;
  /** How many meals suit each meal type. A meal can count towards several. */
  byMealType: Record<MealType, number>;
  veg: number;
  nonveg: number;
}

/** The planner pools meals per meal type, so a collection of nothing but
 *  dinners leaves two thirds of the week empty. Surfacing the spread lets
 *  someone choose a collection that actually fills their plan. */
export function summarize(collection: MealCollection): CollectionSummary {
  const byMealType = Object.fromEntries(
    MEAL_TYPES.map((type) => [
      type,
      collection.meals.filter((meal) => meal.mealTypes.includes(type)).length,
    ])
  ) as Record<MealType, number>;

  return {
    total: collection.meals.length,
    byMealType,
    veg: collection.meals.filter((meal) => meal.diet === "veg").length,
    nonveg: collection.meals.filter((meal) => meal.diet === "nonveg").length,
  };
}

/** Meals are matched on name as well as key, so a dish someone already added
 *  by hand or imported from a video is never duplicated by a collection. */
export function normalizeMealName(name: string): string {
  return name.trim().toLowerCase();
}

export interface OwnedMeals {
  /** "<collectionId>/<mealKey>" for everything imported from a collection. */
  keys: Set<string>;
  names: Set<string>;
}

/** What a workspace already holds, in the two shapes an import needs to check
 *  against. */
export async function ownedMeals(ownerKey: string): Promise<OwnedMeals> {
  await dbConnect();

  const docs = (await Meal.find({ ownerKey })
    .select("name sourceCollection sourceMealKey")
    .lean()) as {
    name: string;
    sourceCollection?: string;
    sourceMealKey?: string;
  }[];

  return {
    keys: new Set(
      docs
        .filter((doc) => doc.sourceCollection && doc.sourceMealKey)
        .map((doc) => `${doc.sourceCollection}/${doc.sourceMealKey}`)
    ),
    names: new Set(docs.map((doc) => normalizeMealName(doc.name))),
  };
}

/** True when importing this meal would duplicate something. Re-importing a
 *  collection is meant to be idempotent, and a dish added by hand or from a
 *  video counts just as much as one that came from a collection. */
export function alreadyOwned(
  collectionId: string,
  meal: Pick<CollectionMeal, "key" | "name">,
  owned: OwnedMeals
): boolean {
  return (
    owned.keys.has(`${collectionId}/${meal.key}`) ||
    owned.names.has(normalizeMealName(meal.name))
  );
}

/** Sibling routes under /collections that a slug must never shadow. */
const RESERVED_SLUGS = new Set(["new", "mine", "edit"]);

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** Slugs are minted once, at creation, and never regenerated: a published
 *  collection's link has to survive its title being reworded. */
export async function uniqueSlug(title: string): Promise<string> {
  await dbConnect();

  const base = slugify(title) || "collection";
  const stem = RESERVED_SLUGS.has(base) ? `${base}-collection` : base;

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? stem : `${stem}-${attempt + 1}`;
    if (!(await Collection.exists({ slug: candidate }))) return candidate;
  }

  return `${stem}-${Date.now().toString(36)}`;
}
