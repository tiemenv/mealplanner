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
import {
  parseTikTokUrl,
  resolveTikTokUrl,
  fetchTikTokPost,
  type TikTokLink,
} from "@/lib/tiktok";
import {
  parseInstagramUrl,
  fetchInstagramPost,
  type InstagramLink,
} from "@/lib/instagram";
import {
  extractRecipesFromCaption,
  isRecipeComplete,
} from "@/lib/recipe-extraction";

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

export interface VideoImport {
  title: string;
  imageUrl: string;
  ingredients: string[];
  recipe: string;
  recipeUrl: string;
  cuisine: string;
  diet: Diet | null;
  mealTypes: MealType[];
  source: "youtube" | "tiktok" | "instagram";
  /** The source named a dish but never said how to cook it, so the draft
   *  arrives with everything except the ingredients and the steps. */
  needsRecipe: boolean;
}

export interface VideoImportResult {
  ok: boolean;
  error?: string;
  /** One draft per recipe found — compilation videos yield several. */
  imports?: VideoImport[];
}

/** Imports from whichever platform the link belongs to. */
export async function importFromVideo(
  rawUrl: string
): Promise<VideoImportResult> {
  await getSession(); // require auth

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error(
      "[video-import] misconfigured: GOOGLE_GENERATIVE_AI_API_KEY is not set"
    );
    return { ok: false, error: "Video import isn't available right now." };
  }

  const tiktok = parseTikTokUrl(rawUrl);
  if (tiktok) return importTikTok(tiktok);

  const instagram = parseInstagramUrl(rawUrl);
  if (instagram) return importInstagram(instagram);

  const youtube = parseYouTubeUrl(rawUrl);
  if (youtube) return importYouTube(youtube);

  return { ok: false, error: "Enter a YouTube, TikTok or Instagram link." };
}

async function importYouTube(parsed: {
  url: string;
  id: string;
}): Promise<VideoImportResult> {
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

      // With several dishes in one video, the link should land on the dish
      // itself. A single dish starts where the video does, so it needs no cue.
      const recipeUrl =
        !single && recipe.startSeconds
          ? `${parsed.url}&t=${recipe.startSeconds}s`
          : parsed.url;

      return {
        title,
        imageUrl,
        ingredients: recipe.ingredients,
        recipe: recipe.instructions,
        recipeUrl,
        cuisine: recipe.cuisine || inferCuisine(title),
        diet: recipe.diet ?? inferDiet(title),
        mealTypes: recipe.mealTypes,
        source: "youtube" as const,
        needsRecipe: !isRecipeComplete(recipe),
      };
    })
  );

  return { ok: true, imports };
}

async function importTikTok(link: TikTokLink): Promise<VideoImportResult> {
  const resolved = await resolveTikTokUrl(link);
  if (!resolved) {
    return { ok: false, error: "Couldn't open that TikTok link." };
  }

  const post = await fetchTikTokPost(resolved.url);
  if (!post) {
    return {
      ok: false,
      error: "Couldn't read that TikTok. It may be private or removed.",
    };
  }
  if (!post.caption) {
    return { ok: false, error: "That TikTok has no caption to read." };
  }

  return importCaption({
    source: "tiktok",
    noun: "TikTok",
    id: resolved.id,
    url: resolved.url,
    caption: post.caption,
    thumbnailUrl: post.thumbnailUrl,
  });
}

async function importInstagram(
  link: InstagramLink
): Promise<VideoImportResult> {
  const post = await fetchInstagramPost(link.url);
  if (!post) {
    return {
      ok: false,
      error: "Couldn't read that Reel. It may be private or removed.",
    };
  }
  if (!post.caption) {
    return { ok: false, error: "That Reel has no caption to read." };
  }

  return importCaption({
    source: "instagram",
    noun: "Reel",
    id: link.code,
    url: link.url,
    caption: post.caption,
    thumbnailUrl: post.thumbnailUrl,
  });
}

interface CaptionSource {
  source: "tiktok" | "instagram";
  /** What to call the post when telling the reader something went wrong. */
  noun: string;
  id: string;
  url: string;
  caption: string;
  thumbnailUrl: string;
}

/** TikTok and Instagram recipes usually live in the caption, which is free to
 *  read and far quicker than watching the video. Captions that only name the
 *  dish still yield a head start: a title, a cover photo, cuisine and diet. */
async function importCaption({
  source,
  noun,
  id,
  url,
  caption,
  thumbnailUrl,
}: CaptionSource): Promise<VideoImportResult> {
  const startedAt = Date.now();
  console.log(
    `[${source}-import] start ${JSON.stringify({
      post: id,
      caption: caption.length,
    })}`
  );

  let extraction;
  try {
    extraction = await extractRecipesFromCaption(caption);
  } catch (error) {
    const failure = describeImportFailure(error);
    console.error(
      `[${source}-import] failed ${JSON.stringify({
        post: id,
        ms: Date.now() - startedAt,
        ...failure,
      })}`
    );
    return {
      ok: false,
      error:
        failure.kind === "quota"
          ? "Imports are busy right now. Try again in a minute."
          : `Couldn't read that ${noun}.`,
    };
  }

  console.log(
    `[${source}-import] done ${JSON.stringify({
      post: id,
      ms: Date.now() - startedAt,
      isRecipe: extraction.isRecipe,
      recipes: extraction.recipes.length,
      complete: extraction.recipes.filter(isRecipeComplete).length,
    })}`
  );

  if (!extraction.isRecipe) {
    return { ok: false, error: `That ${noun} doesn't seem to be a recipe.` };
  }

  const single = extraction.recipes.length === 1;
  // Copied at most once, and only if a dish actually ends up using it.
  let cover: Promise<string> | null = null;
  const coverImage = () => (cover ??= persistCoverImage(thumbnailUrl, source));

  const imports = await Promise.all(
    extraction.recipes.map(async (recipe) => {
      const title = recipe.title;
      // One dish per video means the cover is a photo of that dish. With
      // several it can only match one of them, so search per dish first.
      const imageUrl = single
        ? (await coverImage()) || (title ? await fetchUnsplashImage(title) : "")
        : (title ? await fetchUnsplashImage(title) : "") || (await coverImage());

      return {
        title,
        imageUrl,
        ingredients: recipe.ingredients,
        recipe: recipe.instructions,
        // Neither platform has an equivalent of YouTube's &t=, so every dish
        // in a compilation links to the same place.
        recipeUrl: url,
        cuisine: recipe.cuisine || inferCuisine(title),
        diet: recipe.diet ?? inferDiet(title),
        mealTypes: recipe.mealTypes,
        source,
        needsRecipe: !isRecipeComplete(recipe),
      };
    })
  );

  return { ok: true, imports };
}

/** TikTok and Instagram cover URLs are signed and stop working within days, so
 *  the bytes are copied into Blob storage. Without a store configured the
 *  original URL is still better than no picture, it just won't last. */
async function persistCoverImage(
  url: string,
  source: string
): Promise<string> {
  if (!url) return "";
  if (!process.env.BLOB_READ_WRITE_TOKEN) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const blob = await put(`meals/${source}-${Date.now()}.jpg`, await res.blob(), {
      access: "public",
      addRandomSuffix: true,
      contentType: res.headers.get("content-type") ?? "image/jpeg",
    });
    return blob.url;
  } catch {
    return "";
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
