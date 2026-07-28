"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { dbConnect } from "@/lib/mongoose";
import { Meal } from "@/models/Meal";
import { getSession, rejectImpersonators } from "@/lib/workspace";
import { DIETS, MEAL_TYPES, type Diet, type MealType } from "@/lib/constants";
import {
  getMealSuggestion,
  fetchUnsplashImage,
  fetchUnsplashImages,
  inferDiet,
  inferCuisine,
  type MealSuggestion,
} from "@/lib/suggest";
import {
  parseYouTubeUrl,
  fetchYouTubeTitle,
  fetchYouTubeThumbnail,
  extractRecipesFromYouTube,
  describeImportFailure,
} from "@/lib/youtube";

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

export interface SuggestImagesResult {
  ok: boolean;
  error?: string;
  images?: string[];
}

export async function suggestMealImages(
  name: string
): Promise<SuggestImagesResult> {
  await getSession(); // require auth
  const title = name?.trim();
  if (!title || title.length < 2) {
    return { ok: false, error: "Enter a meal name first." };
  }
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    console.error(
      "[image-suggestions] misconfigured: UNSPLASH_ACCESS_KEY is not set"
    );
    return { ok: false, error: "Image suggestions aren't available right now." };
  }
  try {
    const images = await fetchUnsplashImages(title, 8);
    if (images.length === 0) {
      return { ok: false, error: "No image suggestions found for that name." };
    }
    return { ok: true, images };
  } catch {
    return { ok: false, error: "Couldn't fetch image suggestions right now." };
  }
}

export interface YouTubeImport {
  title: string;
  imageUrl: string;
  ingredients: string[];
  recipe: string;
  recipeUrl: string;
  cuisine: string;
  diet: Diet | null;
  mealTypes: MealType[];
}

export interface YouTubeImportResult {
  ok: boolean;
  error?: string;
  /** One draft per recipe found — compilation videos yield several. */
  imports?: YouTubeImport[];
}

export async function importFromYouTube(
  rawUrl: string
): Promise<YouTubeImportResult> {
  await getSession(); // require auth

  const parsed = parseYouTubeUrl(rawUrl);
  if (!parsed) return { ok: false, error: "Enter a valid YouTube link." };

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error(
      "[youtube-import] misconfigured: GOOGLE_GENERATIVE_AI_API_KEY is not set"
    );
    return { ok: false, error: "YouTube import isn't available right now." };
  }

  // Logged either side of the call so a run that never reports back can be
  // told apart from one that failed: the former means the function timed out.
  const startedAt = Date.now();
  console.log(`[youtube-import] start ${JSON.stringify({ video: parsed.id })}`);

  let extraction;
  try {
    extraction = await extractRecipesFromYouTube(parsed.url);
  } catch (error) {
    const failure = describeImportFailure(error);
    console.error(
      `[youtube-import] failed ${JSON.stringify({
        video: parsed.id,
        ms: Date.now() - startedAt,
        ...failure,
      })}`
    );
    // Why it broke stays in the log above. The reader only learns whether
    // retrying is worth it — never which provider we use or that it rate
    // limited us.
    return {
      ok: false,
      error:
        failure.kind === "quota"
          ? "Imports are busy right now. Try again in a minute."
          : "Couldn't read that video. It may be private, too long, or unavailable.",
    };
  }

  console.log(
    `[youtube-import] done ${JSON.stringify({
      video: parsed.id,
      ms: Date.now() - startedAt,
      isRecipe: extraction.isRecipe,
      recipes: extraction.recipes.length,
    })}`
  );

  if (!extraction.isRecipe) {
    return {
      ok: false,
      error: "That video doesn't seem to be a recipe.",
    };
  }

  const single = extraction.recipes.length === 1;
  const thumbnail = await fetchYouTubeThumbnail(parsed.id);

  const imports = await Promise.all(
    extraction.recipes.map(async (recipe) => {
      // The oEmbed title describes the whole video, so it only stands in for a
      // dish name when the video taught exactly one dish.
      const title =
        recipe.title || (single ? await fetchYouTubeTitle(parsed.url) : "");
      // One dish per video means the thumbnail is a photo of that dish. With
      // several it can only match one of them, so search per dish first.
      const imageUrl = single
        ? thumbnail || (title ? await fetchUnsplashImage(title) : "")
        : (title ? await fetchUnsplashImage(title) : "") || thumbnail;

      return {
        title,
        imageUrl,
        ingredients: recipe.ingredients,
        recipe: recipe.instructions,
        recipeUrl: parsed.url,
        cuisine: recipe.cuisine || inferCuisine(title),
        diet: recipe.diet ?? inferDiet(title),
        mealTypes: recipe.mealTypes,
      };
    })
  );

  return { ok: true, imports };
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
  return { ok: true };
}

export async function deleteMeal(id: string): Promise<ActionResult> {
  const impersonationError = await rejectImpersonators();
  if (impersonationError) return { ok: false, error: impersonationError };

  const session = await getSession();
  await dbConnect();

  await Meal.deleteOne({ _id: id, ownerKey: session.workspace.ownerKey });

  revalidatePath("/library");
  revalidatePath("/planner");
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
