"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { dbConnect } from "@/lib/mongoose";
import { Meal } from "@/models/Meal";
import { getSession } from "@/lib/workspace";
import { DIETS, MEAL_TYPES, type Diet, type MealType } from "@/lib/constants";
import { getMealSuggestion, type MealSuggestion } from "@/lib/suggest";

export interface MealInput {
  name: string;
  diet: Diet;
  mealTypes: MealType[];
  cuisine: string;
  imageUrl: string;
  ingredients: string[];
  recipe: string;
  recipeUrl: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface SuggestResult {
  ok: boolean;
  error?: string;
  suggestion?: MealSuggestion;
}

export async function suggestMealDetails(name: string): Promise<SuggestResult> {
  await getSession(); // require auth
  const title = name?.trim();
  if (!title || title.length < 2) {
    return { ok: false, error: "Enter a meal name first." };
  }
  try {
    const suggestion = await getMealSuggestion(title);
    return { ok: true, suggestion };
  } catch {
    return { ok: false, error: "Couldn't fetch suggestions right now." };
  }
}

function validate(input: MealInput): string | null {
  if (!input.name?.trim()) return "Meal name is required.";
  if (!DIETS.includes(input.diet)) return "Pick a diet type.";
  const types = (input.mealTypes ?? []).filter((t) => MEAL_TYPES.includes(t));
  if (types.length === 0) return "Select at least one meal type.";
  if (input.recipeUrl?.trim() && !normalizeUrl(input.recipeUrl)) {
    return "Enter a valid recipe link.";
  }
  return null;
}

/** Returns a normalized http(s) URL, or "" for empty, or null if invalid. */
function normalizeUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw) return "";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function createMeal(input: MealInput): Promise<ActionResult> {
  const error = validate(input);
  if (error) return { ok: false, error };

  const session = await getSession();
  await dbConnect();

  await Meal.create({
    ownerKey: session.workspace.ownerKey,
    name: input.name.trim(),
    diet: input.diet,
    mealTypes: input.mealTypes,
    cuisine: input.cuisine?.trim() ?? "",
    imageUrl: input.imageUrl?.trim() ?? "",
    ingredients: (input.ingredients ?? []).map((i) => i.trim()).filter(Boolean),
    recipe: input.recipe?.trim() ?? "",
    recipeUrl: normalizeUrl(input.recipeUrl ?? "") || "",
    createdByClerkId: session.clerkId,
  });

  revalidatePath("/library");
  revalidatePath("/planner");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateMeal(
  id: string,
  input: MealInput
): Promise<ActionResult> {
  const error = validate(input);
  if (error) return { ok: false, error };

  const session = await getSession();
  await dbConnect();

  const result = await Meal.updateOne(
    { _id: id, ownerKey: session.workspace.ownerKey },
    {
      $set: {
        name: input.name.trim(),
        diet: input.diet,
        mealTypes: input.mealTypes,
        cuisine: input.cuisine?.trim() ?? "",
        imageUrl: input.imageUrl?.trim() ?? "",
        ingredients: (input.ingredients ?? [])
          .map((i) => i.trim())
          .filter(Boolean),
        recipe: input.recipe?.trim() ?? "",
        recipeUrl: normalizeUrl(input.recipeUrl ?? "") || "",
      },
    }
  );

  if (result.matchedCount === 0) {
    return { ok: false, error: "Meal not found in this workspace." };
  }

  revalidatePath("/library");
  revalidatePath("/planner");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteMeal(id: string): Promise<ActionResult> {
  const session = await getSession();
  await dbConnect();

  await Meal.deleteOne({ _id: id, ownerKey: session.workspace.ownerKey });

  revalidatePath("/library");
  revalidatePath("/planner");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Uploads an image to Vercel Blob and returns its public URL.
 * Falls back gracefully if Blob isn't configured.
 */
export async function uploadMealImage(
  formData: FormData
): Promise<{ ok: boolean; url?: string; error?: string }> {
  await getSession(); // auth gate

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      ok: false,
      error:
        "Image upload isn't configured. Paste an image URL instead, or add a Vercel Blob store.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "File must be an image." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Image must be under 5 MB." };
  }

  try {
    const blob = await put(`meals/${Date.now()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return { ok: true, url: blob.url };
  } catch {
    return { ok: false, error: "Upload failed. Try a URL instead." };
  }
}
